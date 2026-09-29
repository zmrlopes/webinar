import { NextResponse } from "next/server";
import { gravarNegocioMensal } from "@/lib/dashboard-negocio";

/**
 * Recebe o histórico mensal do negócio (faturação, comissões, pontos,
 * consultores) e grava-o em negocio_mensal. Os números viajam no corpo do
 * pedido e vivem só na base de dados — nunca no código, que é público.
 * Protegida pela mesma Basic Auth de /api/admin/* (ver proxy.ts).
 *
 * Corpo esperado: { linhas: [{ metrica, ano, mes, valor }, ...] }
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as {
    linhas?: { metrica?: string; ano?: number; mes?: number; valor?: number }[];
  } | null;

  const linhas = corpo?.linhas;
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ erro: "corpo sem 'linhas'" }, { status: 400 });
  }

  const validas = linhas
    .filter(
      (l): l is { metrica: string; ano: number; mes: number; valor: number } =>
        typeof l.metrica === "string" &&
        typeof l.ano === "number" &&
        typeof l.mes === "number" &&
        typeof l.valor === "number",
    )
    .map((l) => ({ metrica: l.metrica, ano: l.ano, mes: l.mes, valor: l.valor }));

  const gravadas = await gravarNegocioMensal(validas);
  return NextResponse.json({ recebidas: linhas.length, gravadas });
}
