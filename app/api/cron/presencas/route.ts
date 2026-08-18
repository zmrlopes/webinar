import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { processarPresencas } from "@/lib/presencas";

export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;

  const resultado = await processarPresencas();
  return NextResponse.json(resultado);
}
