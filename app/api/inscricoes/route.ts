import { NextResponse } from "next/server";
import { CABECALHOS_CORS, respostaOptionsCors } from "../../../src/lib/cors";
import { DadosInvalidos, inscrever } from "@/lib/inscricoes";

export async function OPTIONS(): Promise<Response> {
  return respostaOptionsCors();
}

export async function POST(request: Request): Promise<Response> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400, headers: CABECALHOS_CORS });
  }

  if (
    typeof corpo !== "object" ||
    corpo === null ||
    !("webinarId" in corpo) ||
    !("nome" in corpo) ||
    !("email" in corpo)
  ) {
    return NextResponse.json({ erro: "faltam campos" }, { status: 400, headers: CABECALHOS_CORS });
  }

  const { webinarId, nome, telemovel, email, referencia } = corpo as Record<string, unknown>;

  if (
    typeof webinarId !== "string" ||
    typeof nome !== "string" ||
    typeof email !== "string" ||
    (telemovel !== undefined && typeof telemovel !== "string") ||
    (referencia !== undefined && typeof referencia !== "string")
  ) {
    return NextResponse.json(
      { erro: "campos com tipo inválido" },
      { status: 400, headers: CABECALHOS_CORS },
    );
  }

  try {
    const { registrationId } = await inscrever({
      webinarId,
      nome,
      telemovel: telemovel as string | undefined,
      email,
      referencia: referencia as string | undefined,
    });
    return NextResponse.json({ registrationId }, { status: 200, headers: CABECALHOS_CORS });
  } catch (erro) {
    if (erro instanceof DadosInvalidos) {
      return NextResponse.json({ erro: erro.message }, { status: 400, headers: CABECALHOS_CORS });
    }
    console.error("falha ao gravar inscrição:", erro);
    return NextResponse.json(
      { erro: "não foi possível gravar a inscrição" },
      { status: 500, headers: CABECALHOS_CORS },
    );
  }
}
