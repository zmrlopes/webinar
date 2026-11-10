import { NextResponse } from "next/server";
import { ErroOrcamento } from "@/lib/orcamentos";
import { apagarPedidoOrcamento, guardarPedidoOrcamento, listarPedidosOrcamento } from "@/lib/orcamentos-servidor";
import { acessoReservas } from "@/lib/reservas-servidor";

export const runtime = "nodejs";

/** Mesmo acesso que Reservas: só a conta de teste, por agora. */
export async function POST(request: Request): Promise<Response> {
  const resposta = (valor: unknown) => NextResponse.json(valor, { headers: { "Cache-Control": "private, no-store" } });
  try {
    let corpo: Record<string, unknown>;
    try { corpo = await request.json(); if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Error(); }
    catch { throw new ErroOrcamento("Pedido inválido."); }
    const email = await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "listar": return resposta({ pedidos: await listarPedidosOrcamento(email) });
      case "guardar": return resposta({ pedido: await guardarPedidoOrcamento(email, corpo.pedido) });
      case "apagar": await apagarPedidoOrcamento(email, corpo.id); return resposta({ ok: true });
      default: throw new ErroOrcamento("Ação inválida.");
    }
  } catch (erro) {
    if (erro instanceof ErroOrcamento) return NextResponse.json({ erro: erro.message }, { status: erro.status });
    console.error("Pedidos de orçamento: pedido não concluído", erro instanceof Error ? erro.message : "erro");
    return NextResponse.json({ erro: "Não foi possível concluir o pedido. Tenta novamente." }, { status: 500 });
  }
}
