import { NextResponse } from "next/server";
import { criarEmailSender } from "@/lib/email";
import { notificarInscritosSemResposta } from "@/lib/teambuilding";

export async function POST(): Promise<Response> {
  const resultado = await notificarInscritosSemResposta(criarEmailSender());
  return NextResponse.json(resultado);
}
