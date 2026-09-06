import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Correção pontual: fatima.paulos.martins@gmail.com é a mesma pessoa que
 * info.oriah@gmail.com (Fátima Martins, lead da Sofia Pinheiro) registada
 * com um email diferente — estava a contar como uma segunda conversão a
 * mais no Top empreendedor da Sofia. Cancela (soft-delete, como em todo o
 * resto do sistema) as inscrições dela e remove o estado de lead, para
 * deixar de contar em qualquer lado. Protegida pela mesma Basic Auth de
 * /api/admin/* (ver proxy.ts).
 */

const EMAIL_DUPLICADO = "fatima.paulos.martins@gmail.com";

export async function POST(): Promise<Response> {
  const linhas: string[] = [];

  const { rowCount: canceladas } = await db().query(
    `update registrations set cancelada_em = now() where email = $1 and cancelada_em is null`,
    [EMAIL_DUPLICADO],
  );
  linhas.push(`${EMAIL_DUPLICADO}: ${canceladas ?? 0} inscrição(ões) cancelada(s).`);

  const { rowCount: removida } = await db().query(
    `delete from estados_lead where lead_email = $1`,
    [EMAIL_DUPLICADO],
  );
  linhas.push(`${EMAIL_DUPLICADO}: estado de lead removido (${removida ?? 0}).`);

  return NextResponse.json({ linhas });
}
