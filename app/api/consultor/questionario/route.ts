import { NextResponse } from "next/server";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { buscarMembroEquipa } from "@/lib/equipa";
import { buscarQuestionario, gravarRespostaQuestionario, validarRespostas } from "@/lib/questionarios";

/**
 * Recebe a resposta a um questionário anónimo. O email só serve para
 * confirmar que é alguém da equipa e para não responder duas vezes — a
 * resposta é gravada sem ele (ver src/lib/questionarios.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const slug = typeof corpo?.slug === "string" ? corpo.slug : "";
  const q = buscarQuestionario(slug);

  if (!email.includes("@") || !q) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  const validas = validarRespostas(q, corpo?.respostas);
  if (!validas.ok) return NextResponse.json({ erro: validas.erro }, { status: 400 });

  // Conta de teste: percorre o formulário todo, mas não grava nada.
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return NextResponse.json({ ok: true, teste: true });

  try {
    if (!(await buscarMembroEquipa(email))) {
      return NextResponse.json({ erro: "não encontrámos o teu email na equipa" }, { status: 403 });
    }
    const resultado = await gravarRespostaQuestionario(slug, email, validas.respostas);
    if (resultado === "fechado") return NextResponse.json({ erro: "este questionário já fechou" }, { status: 409 });
    if (resultado === "ja-respondeu") return NextResponse.json({ erro: "já respondeste a este questionário — obrigado!" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar resposta do questionário:", erro);
    return NextResponse.json({ erro: "não foi possível gravar a resposta" }, { status: 500 });
  }
}
