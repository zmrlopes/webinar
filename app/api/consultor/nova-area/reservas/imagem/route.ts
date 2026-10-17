import { NextResponse } from "next/server";
import { ErroReserva } from "@/lib/reservas";
import { acessoReservas, lerBytesReserva } from "@/lib/reservas-servidor";
import { abrirImagemReserva, apagarImagemReserva, criarReferenciaImagemReserva, gerarImagemReserva, listarImagensReserva, verificarImagemReserva } from "@/lib/reservas-imagem-servidor";
import {guardarEdicaoPublicacao,limparFundoEditorPublicacao,prepararEditorPublicacao} from "@/lib/reservas-imagem-editor-servidor";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const json = (v: unknown, status = 200) => NextResponse.json(v, {status, headers: {"Cache-Control": "private, no-store"}});
  try {
    const bytes = await lerBytesReserva(request.body, 1_350_000);
    let corpo: Record<string, unknown>;
    try {corpo = JSON.parse(new TextDecoder().decode(bytes)); if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Error();} catch {throw new ErroReserva("Pedido inválido.");}
    const email = await acessoReservas(corpo.email);
    switch (corpo.acao) {
      case "listar": return json({registos: await listarImagensReserva(email), disponivel: !!(process.env.RESERVAS_IMAGE_API_KEY || process.env.OPENAI_API_KEY) && !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)});
      case "abrir": return json(await abrirImagemReserva(email, corpo.id));
      case "referencia": return json(await criarReferenciaImagemReserva(email, corpo));
      case "gerar": return json(await gerarImagemReserva(email, corpo));
      case "verificar": return json(await verificarImagemReserva(email, corpo.id));
      case "preparar-editor": return json(await prepararEditorPublicacao(email, corpo.id));
      case "limpar-editor": return json(await limparFundoEditorPublicacao(email, corpo.id));
      case "guardar-edicao": return json(await guardarEdicaoPublicacao(email, corpo));
      case "apagar": await apagarImagemReserva(email, corpo.id); return json({ok: true});
      default: throw new ErroReserva("Ação inválida.");
    }
  } catch (erro) {
    if (erro instanceof ErroReserva) return json({erro: erro.message}, erro.status);
    console.error("Reservas imagem: pedido não concluído", erro instanceof Error ? erro.name : "erro");
    return json({erro: "Não foi possível concluir o pedido. Os teus registos guardados continuam disponíveis."}, 500);
  }
}
