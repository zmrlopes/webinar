import { NextResponse } from "next/server";
import { ehZonaBeARock } from "@/lib/be-a-rock";
import { guardarVotoBeARock, lerVotoBeARock } from "@/lib/be-a-rock-servidor";
import { temAcessoNovaArea } from "@/lib/consultor-nova-area-servidor";
import { buscarMembroEquipa } from "@/lib/equipa";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  if (!corpo || !["consultar", "votar"].includes(corpo.acao)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  if (corpo.acao === "votar" && !ehZonaBeARock(corpo.zona)) {
    return NextResponse.json({ erro: "Escolhe NORTE ou SUL." }, { status: 400 });
  }
  const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
  try {
    if (!(await temAcessoNovaArea(email))) return NextResponse.json({ erro: "Acesso reservado à equipa." }, { status: 403 });
    const membro = await buscarMembroEquipa(email);
    if (!membro) return NextResponse.json({ erro: "Não encontrámos esta conta na equipa." }, { status: 403 });
    const voto = corpo.acao === "votar"
      ? await guardarVotoBeARock(email, membro.nome, corpo.zona)
      : await lerVotoBeARock(email);
    return NextResponse.json({ voto }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("Falha na sondagem do Be a Rock:", erro);
    return NextResponse.json({ erro: "Não foi possível concluir o pedido. Tenta novamente." }, { status: 500 });
  }
}
