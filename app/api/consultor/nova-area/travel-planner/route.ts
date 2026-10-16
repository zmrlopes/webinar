import { NextResponse } from "next/server";
import { ErroPlanner, plannerVazio } from "@/lib/travel-planner";
import { abrirPlanner, apagarPlanner, erroPlannerParaResposta, gerarRoteiroPlanner, guardarPlanner, listarPlanners, novoIdPlanner, pdfPlanner } from "@/lib/travel-planner-servidor";
import { acessoReservas, fotografiasReserva, lerBytesReserva } from "@/lib/reservas-servidor";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Mesmo acesso que Reservas: só a conta de teste, por agora. */
export async function POST(request: Request): Promise<Response> {
  const resposta = (valor: unknown) => NextResponse.json(valor, {headers: {"Cache-Control": "private, no-store"}});
  try {
    const bytes = await lerBytesReserva(request.body, 400_000);
    let corpo: Record<string, unknown>;
    try { corpo = JSON.parse(new TextDecoder().decode(bytes)); if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Error(); }
    catch { throw new ErroPlanner("Pedido inválido."); }
    const email = await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "listar": return resposta({planners: await listarPlanners(email), ia: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)});
      case "novo": return resposta({planner: plannerVazio(novoIdPlanner())});
      case "abrir": return resposta({planner: await abrirPlanner(email, corpo.id)});
      case "guardar": return resposta({planner: await guardarPlanner(email, corpo.planner)});
      case "apagar": await apagarPlanner(email, corpo.id); return resposta({ok: true});
      case "gerar": return resposta(await gerarRoteiroPlanner(email, corpo.planner));
      case "fotografias": return resposta({fotografias: await fotografiasReserva(corpo.destino)});
      case "pdf": {
        const {bytes: pdf, nome} = await pdfPlanner(email, corpo.id, new URL(request.url).origin);
        return new Response(Buffer.from(pdf), {headers: {
          "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "private, no-store",
        }});
      }
      default: throw new ErroPlanner("Ação inválida.");
    }
  } catch (erro) {
    const conhecido = erroPlannerParaResposta(erro);
    if (conhecido) return NextResponse.json({erro: conhecido.mensagem}, {status: conhecido.status});
    console.error("Travel planner: pedido não concluído", erro instanceof Error ? erro.message : "erro");
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
