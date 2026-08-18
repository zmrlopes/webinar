import { NextResponse } from "next/server";

/**
 * Protege os endpoints /api/cron/* (secção 9 do guia). O Vercel Cron manda
 * `Authorization: Bearer <CRON_SECRET>`; sem a variável definida, fecha por
 * omissão.
 */
export function verificarSegredoCron(request: Request): NextResponse | null {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json({ erro: "CRON_SECRET não configurado" }, { status: 500 });
  }
  const cabecalho = request.headers.get("authorization");
  if (cabecalho !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  return null;
}
