import { NextResponse } from "next/server";
import { apagarPedidoBilhete } from "@/lib/bilhetes-convencao";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(corpo?.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
  }

  try {
    if (!(await apagarPedidoBilhete(id))) {
      return NextResponse.json({ erro: "este pedido já não existe" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao apagar pedido de bilhete:", erro);
    return NextResponse.json({ erro: "não foi possível apagar" }, { status: 500 });
  }
}
