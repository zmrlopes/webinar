import { NextResponse } from "next/server";
import { removerSubscricaoPush } from "@/lib/push";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = corpo?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  await removerSubscricaoPush(endpoint);
  return NextResponse.json({ ok: true });
}
