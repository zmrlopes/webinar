import { NextResponse } from "next/server";
import { CABECALHOS_CORS, respostaOptionsCors } from "../../../../src/lib/cors";
import { registarCliqueLink } from "@/lib/cliques";

export async function OPTIONS(): Promise<Response> {
  return respostaOptionsCors();
}

/**
 * Regista uma abertura do link de um consultor — chamado da própria página
 * pública de inscrição (e do widget), não precisa de autenticação. Uma
 * falha aqui não pode impedir ninguém de ver o formulário, por isso o lado
 * do cliente ignora o resultado (fire-and-forget).
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const webinarId = corpo?.webinarId;
  const referenciaEmail = corpo?.referenciaEmail;

  if (typeof webinarId !== "string" || typeof referenciaEmail !== "string" || !referenciaEmail) {
    return NextResponse.json({ erro: "faltam campos" }, { status: 400, headers: CABECALHOS_CORS });
  }

  try {
    await registarCliqueLink(webinarId, referenciaEmail.trim().toLowerCase());
    return NextResponse.json({ ok: true }, { status: 200, headers: CABECALHOS_CORS });
  } catch (erro) {
    console.error("falha ao registar clique de consultor:", erro);
    return NextResponse.json({ erro: "falha ao registar" }, { status: 500, headers: CABECALHOS_CORS });
  }
}
