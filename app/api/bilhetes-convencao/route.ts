import { NextResponse } from "next/server";
import { gravarPedidoBilhete, validarPedidoBilhete } from "@/lib/bilhetes-convencao";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const pedido = validarPedidoBilhete(corpo);
  if (typeof pedido === "string") {
    return NextResponse.json({ erro: pedido }, { status: 400 });
  }

  try {
    await gravarPedidoBilhete(pedido);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar pedido de bilhete:", erro);
    return NextResponse.json(
      { erro: "Não foi possível gravar o pedido agora. Tenta outra vez daqui a um minuto." },
      { status: 502 },
    );
  }
}
