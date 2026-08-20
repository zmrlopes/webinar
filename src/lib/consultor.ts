import { contarCliques } from "./cliques";
import { db } from "./db";

/** Nomes de rotas já existentes — uma referência nunca pode ficar igual a uma delas. */
const CODIGOS_RESERVADOS = new Set(["admin", "consultor", "webinar", "api"]);

/**
 * Liga o código curto (a "referencia") ao email do consultor, para o link
 * de inscrição poder ser só "/<referencia>" (ver app/[codigo]/page.tsx).
 * Upsert: pedir o link outra vez com o mesmo nome atualiza a mesma linha.
 */
export async function guardarLinkConsultor(
  referencia: string,
  referenciaEmail: string,
): Promise<void> {
  await db().query(
    `insert into links_consultor (referencia, referencia_email)
     values ($1, $2)
     on conflict (referencia) do update
       set referencia_email = excluded.referencia_email, atualizado_em = now()`,
    [referencia, referenciaEmail],
  );
}

export async function procurarLinkConsultor(
  referencia: string,
): Promise<{ referenciaEmail: string } | null> {
  if (CODIGOS_RESERVADOS.has(referencia)) return null;
  const { rows } = await db().query<{ referencia_email: string }>(
    `select referencia_email from links_consultor where referencia = $1`,
    [referencia],
  );
  const linha = rows[0];
  return linha ? { referenciaEmail: linha.referencia_email } : null;
}

/** Evita que um nome que gere um código igual a uma rota existente parta o link curto. */
export function referenciaSemColisao(referencia: string): string {
  return CODIGOS_RESERVADOS.has(referencia) ? `${referencia}-consultor` : referencia;
}

export interface EstatisticasConsultor {
  aberturas: number;
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
}

/**
 * Números de um consultor para uma sessão: quantas vezes o link foi aberto,
 * quantos se inscreveram (`referencia_email`), quantos estiveram presentes
 * e quantos não — os dois últimos só ficam corretos depois de a sessão
 * acontecer e o processo de presenças (secção 7-D) correr; antes disso,
 * tudo conta como "não entraram" porque ainda não há registo de presença.
 */
export async function estatisticasConsultor(
  webinarId: string,
  referenciaEmail: string,
): Promise<EstatisticasConsultor> {
  const [{ rows }, aberturas] = await Promise.all([
    db().query<{
      total_inscricoes: string;
      presencas: string;
    }>(
      `select
         count(*) filter (where cancelada_em is null) as total_inscricoes,
         count(*) filter (where cancelada_em is null and presenca = 'attended') as presencas
       from registrations
       where webinar_id = $1 and referencia_email = $2`,
      [webinarId, referenciaEmail],
    ),
    contarCliques(webinarId, referenciaEmail),
  ]);

  const linha = rows[0];
  const totalInscricoes = Number(linha?.total_inscricoes ?? 0);
  const presencas = Number(linha?.presencas ?? 0);
  return { aberturas, totalInscricoes, presencas, naoEntraram: totalInscricoes - presencas };
}

export interface LeadConsultor {
  nome: string;
  telemovel: string | null;
  email: string;
  abriuLink: "sim" | "nao" | "por-confirmar";
  percentagemAssistencia: number | null;
  linkZoom: string | null;
}

/**
 * Um lead por linha, para o consultor ver quem se inscreveu pelo link dele e
 * quem chegou a abrir o link do Zoom. `percentagemAssistencia` só existe
 * para quem esteve presente e com minutos registados — antes da sessão
 * acontecer, ou para quem não entrou, fica a null.
 *
 * Exceção deliberada e pedida à regra "nunca expor link_pessoal" (que
 * continua válida em todo o resto do sistema, incluindo /admin): o
 * consultor pode copiar o link do lead que ele próprio trouxe, para lhe
 * reenviar diretamente (ex: WhatsApp) se a pessoa não tiver visto o email.
 * Só sai daqui para esse consultor, nunca aparece em nenhum painel de
 * administração nem em exportações.
 */
export async function listarLeadsConsultor(
  webinarId: string,
  referenciaEmail: string,
  duracaoMinutos: number,
): Promise<LeadConsultor[]> {
  const { rows } = await db().query<{
    nome: string;
    telemovel: string | null;
    email: string;
    presenca: "unknown" | "attended" | "absent";
    presenca_minutos: number | null;
    link_pessoal: string | null;
  }>(
    `select nome, telemovel, email, presenca, presenca_minutos, link_pessoal
     from registrations
     where webinar_id = $1 and referencia_email = $2 and cancelada_em is null
     order by criado_em asc`,
    [webinarId, referenciaEmail],
  );

  return rows.map((r) => ({
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    abriuLink: r.presenca === "attended" ? "sim" : r.presenca === "absent" ? "nao" : "por-confirmar",
    percentagemAssistencia:
      r.presenca === "attended" && r.presenca_minutos !== null && duracaoMinutos > 0
        ? Math.min(100, Math.round((r.presenca_minutos / duracaoMinutos) * 100))
        : null,
    linkZoom: r.link_pessoal,
  }));
}
