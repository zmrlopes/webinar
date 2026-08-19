import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { criarEmailSender } from "@/lib/email";
import { processarFilaLinks } from "@/lib/fila-links";

export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;

  const resultado = await processarFilaLinks({ sender: criarEmailSender() });
  return NextResponse.json(resultado);
}
