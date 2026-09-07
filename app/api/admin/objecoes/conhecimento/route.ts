import { NextResponse } from "next/server";
import { adicionarConhecimentoObjecao } from "@/lib/objecoes";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const titulo = corpo?.titulo;
  const conteudo = corpo?.conteudo;

  if (
    typeof titulo !== "string" ||
    titulo.trim() === "" ||
    typeof conteudo !== "string" ||
    conteudo.trim() === ""
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  try {
    await adicionarConhecimentoObjecao(titulo.trim(), conteudo.trim());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao adicionar conhecimento de objeções:", erro);
    return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }
}
