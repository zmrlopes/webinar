import { NextResponse } from "next/server";
import { ErroReserva } from "@/lib/reservas";
import { acessoReservas } from "@/lib/reservas-servidor";
import { CENTRO_AJUDA, REGRAS_GERAIS, REVISTO_EM, pesquisarOperadores, resumoOperadores, sugestoesDestinos } from "@/lib/operadores-destinos";

export const runtime = "nodejs";

/** Reservas → Onde posso vender: mesmo acesso de Reservas (só a conta de teste, por agora). */
export async function POST(request: Request): Promise<Response> {
  const resposta = (valor: unknown) => NextResponse.json(valor, {headers: {"Cache-Control": "private, no-store"}});
  try {
    const corpo = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroReserva("Pedido inválido.");
    await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "inicio": return resposta({sugestoes: sugestoesDestinos(), operadores: resumoOperadores(), regras: REGRAS_GERAIS, revistoEm: REVISTO_EM, centroAjuda: CENTRO_AJUDA});
      case "pesquisar": {
        const termo = typeof corpo.termo === "string" ? corpo.termo.slice(0, 80) : "";
        const destino = typeof corpo.destino === "string" && corpo.destino ? corpo.destino.slice(0, 40) : undefined;
        return resposta(pesquisarOperadores(termo, destino));
      }
      default: throw new ErroReserva("Ação inválida.");
    }
  } catch (erro) {
    if (erro instanceof ErroReserva) return NextResponse.json({erro: erro.message}, {status: erro.status});
    console.error("Onde posso vender: pedido não concluído", erro instanceof Error ? erro.name : "erro");
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
