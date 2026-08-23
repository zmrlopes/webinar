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
  nome: string | null,
): Promise<void> {
  await db().query(
    `insert into links_consultor (referencia, referencia_email, nome)
     values ($1, $2, $3)
     on conflict (referencia) do update
       set referencia_email = excluded.referencia_email, nome = excluded.nome, atualizado_em = now()`,
    [referencia, referenciaEmail, nome],
  );
}

export async function procurarLinkConsultor(
  referencia: string,
): Promise<{ referenciaEmail: string; nome: string | null } | null> {
  if (CODIGOS_RESERVADOS.has(referencia)) return null;
  const { rows } = await db().query<{ referencia_email: string; nome: string | null }>(
    `select referencia_email, nome from links_consultor where referencia = $1`,
    [referencia],
  );
  const linha = rows[0];
  return linha ? { referenciaEmail: linha.referencia_email, nome: linha.nome } : null;
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
 * Números de um consultor (ou de um consultor + toda a equipa descendente,
 * ver `buscarDescendentesEmails`) para uma sessão: quantas vezes o link foi
 * aberto, quantos se inscreveram (`referencia_email`), quantos estiveram
 * presentes e quantos não — os dois últimos só ficam corretos depois de a
 * sessão acontecer e o processo de presenças (secção 7-D) correr; antes
 * disso, tudo conta como "não entraram" porque ainda não há registo de
 * presença.
 *
 * Exclui quem se inscreveu a se próprio sendo também consultor (está em
 * `equipa_afiliados`) — não é um lead, é um colega a testar/assistir.
 */
export async function estatisticasConsultor(
  webinarId: string,
  referenciaEmails: string[],
): Promise<EstatisticasConsultor> {
  const [{ rows }, aberturas] = await Promise.all([
    db().query<{
      total_inscricoes: string;
      presencas: string;
    }>(
      `select
         count(*) filter (where cancelada_em is null) as total_inscricoes,
         count(*) filter (where cancelada_em is null and presenca = 'attended') as presencas
       from registrations r
       where webinar_id = $1 and referencia_email = any($2::text[])
         and not exists (select 1 from equipa_afiliados ea where ea.email = r.email)`,
      [webinarId, referenciaEmails],
    ),
    contarCliques(webinarId, referenciaEmails),
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
  abriuLink: "sim" | "nao";
  percentagemAssistencia: number | null;
  linkZoom: string | null;
  trazidoPor: string | null;
}

/**
 * Um lead por linha, para o consultor ver quem se inscreveu pelo link dele
 * (ou de alguém da equipa dele, ver `buscarDescendentesEmails`) e quem
 * chegou a clicar no link de entrada do Zoom que recebeu por email
 * (`link_zoom_clicado_em`, gravado por /api/entrar/[id] — ver
 * src/lib/entrada.ts). `percentagemAssistencia` só existe para
 * quem esteve presente e com minutos registados — antes da sessão
 * acontecer, ou para quem não entrou, fica a null. `trazidoPor` é o nome do
 * membro da equipa (de `equipa_afiliados`) cujo link gerou o lead, ou null
 * quando é o próprio consultor que está a ver o painel.
 *
 * Exceção deliberada e pedida à regra "nunca expor link_pessoal" (que
 * continua válida em todo o resto do sistema, incluindo /admin): o
 * consultor pode copiar o link de um lead trazido por ele ou pela sua
 * equipa, para reenviar diretamente (ex: WhatsApp) se a pessoa não tiver
 * visto o email. Só sai daqui, nunca aparece em nenhum painel de
 * administração nem em exportações.
 *
 * Exclui quem se inscreveu a si próprio sendo também consultor (está em
 * `equipa_afiliados`) — não é um lead, é um colega a testar/assistir.
 */
export async function listarLeadsConsultor(
  webinarId: string,
  proprioEmail: string,
  referenciaEmails: string[],
  duracaoMinutos: number,
): Promise<LeadConsultor[]> {
  const { rows } = await db().query<{
    nome: string;
    telemovel: string | null;
    email: string;
    presenca: "unknown" | "attended" | "absent";
    presenca_minutos: number | null;
    link_pessoal: string | null;
    link_zoom_clicado_em: Date | null;
    referencia_email: string;
    trazido_por_nome: string | null;
  }>(
    `select r.nome, r.telemovel, r.email, r.presenca, r.presenca_minutos, r.link_pessoal,
            r.link_zoom_clicado_em, r.referencia_email, ea.nome as trazido_por_nome
     from registrations r
     left join equipa_afiliados ea on ea.email = r.referencia_email
     where r.webinar_id = $1 and r.referencia_email = any($2::text[]) and r.cancelada_em is null
       and not exists (select 1 from equipa_afiliados ea2 where ea2.email = r.email)
     order by r.criado_em asc`,
    [webinarId, referenciaEmails],
  );

  return rows.map((r) => ({
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    abriuLink: r.link_zoom_clicado_em !== null ? "sim" : "nao",
    percentagemAssistencia:
      r.presenca === "attended" && r.presenca_minutos !== null && duracaoMinutos > 0
        ? Math.min(100, Math.round((r.presenca_minutos / duracaoMinutos) * 100))
        : null,
    linkZoom: r.link_pessoal,
    trazidoPor: r.referencia_email === proprioEmail ? null : (r.trazido_por_nome ?? r.referencia_email),
  }));
}
