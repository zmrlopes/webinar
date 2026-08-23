import { db } from "./db";

/**
 * Todos os emails que estão, direta ou indiretamente, abaixo de `email` na
 * hierarquia importada por scripts/importar-equipa.ts — a "equipa
 * descendente". Não inclui o próprio `email`. Devolve lista vazia para quem
 * não tem equipa (a maioria dos consultores) ou nem consta do CSV.
 */
export async function buscarDescendentesEmails(email: string): Promise<string[]> {
  const { rows } = await db().query<{ email: string }>(
    `with recursive descendentes as (
       select email from equipa_afiliados where upline_email = $1
       union all
       select ea.email from equipa_afiliados ea
       join descendentes d on ea.upline_email = d.email
     )
     select email from descendentes`,
    [email],
  );
  return rows.map((r) => r.email);
}
