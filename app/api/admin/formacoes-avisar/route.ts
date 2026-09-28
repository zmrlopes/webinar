import { NextResponse } from "next/server";
import { criarEmailSender } from "@/lib/email";
import { avisarEquipaFormacoes } from "@/lib/formacoes-aviso";

export const maxDuration = 60;

/**
 * Quantas pessoas por chamada — cada envio pela ActiveCampaign anda à volta
 * de 1,5s, e 20 cabem à vontade nos 60s da função. O painel volta a chamar
 * esta rota até `restantes` chegar a zero (ver avisar-equipa/route.ts).
 */
const POR_LOTE = 20;

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { teste?: unknown } | null;
  const teste = corpo?.teste === true;

  try {
    const resultado = await avisarEquipaFormacoes(criarEmailSender(), { teste, limite: POR_LOTE });
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao avisar a equipa sobre as formações gravadas:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível enviar" },
      { status: 500 },
    );
  }
}
