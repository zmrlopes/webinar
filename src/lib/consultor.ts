import { db } from "./db";

export interface EstatisticasConsultor {
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
}

/**
 * Números de um consultor para uma sessão: quantos se inscreveram pelo link
 * dele (`referencia_email`), quantos estiveram presentes e quantos não — os
 * dois últimos só ficam corretos depois de a sessão acontecer e o processo
 * de presenças (secção 7-D) correr; antes disso, tudo conta como "não
 * entraram" porque ainda não há registo de presença.
 */
export async function estatisticasConsultor(
  webinarId: string,
  referenciaEmail: string,
): Promise<EstatisticasConsultor> {
  const { rows } = await db().query<{
    total_inscricoes: string;
    presencas: string;
  }>(
    `select
       count(*) filter (where cancelada_em is null) as total_inscricoes,
       count(*) filter (where cancelada_em is null and presenca = 'attended') as presencas
     from registrations
     where webinar_id = $1 and referencia_email = $2`,
    [webinarId, referenciaEmail],
  );

  const linha = rows[0];
  const totalInscricoes = Number(linha?.total_inscricoes ?? 0);
  const presencas = Number(linha?.presencas ?? 0);
  return { totalInscricoes, presencas, naoEntraram: totalInscricoes - presencas };
}
