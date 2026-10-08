import { NextResponse } from "next/server";
import { podeVerNovaArea, type DadosEventosPresenciais } from "@/lib/consultor-nova-area";
import { buscarMembroEquipa } from "@/lib/equipa";
import { buscarPedidoDoConsultor } from "@/lib/bilhetes-convencao";
import { EVENTO_TITULO, EVENTO_LOCAL, EVENTO_PRECO_ADULTO, EVENTO_PRECO_CRIANCA_MAIS10, estaoInscricoesAbertas } from "@/lib/eventos";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) {
    return NextResponse.json({ erro: "Esta área ainda está em preparação." }, { status: 403 });
  }
  try {
    const membro = await buscarMembroEquipa(email);
    if (!membro) return NextResponse.json({ erro: "Não encontrámos esta conta na equipa." }, { status: 403 });
    const [inscricoesAbertas, pedido] = await Promise.all([
      estaoInscricoesAbertas(),
      buscarPedidoDoConsultor(email, membro.nome).catch(erro => {
        console.error("falha ao carregar o pedido da Convenção na nova área:", erro);
        return "erro" as const;
      }),
    ]);
    const dados: DadosEventosPresenciais = {
      teambuilding: {
        titulo: EVENTO_TITULO, data: "2026-11-14", local: EVENTO_LOCAL,
        precoAdulto: EVENTO_PRECO_ADULTO, precoCrianca: EVENTO_PRECO_CRIANCA_MAIS10, inscricoesAbertas,
      },
      convencao: {
        titulo: "Convenção Nacional iCliGo", data: "2027-03-13", erroPedido: pedido === "erro",
        pedido: pedido && pedido !== "erro" ? {
          bilhetes: pedido.bilhetes, pagamento: pedido.pagamento,
          comprovativoNome: pedido.comprovativoNome, comprovativoEm: pedido.comprovativoEm?.toISOString() ?? null,
          comprovativo2Nome: pedido.comprovativo2Nome, comprovativo2Em: pedido.comprovativo2Em?.toISOString() ?? null,
        } : null,
      },
    };
    return NextResponse.json(dados, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao carregar os eventos presenciais da conta de teste:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar os eventos. Tenta novamente." }, { status: 500 });
  }
}
