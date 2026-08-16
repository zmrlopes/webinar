import { db } from "./db.js";

/**
 * Secção 6/9 do guia: apaga `link_pessoal` das sessões cujo ciclo de
 * presenças já fechou. Guardar uma credencial de entrada que já não serve é
 * só risco.
 */
export async function limparLinks(): Promise<{ limpos: number }> {
  const { rowCount } = await db().query(
    `update registrations r
     set link_pessoal = null
     from webinars w
     where w.id = r.webinar_id
       and w.presencas_fechadas = true
       and r.link_pessoal is not null`,
  );
  return { limpos: rowCount ?? 0 };
}
