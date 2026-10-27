import { NextResponse } from "next/server";
import { corrigirEmailInscricaoEvento } from "@/lib/eventos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Corrige o email de uma inscrição no Teambuilding (tabela de inscrições do admin). */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = corpo?.id;
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : null;
  if (typeof id !== "string" || !UUID.test(id)) {
    return NextResponse.json({ erro: "inscrição inválida" }, { status: 400 });
  }
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (!(await corrigirEmailInscricaoEvento(id, email))) {
    return NextResponse.json({ erro: "inscrição não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
