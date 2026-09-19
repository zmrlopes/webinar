import { NextResponse } from "next/server";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { notificarPush } from "@/lib/push";

/**
 * Dispara uma notificação push de teste — só para o painel de
 * demonstração, de propósito: isto não pode virar um sítio para mandar
 * notificações arbitrárias a qualquer consultor a partir do browser.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = corpo?.email;

  if (typeof email !== "string" || email.trim().toLowerCase() !== EMAIL_PAINEL_DEMONSTRACAO) {
    return NextResponse.json({ erro: "este teste é só para o painel de demonstração" }, { status: 403 });
  }

  try {
    await notificarPush(EMAIL_PAINEL_DEMONSTRACAO, {
      titulo: "🔔 Notificação de teste",
      corpo: "Se estás a ver isto, as notificações push estão a funcionar!",
      url: "/consultor",
    });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao enviar notificação de teste:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível enviar" },
      { status: 500 },
    );
  }
}
