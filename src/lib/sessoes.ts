import { db } from "./db";
import { listarSessoes } from "./sala-zoom";

export interface ResultadoSincronizacao {
  novas: number;
  atualizadas: number;
  canceladas: number;
}

/**
 * Secção 7-A do guia.
 *
 * Uma sessão sai do GET /sessoes por três razões: foi cancelada, deixou de
 * ser conjunta, ou já começou. Só a primeira justifica marcar como cancelada
 * — por isso só cancelamos o que desaparecer e cujo `sessao_externa_em`
 * guardado ainda esteja no futuro.
 */
export async function sincronizarSessoes(): Promise<ResultadoSincronizacao> {
  const sessoes = await listarSessoes();
  const idsRecebidos = sessoes.map((s) => s.id);

  let novas = 0;
  let atualizadas = 0;

  for (const sessao of sessoes) {
    const { rows } = await db().query<{ inserida: boolean }>(
      `insert into webinars (titulo, duracao_minutos, sessao_externa_id, sessao_externa_em)
       values ($1, $2, $3, $4)
       on conflict (sessao_externa_id) do update
         set titulo            = excluded.titulo,
             duracao_minutos   = excluded.duracao_minutos,
             sessao_externa_em = excluded.sessao_externa_em,
             cancelada_em      = null
       returning (xmax = 0) as inserida`,
      [sessao.titulo, sessao.duracao_minutos, sessao.id, sessao.comeca_em],
    );
    if (rows[0]?.inserida) {
      novas += 1;
    } else {
      atualizadas += 1;
    }
  }

  const { rowCount } = await db().query(
    `update webinars
     set cancelada_em = now()
     where sessao_externa_id is not null
       and cancelada_em is null
       and sessao_externa_em > now()
       and not (sessao_externa_id = any($1::text[]))`,
    [idsRecebidos],
  );

  return { novas, atualizadas, canceladas: rowCount ?? 0 };
}
