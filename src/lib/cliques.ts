import { db } from "./db";

export async function registarCliqueLink(webinarId: string, referenciaEmail: string): Promise<void> {
  await db().query(
    `insert into cliques_link (webinar_id, referencia_email) values ($1, $2)`,
    [webinarId, referenciaEmail],
  );
}

export async function contarCliques(webinarId: string, referenciaEmail: string): Promise<number> {
  const { rows } = await db().query<{ total: string }>(
    `select count(*) as total from cliques_link where webinar_id = $1 and referencia_email = $2`,
    [webinarId, referenciaEmail],
  );
  return Number(rows[0]?.total ?? 0);
}
