import { NextResponse } from "next/server";
import { guardarSubscricaoPush } from "@/lib/push";

interface CorpoSubscricao {
  email?: unknown;
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as CorpoSubscricao | null;
  const email = corpo?.email;
  const endpoint = corpo?.endpoint;
  const p256dh = corpo?.keys?.p256dh;
  const auth = corpo?.keys?.auth;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  try {
    await guardarSubscricaoPush(email.trim().toLowerCase(), endpoint, p256dh, auth);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao guardar subscrição push:", erro);
    return NextResponse.json({ erro: "não foi possível guardar" }, { status: 500 });
  }
}
