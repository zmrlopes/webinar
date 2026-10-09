import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { gerarProximoRelatorioCore } from "@/lib/core-rank-registos";

export const maxDuration = 60;
export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;
  const resultado = await gerarProximoRelatorioCore();
  return NextResponse.json(resultado, {status: resultado.estado === "erro" ? 503 : 200});
}
