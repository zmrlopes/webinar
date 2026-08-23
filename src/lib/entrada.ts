import { db } from "./db";

/**
 * Troca o `registrationId` pelo `link_pessoal` a sério, e regista o
 * primeiro clique (só a primeira vez — cliques seguintes não sobrescrevem
 * a data). Devolve `null` quando a inscrição não existe ou ainda não tem
 * link — quem chama decide o que mostrar nesse caso.
 */
export async function registarCliqueEntrada(registrationId: string): Promise<string | null> {
  const { rows } = await db().query<{ link_pessoal: string | null }>(
    `select link_pessoal from registrations where id = $1`,
    [registrationId],
  );
  const linkPessoal = rows[0]?.link_pessoal;
  if (!linkPessoal) return null;

  await db().query(
    `update registrations set link_zoom_clicado_em = now()
     where id = $1 and link_zoom_clicado_em is null`,
    [registrationId],
  );

  return linkPessoal;
}
