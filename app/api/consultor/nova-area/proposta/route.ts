import { NextResponse } from "next/server";
import { ErroPlanner } from "@/lib/travel-planner";
import { erroPlannerParaResposta, localizarPonto, obterMarca, procurarFotos } from "@/lib/travel-planner-servidor";
import {
  abrirProposta, apagarProposta, criarPlannerDaProposta, fotoHotelProposta, gerarConteudoProposta, guardarPerfil, guardarProposta, lerPDFProposta,
  listarPropostas, novaProposta, obterPerfil, pdfProposta, previsualizarProposta,
} from "@/lib/proposta-servidor";
import { acessoReservas, lerBytesReserva } from "@/lib/reservas-servidor";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Mesmo acesso que Reservas: só a conta de teste, por agora. */
export async function POST(request: Request): Promise<Response> {
  const resposta = (valor: unknown) => NextResponse.json(valor, {headers: {"Cache-Control": "private, no-store"}});
  try {
    const bytes = await lerBytesReserva(request.body, 4_400_000);
    // Um PDF de cada vez: três PDFs juntos ultrapassavam o limite de envio do alojamento do site.
    if (request.headers.get("Content-Type")?.startsWith("multipart/form-data")) {
      const form = await new Response(new Uint8Array(bytes).buffer, {headers: {"Content-Type": request.headers.get("Content-Type")!}}).formData();
      const email = await acessoReservas(form.get("email"));
      const ficheiro = form.get("ficheiro");
      if (!(ficheiro instanceof File)) throw new ErroPlanner("Escolhe o PDF da proposta.");
      return resposta({leitura: await lerPDFProposta(email, ficheiro)});
    }
    let corpo: Record<string, unknown>;
    try { corpo = JSON.parse(new TextDecoder().decode(bytes)); if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Error(); }
    catch { throw new ErroPlanner("Pedido inválido."); }
    const email = await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "listar": {
        const [propostas, marca, perfil] = await Promise.all([listarPropostas(email), obterMarca(email), obterPerfil(email)]);
        return resposta({propostas, marca, perfil, ia: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)});
      }
      case "novo": return resposta({proposta: novaProposta()});
      case "abrir": return resposta({proposta: await abrirProposta(email, corpo.id)});
      case "guardar": return resposta({proposta: await guardarProposta(email, corpo.proposta)});
      case "apagar": await apagarProposta(email, corpo.id); return resposta({ok: true});
      case "gerar": return resposta({proposta: await gerarConteudoProposta(email, corpo.proposta)});
      case "fotografias": return resposta({fotografias: await procurarFotos(corpo.termo)});
      case "foto-hotel": return resposta({foto: await fotoHotelProposta(corpo)});
      case "localizar": return resposta({locais: await localizarPonto(corpo.termo)});
      case "perfil": return resposta({perfil: await guardarPerfil(email, corpo.perfil)});
      case "previsualizar": return resposta({paginas: await previsualizarProposta(email, corpo.proposta)});
      case "criar-planner": return resposta({id: await criarPlannerDaProposta(email, corpo.id, corpo.opcao)});
      case "pdf": {
        const {bytes: pdf, nome} = await pdfProposta(email, corpo.id);
        return new Response(Buffer.from(pdf), {headers: {"Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "private, no-store"}});
      }
      default: throw new ErroPlanner("Ação inválida.");
    }
  } catch (erro) {
    const conhecido = erroPlannerParaResposta(erro);
    if (conhecido) return NextResponse.json({erro: conhecido.mensagem}, {status: conhecido.status});
    console.error("Proposta: pedido não concluído", erro instanceof Error ? erro.message : "erro");
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
