import { db } from "./db";
import { LINK_GRUPO_WELCOME_ABOARD } from "./consultor-nova-area";

/** Cada líder (e toda a sua descendência) tem o seu grupo Welcome Aboard. */
const GRUPOS_POR_LIDER: Record<string, string> = {
  // Ana Custódia
  "apensarnaproxima@gmail.com": "https://chat.whatsapp.com/CDFcyL0eYXc0kVl8Fp7XMK",
  // Marisa Araújo
  "marisa.araujo.icligo@gmail.com": "https://chat.whatsapp.com/JBWy7ygb6CmJQHr8gpiT5m",
  // Lara Rodrigues
  "viajarviversonhar@gmail.com": "https://chat.whatsapp.com/HZ1wZbrQgtv4m5CkuEJEqE?s=cl&p=a&mlu=4&ilr=4&iam=2",
};

/**
 * Inclui a própria líder e toda a descendência, também após novas importações.
 * Quando há líderes encadeadas (ex.: Marisa dentro da equipa da Ana), vale a
 * líder mais próxima na hierarquia.
 */
export async function obterLinkGrupoWelcomeAboard(email: string): Promise<string> {
  const { rows } = await db().query<{ email: string }>(
    `with recursive ascendentes as (
       select email, upline_email, 0 as nivel from equipa_afiliados where email = $1
       union
       select ea.email, ea.upline_email, a.nivel + 1 from equipa_afiliados ea
       join ascendentes a on ea.email = a.upline_email
       where a.nivel < 50
     )
     select email from ascendentes
     where email = any($2::text[])
     order by nivel
     limit 1`,
    [email.trim().toLowerCase(), Object.keys(GRUPOS_POR_LIDER)],
  );
  const lider = rows[0]?.email;
  return (lider && GRUPOS_POR_LIDER[lider]) || LINK_GRUPO_WELCOME_ABOARD;
}
