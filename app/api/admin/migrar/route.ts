import { NextResponse } from "next/server";
import { aplicarMigracoesPendentes } from "@/lib/migrar";

/**
 * Mesma lógica de scripts/migrar.ts, para quando não há acesso ao PC —
 * aplica as migrations pendentes direto a partir do admin. Protegida pela
 * mesma Basic Auth de /api/admin/* (ver proxy.ts).
 */
export async function POST(): Promise<Response> {
  try {
    const resultados = await aplicarMigracoesPendentes();
    return NextResponse.json({ resultados });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
