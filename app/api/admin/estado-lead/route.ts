import { NextResponse } from "next/server";
import { definirEstadoLeadAdmin, estadoLeadValido } from "@/lib/leads";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const leadEmail = corpo?.leadEmail;
  const estado = corpo?.estado;

  if (typeof leadEmail !== "string" || !estadoLeadValido(estado)) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  await definirEstadoLeadAdmin(leadEmail, estado);

  return NextResponse.json({ ok: true });
}
