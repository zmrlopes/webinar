import { NextResponse } from "next/server";
import { apagarFormacaoExterna } from "@/lib/formacoes-externas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    await apagarFormacaoExterna(id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao apagar formação externa:", erro);
    return NextResponse.json({ erro: "não foi possível apagar" }, { status: 500 });
  }
}
