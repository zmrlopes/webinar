import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { buscarMembroEquipa } from "./equipa";
import { formacoesGravadasVisiveis } from "./formacoes-gravadas";

export type AcessoFormacoes = "ok" | "indisponivel" | "desconhecido";

/**
 * Quem pode abrir as formações gravadas: enquanto estiverem só no painel de
 * demonstração, apenas esse email; depois de publicadas, qualquer email da
 * equipa (equipa_afiliados) — o mesmo critério do backoffice do consultor.
 */
export async function verificarAcessoFormacoes(email: string): Promise<AcessoFormacoes> {
  if (!formacoesGravadasVisiveis(email)) return "indisponivel";
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return "ok";
  return (await buscarMembroEquipa(email)) ? "ok" : "desconhecido";
}

/** Ids das aulas que este consultor já marcou como vistas. */
export async function listarAulasVistas(email: string): Promise<string[]> {
  const { rows } = await db().query<{ aula_id: string }>(
    `select aula_id from formacoes_vistas where email = $1`,
    [email],
  );
  return rows.map((r) => r.aula_id);
}

/** Marca ou desmarca uma aula como vista. Idempotente: repetir não dá erro. */
export async function marcarAulaVista(email: string, aulaId: string, vista: boolean): Promise<void> {
  if (vista) {
    await db().query(
      `insert into formacoes_vistas (email, aula_id) values ($1, $2)
       on conflict (email, aula_id) do nothing`,
      [email, aulaId],
    );
  } else {
    await db().query(`delete from formacoes_vistas where email = $1 and aula_id = $2`, [email, aulaId]);
  }
}
