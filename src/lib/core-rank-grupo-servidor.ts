import { db } from "./db";
import type { DadosCoreDiretos, MembroCoreDiretos } from "./core-rank-diretos";
import { associarIdentidadeCoreGrupo, associarMembroCoreEmail } from "./core-rank-grupo";
import { identificarContaCoreBruto, recuperarArvoreCoreGrupo } from "./core-rank-grupo-atualizar";

/** A associação e a recuperação dos dados são inteiramente feitas na BD do servidor. */
export async function guardarAssociacaoCoreGrupo(indice: number, nome: string, email: string): Promise<{ atualizar: boolean }> {
  const client = await db().connect();
  try {
    await client.query("begin");
    // Duas sessões/computadores não podem substituir as associações uma da outra.
    const { rows } = await client.query<{ valor: DadosCoreDiretos }>("select valor from dashboard_config where chave = 'core_rank_grupo' for update");
    const dados = rows[0]?.valor;
    if (!dados?.grupo) throw new Error("Ainda não existe a lista do grupo.");
    const arvore = await client.query<{ valor: MembroCoreDiretos[] }>("select valor from dashboard_config where chave = 'core_rank_grupo_arvore'");
    let membros = arvore.rows[0]?.valor;
    let recuperada = false;
    let resultado: DadosCoreDiretos;
    if (!membros?.some(m => m.email.trim().toLowerCase() === email.trim().toLowerCase())) {
      const fontes = await client.query<{ chave: string; corpo: unknown }>("select chave, corpo from dashboard_bruto where chave like 'equipa%' or chave = 'plano'");
      const bruto = Object.fromEntries(fontes.rows.map(r => [r.chave, { corpo: r.corpo }]));
      const completa = recuperarArvoreCoreGrupo(bruto, dados);
      if (completa?.some(m => m.email.trim().toLowerCase() === email.trim().toLowerCase())) {
        membros = completa;
        recuperada = true;
      } else {
        resultado = associarIdentidadeCoreGrupo(dados, indice, nome, identificarContaCoreBruto(bruto, email));
        await client.query("update dashboard_config set valor = $1::jsonb, atualizado_em = now() where chave = 'core_rank_grupo'", [JSON.stringify(resultado)]);
        await client.query("commit");
        return { atualizar: !resultado.consultores.some(c => c.username.toLowerCase() === resultado.grupo!.membros[indice]!.username!.toLowerCase()) };
      }
    }
    resultado = associarMembroCoreEmail(dados, membros!, indice, nome, email);
    await client.query("update dashboard_config set valor = $1::jsonb, atualizado_em = now() where chave = 'core_rank_grupo'", [JSON.stringify(resultado)]);
    if (recuperada) await client.query(`insert into dashboard_config (chave, valor, atualizado_em) values ('core_rank_grupo_arvore', $1::jsonb, now())
      on conflict (chave) do update set valor = excluded.valor, atualizado_em = excluded.atualizado_em`, [JSON.stringify(membros)]);
    await client.query("commit");
    return { atualizar: false };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally { client.release(); }
}

/** Uma atualização iniciada antes de uma associação não pode apagar a associação. */
export async function guardarAtualizacaoCoreGrupo(anterior: DadosCoreDiretos, dados: DadosCoreDiretos, membros: MembroCoreDiretos[]): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const resultado = await client.query("update dashboard_config set valor = $1::jsonb, atualizado_em = now() where chave = 'core_rank_grupo' and valor = $2::jsonb returning chave", [JSON.stringify(dados), JSON.stringify(anterior)]);
    if (!resultado.rowCount) { await client.query("rollback"); return false; }
    for (const [chave, valor] of [["anterior_core_rank_grupo", anterior], ["core_rank_grupo_arvore", membros]] as const) {
      await client.query(`insert into dashboard_config (chave, valor, atualizado_em) values ($1, $2::jsonb, now())
        on conflict (chave) do update set valor = excluded.valor, atualizado_em = excluded.atualizado_em`, [chave, JSON.stringify(valor)]);
    }
    await client.query("commit");
    return true;
  } catch (e) { await client.query("rollback"); throw e; }
  finally { client.release(); }
}
