import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { sincronizarSessoes } from "@/lib/sessoes";

export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;

  const resultado = await sincronizarSessoes();
  return NextResponse.json(resultado);
}
