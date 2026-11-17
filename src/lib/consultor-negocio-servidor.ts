import {randomUUID} from "node:crypto";
import {db} from "./db";
import {hojeLisboa} from "./dashboard-sincronizar";
import {periodosNegocio, validarTotaisNegocio, VERSAO_DADOS_NEGOCIO, type DadosNegocio, type PlanoNegocio, type TotaisNegocio} from "./consultor-negocio";

const chaveDados = (email: string) => `consultor:negocio:${email}:v1`;
const chaveRecolha = (email: string) => `consultor:negocio:${email}:recolha:v1`;
interface Recolha extends PlanoNegocio { versao: typeof VERSAO_DADOS_NEGOCIO; criadoEm: string; origemEmail: string; totais: Record<string, TotaisNegocio> }
export class ErroNegocio extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}
export async function lerNegocio(email: string): Promise<DadosNegocio | null> {
  const {rows} = await db().query<{valor: DadosNegocio}>("select valor from dashboard_config where chave = $1", [chaveDados(email)]);
  return rows[0]?.valor ?? null;
}
export async function iniciarNegocio(email: string, origem: unknown): Promise<PlanoNegocio> {
  const origemEmail = typeof origem === "string" ? origem.trim().toLowerCase() : "";
  if (origemEmail !== email) throw new ErroNegocio("Entra no MyOffice com o mesmo email da conta de teste e volta a carregar no favorito.", 403);
  const hoje = hojeLisboa();
  const {rows} = await db().query<{data_registo: string | null}>("select to_char(data_registo, 'YYYY-MM-DD') as data_registo from equipa_afiliados where email = $1", [email]);
  const dataRegisto = rows[0]?.data_registo ?? null;
  const recolha: Recolha = {versao: VERSAO_DADOS_NEGOCIO, id: randomUUID(), hoje, dataRegisto, periodos: periodosNegocio(hoje, dataRegisto), criadoEm: new Date().toISOString(), origemEmail, totais: {}};
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [chaveRecolha(email), JSON.stringify(recolha)]);
  return {id: recolha.id, hoje, periodos: recolha.periodos, dataRegisto};
}
/** Bloqueia só a recolha desta conta. Uma falha nunca substitui o último dashboard completo. */
export async function atualizarNegocio(email: string, id: unknown, periodo: unknown, totais: unknown, concluir: boolean): Promise<DadosNegocio | null> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const {rows} = await client.query<{valor: Recolha}>("select valor from dashboard_config where chave = $1 for update", [chaveRecolha(email)]);
    const r = rows[0]?.valor;
    if (!r || r.versao !== VERSAO_DADOS_NEGOCIO || r.id !== id || Date.now() - Date.parse(r.criadoEm) > 24 * 60 * 60 * 1000) throw new ErroNegocio("Esta atualização terminou ou foi substituída. Volta a clicar no favorito no MyOffice.", 409);
    if (!concluir) {
      if (typeof periodo !== "string" || !r.periodos.some(p => p.chave === periodo)) throw new ErroNegocio("Período inválido.");
      r.totais[periodo] = validarTotaisNegocio(totais);
      await client.query("update dashboard_config set valor = $2::jsonb, atualizado_em = now() where chave = $1", [chaveRecolha(email), JSON.stringify(r)]);
      await client.query("commit");
      return null;
    }
    if (r.periodos.some(p => !r.totais[p.chave])) throw new ErroNegocio("Faltam períodos do MyOffice. Os dados anteriores mantêm-se. Repete a atualização.", 409);
    const {homologo, ...meses} = r.totais;
    const dados: DadosNegocio = {ate: r.hoje, atualizadoEm: new Date().toISOString(), origemEmail: r.origemEmail, versao: VERSAO_DADOS_NEGOCIO,
      inicioHistorico: r.periodos[0]!.inicio, meses, homologo: homologo ?? {faturacao: 0, pontos: 0, consultores: 0, comissoes: 0}};
    await client.query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
      on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [chaveDados(email), JSON.stringify(dados)]);
    await client.query("delete from dashboard_config where chave = $1", [chaveRecolha(email)]);
    await client.query("commit");
    return dados;
  } catch (erro) {
    await client.query("rollback"); throw erro;
  } finally {client.release();}
}
