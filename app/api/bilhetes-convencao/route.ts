import { NextResponse } from "next/server";
import {
  gravarPedidoBilhete,
  MAXIMO_BILHETES_POR_PEDIDO,
  validarPedidoBilhete,
} from "@/lib/bilhetes-convencao";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const pedido = validarPedidoBilhete(corpo);
  if (typeof pedido === "string") {
    return NextResponse.json({ erro: pedido }, { status: 400 });
  }

  try {
    const resultado = await gravarPedidoBilhete(pedido);
    if (resultado.tipo === "sem-acompanhantes") {
      return NextResponse.json(
        {
          erro: "Já tens um pedido com este email. Para acrescentar bilhetes, escreve o nome de quem vai usar os bilhetes novos.",
        },
        { status: 400 },
      );
    }
    if (resultado.tipo === "excede") {
      return NextResponse.json(
        {
          erro: `Já tens ${resultado.atual} bilhetes neste pedido. O máximo por pedido é ${MAXIMO_BILHETES_POR_PEDIDO}.`,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      resultado.tipo === "novo"
        ? { ok: true }
        : { ok: true, acrescentados: resultado.acrescentados, total: resultado.total },
    );
  } catch (erro) {
    console.error("falha ao gravar pedido de bilhete:", erro);
    return NextResponse.json(
      { erro: "Não foi possível gravar o pedido agora. Tenta outra vez daqui a um minuto." },
      { status: 500 },
    );
  }
}
