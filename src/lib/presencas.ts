import { db } from "./db.js";
import { pedirPresencas } from "./sala-zoom.js";

interface SessaoTerminada {
  id: string;
  sessao_externa_id: string;
  sessao_externa_em: Date;
  duracao_minutos: number;
}

export interface ResultadoPresencas {
  sessoesProcessadas: number;
  presencasAtualizadas: number;
}

/**
 * Secção 7-D do guia: só sessões terminadas há ≥45 min, em lotes de até 1000
 * emails, e a automação só toca em quem está `unknown` — nunca sobrepõe uma
 * correção feita à mão.
 */
export async function processarPresencas(): Promise<ResultadoPresencas> {
  const { rows: sessoes } = await db().query<SessaoTerminada>(
    `select id, sessao_externa_id, sessao_externa_em, duracao_minutos
     from webinars
     where presencas_fechadas = false
       and sessao_externa_id is not null
       and duracao_minutos is not null
       and sessao_externa_em + (duracao_minutos || ' minutes')::interval <= now() - interval '45 minutes'`,
  );

  let presencasAtualizadas = 0;

  for (const sessao of sessoes) {
    const { rows: pendentes } = await db().query<{ email: string }>(
      `select email from registrations
       where webinar_id = $1 and presenca = 'unknown' and cancelada_em is null`,
      [sessao.id],
    );

    let atualizadasNestaSessao = 0;

    if (pendentes.length > 0) {
      const resultado = await pedirPresencas(
        sessao.sessao_externa_id,
        pendentes.map((r) => r.email),
      );

      for (const linha of resultado) {
        const { rowCount } = await db().query(
          `update registrations
           set presenca = $1, presenca_minutos = $2
           where webinar_id = $3 and email = $4 and presenca = 'unknown'`,
          [linha.presenca, linha.minutos, sessao.id, linha.email],
        );
        atualizadasNestaSessao += rowCount ?? 0;
      }
      presencasAtualizadas += atualizadasNestaSessao;
    }

    const fimPrevistoMs =
      new Date(sessao.sessao_externa_em).getTime() + sessao.duracao_minutos * 60_000;
    const horasDesdeOFim = (Date.now() - fimPrevistoMs) / (60 * 60_000);

    const restamPendentes = pendentes.length > atualizadasNestaSessao;
    if (!restamPendentes || horasDesdeOFim >= 30) {
      await db().query(`update webinars set presencas_fechadas = true where id = $1`, [
        sessao.id,
      ]);
    }
  }

  return { sessoesProcessadas: sessoes.length, presencasAtualizadas };
}
