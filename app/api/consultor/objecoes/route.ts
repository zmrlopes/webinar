import { NextResponse } from "next/server";
import { buscarMembroEquipa } from "@/lib/equipa";
import { gerarRespostasObjecao } from "@/lib/objecoes";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const objecao = corpo?.objecao;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (typeof objecao !== "string" || objecao.trim() === "") {
    return NextResponse.json({ erro: "escreve a objeção primeiro" }, { status: 400 });
  }

  try {
    const membro = await buscarMembroEquipa(email.trim().toLowerCase());
    if (!membro) {
      return NextResponse.json({ erro: "esta ferramenta é só para a equipa" }, { status: 403 });
    }

    const respostas = await gerarRespostasObjecao(objecao.trim());
    return NextResponse.json({ respostas });
  } catch (erro) {
    console.error("falha ao gerar respostas de objeção:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível gerar respostas (${mensagem})` }, { status: 500 });
  }
}
