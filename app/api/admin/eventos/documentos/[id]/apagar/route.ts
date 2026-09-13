import { NextResponse } from "next/server";
import { apagarDocumentoEvento } from "@/lib/eventos";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    await apagarDocumentoEvento(id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao apagar documento do evento:", erro);
    return NextResponse.json({ erro: "não foi possível apagar" }, { status: 500 });
  }
}
