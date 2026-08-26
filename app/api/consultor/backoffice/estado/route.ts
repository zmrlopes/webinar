import { NextResponse } from "next/server";
import { definirEstadoLead, estadoLeadValido } from "@/lib/leads";

/** Muda o estado do funil de uma lead. A posse é sempre verificada no servidor (ver definirEstadoLead) — nunca confiada ao pedido. */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const leadEmail = corpo?.leadEmail;
  const estado = corpo?.estado;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (typeof leadEmail !== "string" || !leadEmail.includes("@")) {
    return NextResponse.json({ erro: "email da lead inválido" }, { status: 400 });
  }
  if (!estadoLeadValido(estado)) {
    return NextResponse.json({ erro: "estado inválido" }, { status: 400 });
  }

  try {
    await definirEstadoLead(leadEmail.trim().toLowerCase(), estado, email.trim().toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao definir estado da lead:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 403 });
  }
}
