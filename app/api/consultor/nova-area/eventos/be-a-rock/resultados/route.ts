import { NextResponse } from "next/server";
import { EMAIL_EQUIPA_ANA_BE_A_ROCK } from "@/lib/be-a-rock";
import { listarVotosBeARock } from "@/lib/be-a-rock-servidor";
import { buscarMembroEquipa } from "@/lib/equipa";

const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });

/** Segue a identificação do admin de equipa; o âmbito nunca vem do cliente. */
export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (email !== EMAIL_EQUIPA_ANA_BE_A_ROCK) return json({ erro: "Resultados reservados à Ana Custódia." }, 403);
  try {
    if (!await buscarMembroEquipa(email)) return json({ erro: "Conta não encontrada na equipa." }, 403);
    return json({ votos: await listarVotosBeARock("ana") });
  } catch (erro) {
    console.error("Falha nos resultados Be a Rock da equipa da Ana:", erro);
    return json({ erro: "Não foi possível carregar os resultados. Tenta novamente." }, 500);
  }
}
