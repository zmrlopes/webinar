import { NextResponse } from "next/server";
import { criarEmailSender } from "@/lib/email";
import { notificarInscritosTrofeus } from "@/lib/trofeus";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { teste?: unknown } | null;
  const teste = corpo?.teste === true;

  try {
    const resultado = await notificarInscritosTrofeus(criarEmailSender(), teste);
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao avisar sobre o questionário dos troféus:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível enviar" },
      { status: 500 },
    );
  }
}
