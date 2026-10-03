import { NextResponse } from "next/server";
import { mudarEmailPedido } from "@/lib/bilhetes-convencao";

/** Liga um pedido ao email com que o consultor entra no painel — protegido pela Basic Auth do admin. */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(corpo?.id);
  const email = corpo?.email;
  if (!Number.isInteger(id) || id < 1 || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  try {
    const resultado = await mudarEmailPedido(id, email);
    if (resultado === "nao-existe") return NextResponse.json({ erro: "este pedido já não existe" }, { status: 404 });
    if (resultado === "email-ocupado") {
      return NextResponse.json({ erro: "já há outro pedido com este email" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao ligar pedido ao consultor:", erro);
    return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }
}
