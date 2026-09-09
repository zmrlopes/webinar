import { NextResponse } from "next/server";
import { buscarMembroEquipa } from "@/lib/equipa";
import { gerarRespostasObjecao, guardarObjecaoLead } from "@/lib/objecoes";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const objecao = corpo?.objecao;
  const leadEmail = corpo?.leadEmail;

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

    // Best-effort — se a lead indicada não pertencer a este consultor (ou
    // faltar), não é motivo para esconder as respostas já geradas.
    if (typeof leadEmail === "string" && leadEmail.trim() !== "") {
      try {
        await guardarObjecaoLead(leadEmail.trim().toLowerCase(), objecao.trim(), respostas, email.trim().toLowerCase());
      } catch (erroGuardar) {
        console.error("falha ao guardar objeção da lead:", erroGuardar);
      }
    }

    return NextResponse.json({ respostas });
  } catch (erro) {
    console.error("falha ao gerar respostas de objeção:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível gerar respostas (${mensagem})` }, { status: 500 });
  }
}
