import { NextResponse } from "next/server";
import { DadosInvalidos, inscrever } from "@/lib/inscricoes";

export async function POST(request: Request): Promise<Response> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (
    typeof corpo !== "object" ||
    corpo === null ||
    !("webinarId" in corpo) ||
    !("nome" in corpo) ||
    !("email" in corpo)
  ) {
    return NextResponse.json({ erro: "faltam campos" }, { status: 400 });
  }

  const { webinarId, nome, apelido, email } = corpo as Record<string, unknown>;

  if (
    typeof webinarId !== "string" ||
    typeof nome !== "string" ||
    typeof email !== "string" ||
    (apelido !== undefined && typeof apelido !== "string")
  ) {
    return NextResponse.json({ erro: "campos com tipo inválido" }, { status: 400 });
  }

  try {
    const { registrationId } = await inscrever({
      webinarId,
      nome,
      apelido: apelido as string | undefined,
      email,
    });
    return NextResponse.json({ registrationId }, { status: 200 });
  } catch (erro) {
    if (erro instanceof DadosInvalidos) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    console.error("falha ao gravar inscrição:", erro);
    return NextResponse.json({ erro: "não foi possível gravar a inscrição" }, { status: 500 });
  }
}
