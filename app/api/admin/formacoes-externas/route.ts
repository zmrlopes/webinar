import { NextResponse } from "next/server";
import { criarFormacaoExterna } from "@/lib/formacoes-externas";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const titulo = corpo?.titulo;
  const sessaoExternaEm = corpo?.sessaoExternaEm;
  const link = corpo?.link;

  if (typeof titulo !== "string" || !titulo.trim()) {
    return NextResponse.json({ erro: "título é obrigatório" }, { status: 400 });
  }
  if (typeof sessaoExternaEm !== "string" || Number.isNaN(new Date(sessaoExternaEm).getTime())) {
    return NextResponse.json({ erro: "data/hora inválida" }, { status: 400 });
  }
  if (typeof link !== "string" || !/^https?:\/\//.test(link.trim())) {
    return NextResponse.json({ erro: "link inválido — tem de começar por http:// ou https://" }, { status: 400 });
  }

  try {
    await criarFormacaoExterna(titulo.trim(), new Date(sessaoExternaEm), link.trim());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao criar formação externa:", erro);
    return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }
}
