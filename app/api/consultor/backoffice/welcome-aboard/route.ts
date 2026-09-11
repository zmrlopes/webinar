import { NextResponse } from "next/server";
import { definirSessaoWelcomeAboard } from "@/lib/welcome-aboard";

/** O próprio consultor marca a sua sessão — mesma identificação simples por email do resto do backoffice, sem posse a verificar (é sempre o email próprio). */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const sessao = corpo?.sessao;
  const concluida = corpo?.concluida;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (sessao !== 1 && sessao !== 2) {
    return NextResponse.json({ erro: "sessão inválida" }, { status: 400 });
  }
  if (typeof concluida !== "boolean") {
    return NextResponse.json({ erro: "valor inválido" }, { status: 400 });
  }

  try {
    await definirSessaoWelcomeAboard(email.trim().toLowerCase(), sessao, concluida);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao marcar sessão de welcome aboard:", erro);
    return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }
}
