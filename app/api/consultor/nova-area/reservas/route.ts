import { NextResponse } from "next/server";
import { ErroReserva } from "@/lib/reservas";
import { acessoReservas, abrirReserva, analisarReferenciaReserva, apagarReserva, descarregarFotoReserva, fotografiasReserva, guardarReserva, importarPDFReserva, lerBytesReserva, listarReservas, sugerirFraseReserva } from "@/lib/reservas-servidor";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request): Promise<Response> {
  const resposta = (valor: unknown) => NextResponse.json(valor, {headers: {"Cache-Control": "private, no-store"}});
  try {
    const bytes = await lerBytesReserva(request.body, 4_100_000);
    if (request.headers.get("Content-Type")?.startsWith("multipart/form-data")) {
      const form = await new Response(new Uint8Array(bytes).buffer, {headers: {"Content-Type": request.headers.get("Content-Type")!}}).formData();
      const email = await acessoReservas(form.get("email"));
      const ficheiro = form.get("ficheiro");
      if (!(ficheiro instanceof File)) throw new ErroReserva("Escolhe o PDF da proposta.");
      return resposta(await importarPDFReserva(email, ficheiro));
    }
    let corpo: Record<string, unknown>;
    try {corpo = JSON.parse(new TextDecoder().decode(bytes)); if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Error();} catch {throw new ErroReserva("Pedido inválido.");}
    const email = await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "listar": return resposta({registos: await listarReservas(email), ia: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)});
      case "abrir": return resposta(await abrirReserva(email, corpo.id));
      case "guardar": return resposta(await guardarReserva(email, corpo));
      case "apagar": await apagarReserva(email, corpo.id); return resposta({ok: true});
      case "referencia": return resposta({material: await analisarReferenciaReserva(email, corpo.referencia, corpo.formato)});
      case "frase": return resposta({frase: await sugerirFraseReserva(email, corpo.destino)});
      case "fotografias": return resposta({fotografias: await fotografiasReserva(corpo.destino)});
      case "usar-foto": return resposta({imagem: await descarregarFotoReserva(corpo.url)});
      default: throw new ErroReserva("Ação inválida.");
    }
  } catch (erro) {
    if (erro instanceof ErroReserva) return NextResponse.json({erro: erro.message, ...(erro.diagnostico ? {diagnostico: erro.diagnostico} : {})}, {status: erro.status});
    console.error("Reservas: pedido não concluído", erro instanceof Error ? erro.name : "erro");
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
