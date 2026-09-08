import { NextResponse } from "next/server";
import { processarPresencas } from "@/lib/presencas";

/**
 * Dispara a verificação de presenças (secção 7-D) sem esperar pelos 45 min
 * habituais nem pelo próximo ciclo do cron — para o admin poder forçar
 * agora a partir do browser, sem precisar do PC.
 */
export async function POST(): Promise<Response> {
  const resultado = await processarPresencas({ esperaMinutos: 0 });
  return NextResponse.json(resultado);
}
