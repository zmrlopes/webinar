import { db } from "./db";
import { LINK_GRUPO_WELCOME_ABOARD } from "./consultor-nova-area";

const EMAIL_ANA_CUSTODIA = "apensarnaproxima@gmail.com";
const EMAIL_MARISA_ARAUJO = "marisa.araujo.icligo@gmail.com";
const LINK_GRUPO_ANA_CUSTODIA = "https://chat.whatsapp.com/CDFcyL0eYXc0kVl8Fp7XMK";
const LINK_GRUPO_MARISA_ARAUJO = "https://chat.whatsapp.com/JBWy7ygb6CmJQHr8gpiT5m";

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
  // O ramo da Marisa tem prioridade sobre a equipa da Ana, da qual faz parte.
  if (rows[0]?.marisa) return LINK_GRUPO_MARISA_ARAUJO;
  return rows[0]?.ana ? LINK_GRUPO_ANA_CUSTODIA : LINK_GRUPO_WELCOME_ABOARD;
}
