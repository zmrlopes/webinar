import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { ConsoleEmailSender } from "@/lib/email";
import { processarLembretes } from "@/lib/lembretes";

export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;

  const resultado = await processarLembretes({ sender: new ConsoleEmailSender() });
  return NextResponse.json(resultado);
}
