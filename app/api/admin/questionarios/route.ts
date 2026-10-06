import { NextResponse } from "next/server";
import { buscarQuestionario, definirAberto, notificarQuestionario } from "@/lib/questionarios";

export const maxDuration = 60;

/**
 * Ações do separador Questionários: fechar, reabrir e mandar a notificação
 * no telemóvel. Protegida pela mesma Basic Auth de /api/admin/* (proxy.ts).
 * Corpo: { slug, acao: "fechar" | "abrir" | "notificar" }
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { slug?: string; acao?: string } | null;
  const slug = corpo?.slug ?? "";
  if (!buscarQuestionario(slug)) return NextResponse.json({ erro: "questionário desconhecido" }, { status: 400 });

  try {
    if (corpo?.acao === "fechar" || corpo?.acao === "abrir") {
      await definirAberto(slug, corpo.acao === "abrir");
      return NextResponse.json({ ok: true });
    }
    if (corpo?.acao === "notificar") {
      const enviados = await notificarQuestionario(slug);
      return NextResponse.json({ ok: true, enviados });
    }
    return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
  } catch (erro) {
    console.error("falha na ação do questionário:", erro);
    return NextResponse.json({ erro: "não foi possível" }, { status: 500 });
  }
}
