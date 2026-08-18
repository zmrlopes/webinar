import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { limparLinks } from "@/lib/limpeza";

export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;

  const resultado = await limparLinks();
  return NextResponse.json(resultado);
}
