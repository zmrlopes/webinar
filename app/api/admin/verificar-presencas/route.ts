import { NextResponse } from "next/server";
import { processarPresencas } from "@/lib/presencas";

/**
 * Dispara a verificação de presenças (secção 7-D) sem esperar pelos 45 min
 * habituais nem pelo próximo ciclo do cron — para o admin poder forçar
 * agora a partir do browser, sem precisar do PC.
 */
export async function POST(): Promise<Response> {
  try {
    const resultado = await processarPresencas({ esperaMinutos: 0 });
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao verificar presenças:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
