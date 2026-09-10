import { NextResponse } from "next/server";
import { definirPresencaManualLead } from "@/lib/leads";

/** Corrige manualmente se a lead assistiu ou não. A posse é sempre verificada no servidor (ver definirPresencaManualLead) — nunca confiada ao pedido. */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const leadEmail = corpo?.leadEmail;
  const assistiu = corpo?.assistiu;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (typeof leadEmail !== "string" || !leadEmail.includes("@")) {
    return NextResponse.json({ erro: "email da lead inválido" }, { status: 400 });
  }
  if (typeof assistiu !== "boolean") {
    return NextResponse.json({ erro: "valor inválido" }, { status: 400 });
  }

  try {
    await definirPresencaManualLead(leadEmail.trim().toLowerCase(), assistiu, email.trim().toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao corrigir presença da lead:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 403 });
  }
}
