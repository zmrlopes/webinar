import { db } from "./db";
import { LINK_GRUPO_WELCOME_ABOARD } from "./consultor-nova-area";

const EMAIL_ANA_CUSTODIA = "apensarnaproxima@gmail.com";
const EMAIL_MARISA_ARAUJO = "marisa.araujo.icligo@gmail.com";
const LINK_GRUPO_ANA_CUSTODIA = "https://chat.whatsapp.com/CDFcyL0eYXc0kVl8Fp7XMK";

/** Inclui a própria líder e toda a descendência, também após novas importações. */
export async function obterLinkGrupoWelcomeAboard(email: string): Promise<string> {
  const { rows } = await db().query<{ ana: boolean; marisa: boolean }>(
    `with recursive ascendentes as (
       select email, upline_email from equipa_afiliados where email = $1
       union
       select ea.email, ea.upline_email from equipa_afiliados ea
       join ascendentes a on ea.email = a.upline_email
     )
     select coalesce(bool_or(email = $2), false) as ana,
            coalesce(bool_or(email = $3), false) as marisa
     from ascendentes`,
    [email.trim().toLowerCase(), EMAIL_ANA_CUSTODIA, EMAIL_MARISA_ARAUJO],
  );
  // A equipa da Marisa conserva o convite atual até ser indicado o seu novo link.
  return rows[0]?.ana && !rows[0].marisa ? LINK_GRUPO_ANA_CUSTODIA : LINK_GRUPO_WELCOME_ABOARD;
}
