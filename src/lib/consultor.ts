import { contarCliques } from "./cliques";
import { db } from "./db";

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
}

/**
 * Um lead por linha, para o consultor ver quem se inscreveu pelo link dele e
 * quem chegou a abrir o link do Zoom. `percentagemAssistencia` só existe
 * para quem esteve presente e com minutos registados — antes da sessão
 * acontecer, ou para quem não entrou, fica a null.
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
  }>(
    `select nome, telemovel, email, presenca, presenca_minutos
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
  }));
}
