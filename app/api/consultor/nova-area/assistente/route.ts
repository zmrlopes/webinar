import { NextResponse } from "next/server";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";
import { buscarMembroEquipa } from "@/lib/equipa";
import { validarPedidoAssistente } from "@/lib/assistente-equipa";
import { reservarPedidoAssistente, responderAssistenteEquipa } from "@/lib/assistente-equipa-servidor";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return NextResponse.json({ erro: "Esta ferramenta ainda está em preparação." }, { status: 403, headers });
  const pedido = validarPedidoAssistente(corpo);
  if (!pedido) return NextResponse.json({ erro: "Escreve uma pergunta entre 5 e 1600 caracteres." }, { status: 400, headers });
  try {
    if (!await buscarMembroEquipa(email)) return NextResponse.json({ erro: "Conta não encontrada." }, { status: 403, headers });
    if (!await reservarPedidoAssistente(email)) return NextResponse.json({ erro: "Fizeste várias perguntas seguidas. Aguarda alguns minutos antes de continuar." }, { status: 429, headers });
    return NextResponse.json(await responderAssistenteEquipa(pedido.pergunta, pedido.historico), { headers });
  } catch (erro) {
    console.error("falha no assistente da equipa:", erro instanceof Error ? erro.message.split(":")[0] : "erro desconhecido");
    return NextResponse.json({ erro: "Não foi possível preparar a resposta. Tenta novamente dentro de alguns instantes." }, { status: 503, headers });
  }
}
