import { NextResponse } from "next/server";
import { sincronizarSessoes } from "@/lib/sessoes";

/**
 * Mesma sincronização do cron horário (/api/cron/sincronizar-sessoes), mas
 * para disparar manualmente no admin quando não se quer esperar até à
 * próxima hora — protegida pela Basic Auth de /api/admin/* (ver proxy.ts),
 * não pelo segredo do cron.
 */
export async function POST(): Promise<Response> {
  const resultado = await sincronizarSessoes();
  return NextResponse.json(resultado);
}
