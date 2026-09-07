import { NextResponse } from "next/server";
import { apagarConhecimentoObjecao } from "@/lib/objecoes";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    await apagarConhecimentoObjecao(id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao apagar conhecimento de objeções:", erro);
    return NextResponse.json({ erro: "não foi possível apagar" }, { status: 500 });
  }
}
