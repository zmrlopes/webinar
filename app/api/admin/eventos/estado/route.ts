import { NextResponse } from "next/server";
import { definirInscricoesAbertas } from "@/lib/eventos";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const abertas = corpo?.abertas;
  if (typeof abertas !== "boolean") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  await definirInscricoesAbertas(abertas);
  return NextResponse.json({ ok: true });
}
