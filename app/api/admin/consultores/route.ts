import { NextResponse } from "next/server";
import { adicionarConsultorAdmin, ErroConsultorAdmin } from "@/lib/consultores-admin";

/** Protegido pela autenticação de /api/admin/* em proxy.ts. */
export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  try {
    const consultor = await adicionarConsultorAdmin(corpo);
    return NextResponse.json({consultor}, {status: 201, headers: {"Cache-Control": "no-store"}});
  } catch (erro) {
    if (erro instanceof ErroConsultorAdmin) return NextResponse.json({erro: erro.message}, {status: erro.status});
    console.error("Falha ao adicionar consultor:", erro);
    return NextResponse.json({erro: "Não foi possível adicionar o consultor. Tenta novamente."}, {status: 500});
  }
}
