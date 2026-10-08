import { db } from "./db";
import { diaEmPortugal, mudarMes, type AcontecimentoCalendario } from "./calendario-consultor";
import { extrairFormacoesForum } from "./formacoes-forum-icligo";

export const CHAVE_LIGACAO_FORUM = "forum-icligo:ligacao:v1";
const PREFIXO_CALENDARIO = "forum-icligo:calendario:";
const ESPACO = 1399882;
const UMA_HORA = 60 * 60 * 1000;
type Ligacao = { cookie: string };
export type CalendarioForum = {
  mes: string; formacoes: AcontecimentoCalendario[]; atualizadoEm: string | null;
  tentativaEm?: string; aviso?: string;
};

async function ler<T>(chave: string): Promise<T | null> {
  const { rows } = await db().query<{ valor: T }>("select valor from dashboard_config where chave = $1", [chave]);
  return rows[0]?.valor ?? null;
}
async function gravar(chave: string, valor: unknown): Promise<void> {
  await db().query(`insert into dashboard_config (chave, valor, atualizado_em) values ($1, $2, now())
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [chave, JSON.stringify(valor)]);
}

export async function ligarForumIcligo(cookie: string): Promise<void> {
  if (!cookie.includes("_circle_session=") || !cookie.includes("user_session_identifier=") || /[\r\n]/.test(cookie)) {
    throw new Error("A sessão do fórum está incompleta.");
  }
  // Credencial privada na base de dados; nunca segue na resposta do calendário.
  await gravar(CHAVE_LIGACAO_FORUM, { cookie });
}

const emCurso = new Map<string, Promise<CalendarioForum>>();
export function obterCalendarioForum(mes: string, forcar = false): Promise<CalendarioForum> {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes)) return Promise.reject(new Error("Mês inválido."));
  const existente = emCurso.get(mes);
  if (existente) return existente;
  const pedido = atualizar(mes, forcar).finally(() => emCurso.delete(mes));
  emCurso.set(mes, pedido);
  return pedido;
}

async function atualizar(mes: string, forcar: boolean): Promise<CalendarioForum> {
  const chave = PREFIXO_CALENDARIO + mes;
  const anterior = await ler<CalendarioForum>(chave) ?? { mes, formacoes: [], atualizadoEm: null };
  const agora = Date.now();
  if (!forcar && ((anterior.atualizadoEm && agora - Date.parse(anterior.atualizadoEm) < UMA_HORA)
    || (anterior.tentativaEm && agora - Date.parse(anterior.tentativaEm) < 5 * 60 * 1000))) return anterior;
  const ligacao = await ler<Ligacao>(CHAVE_LIGACAO_FORUM);
  if (!ligacao?.cookie) return anterior;
  const tentativaEm = new Date().toISOString();
  try {
    const registos: unknown[] = [];
    const inicio = new Date(`${mes}-01T12:00:00Z`); inicio.setUTCDate(inicio.getUTCDate() - 2);
    const fim = new Date(`${mudarMes(mes, 1)}-01T12:00:00Z`); fim.setUTCDate(fim.getUTCDate() + 2);
    let completa = false;
    for (let pagina = 1; pagina <= 20; pagina++) {
      const url = new URL(`https://forum.icligo.com/internal_api/spaces/${ESPACO}/posts`);
      url.search = new URLSearchParams({ sort: "asc", per_page: "150", used_on: "calendar", page: String(pagina),
        "filter_date[start_date]": inicio.toISOString().slice(0, 10), "filter_date[end_date]": fim.toISOString().slice(0, 10) }).toString();
      const r = await fetch(url, { headers: { Cookie: ligacao.cookie, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if ([301, 302, 303, 307, 308, 401, 403].includes(r.status)) throw new Error("A ligação ao fórum iCliGo precisa de ser renovada.");
      if (!r.ok || !r.headers.get("content-type")?.includes("application/json")) throw new Error("O fórum iCliGo está temporariamente indisponível.");
      const corpo = await r.json() as { records?: unknown; has_next_page?: unknown };
      if (!Array.isArray(corpo.records) || typeof corpo.has_next_page !== "boolean") throw new Error("Não foi possível confirmar os dados do fórum iCliGo.");
      registos.push(...corpo.records);
      if (!corpo.has_next_page) { completa = true; break; }
    }
    if (!completa) throw new Error("A lista de formações do fórum ficou incompleta.");
    const resultado: CalendarioForum = { mes, formacoes: extrairFormacoesForum(registos, mes), atualizadoEm: new Date().toISOString(), tentativaEm };
    await gravar(chave, resultado);
    return resultado;
  } catch (erro) {
    const aviso = erro instanceof Error && /^(A ligação|O fórum|Não foi possível|A lista)/.test(erro.message)
      ? erro.message : "Não foi possível atualizar as formações iCliGo. A última importação foi mantida.";
    const resultado = { ...anterior, tentativaEm, aviso };
    await gravar(chave, resultado);
    return resultado;
  }
}

export async function sincronizarForumIcligo(forcar = false): Promise<{ mes: string; quantidade: number; atualizadoEm: string | null; aviso?: string }[]> {
  const mesAtual = diaEmPortugal().slice(0, 7);
  const resultados = [];
  for (let diferenca = -1; diferenca <= 6; diferenca++) {
    const calendario = await obterCalendarioForum(mudarMes(mesAtual, diferenca), forcar);
    resultados.push({ mes: calendario.mes, quantidade: calendario.formacoes.length, atualizadoEm: calendario.atualizadoEm, aviso: calendario.aviso });
    if (calendario.aviso?.startsWith("A ligação")) break;
  }
  return resultados;
}
