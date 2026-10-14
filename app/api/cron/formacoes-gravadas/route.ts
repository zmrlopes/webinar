import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { processarNotificacoesGravadas } from "@/lib/formacoes-gravadas-notificacoes";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;
  return NextResponse.json(await processarNotificacoesGravadas());
}
