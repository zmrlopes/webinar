import { NextResponse } from "next/server";
import { guardarDiretrizesGeraisObjecoes } from "@/lib/objecoes";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const conteudo = corpo?.conteudo;

  if (typeof conteudo !== "string") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  try {
    await guardarDiretrizesGeraisObjecoes(conteudo.trim());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar diretrizes gerais de objeções:", erro);
    return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }
}
