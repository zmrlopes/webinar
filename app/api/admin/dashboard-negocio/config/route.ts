import { NextResponse } from "next/server";
import { gravarConfig } from "@/lib/dashboard-negocio";

/**
 * Recebe e grava um snapshot de configuração do dashboard (ex.: os totais do
 * separador Mapas) em dashboard_config. Os números viajam no corpo do pedido
 * e vivem só na base de dados, nunca no código público. Protegida pela mesma
 * Basic Auth de /api/admin/* (ver proxy.ts).
 *
 * Corpo esperado: { chave: string, valor: <objeto qualquer> }
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { chave?: string; valor?: unknown } | null;
  if (!corpo || typeof corpo.chave !== "string" || corpo.valor === undefined) {
    return NextResponse.json({ erro: "corpo precisa de 'chave' e 'valor'" }, { status: 400 });
  }
  await gravarConfig(corpo.chave, corpo.valor);
  return NextResponse.json({ ok: true, chave: corpo.chave });
}
