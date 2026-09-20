import { NextResponse } from "next/server";
import { criarEmailSender } from "@/lib/email";
import { notificarInscritosHotel } from "@/lib/hotel";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { teste?: unknown } | null;
  const teste = corpo?.teste === true;

  try {
    const resultado = await notificarInscritosHotel(criarEmailSender(), teste);
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao avisar sobre o questionário do hotel:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível enviar" },
      { status: 500 },
    );
  }
}
