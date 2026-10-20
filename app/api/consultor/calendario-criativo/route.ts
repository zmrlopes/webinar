import { NextResponse } from "next/server";
import { buscarMembroEquipa } from "@/lib/equipa";
import { publicacaoValida } from "@/lib/calendario-criativo";
import { lerPublicados, marcarPublicado } from "@/lib/calendario-criativo-registos";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!email.includes("@")) return NextResponse.json({ erro: "Identifica-te com o teu email de consultor." }, { status: 400 });
  if (!corpo || !["consultar", "marcar"].includes(corpo.acao)) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  if (corpo.acao === "marcar" && (!publicacaoValida(corpo.id) || typeof corpo.publicado !== "boolean")) {
    return NextResponse.json({ erro: "Escolhe uma publicação válida." }, { status: 400 });
  }
  try {
    if (!await buscarMembroEquipa(email)) return NextResponse.json({ erro: "Conta não encontrada na equipa." }, { status: 403 });
    const publicados = corpo.acao === "marcar" ? await marcarPublicado(email, corpo.id, corpo.publicado) : await lerPublicados(email);
    return NextResponse.json({ publicados }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("Falha no calendário criativo:", erro);
    return NextResponse.json({ erro: "Não foi possível concluir o pedido. Tenta novamente." }, { status: 500 });
  }
}
