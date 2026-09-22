import { NextResponse } from "next/server";
import { corrigirRespostaTrofeus } from "@/lib/trofeus";

function listaDeTexto(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  return valor.every((v) => typeof v === "string") ? (valor as string[]) : null;
}

/** Correção manual de uma resposta já existente — ver corrigirRespostaTrofeus. */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const quero = listaDeTexto(corpo?.quero);
  const jaTenho = listaDeTexto(corpo?.jaTenho);

  if (typeof email !== "string" || !email.includes("@") || quero === null || jaTenho === null) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  try {
    await corrigirRespostaTrofeus(email.trim().toLowerCase(), quero, jaTenho);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao corrigir resposta dos troféus:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível corrigir a resposta" },
      { status: 500 },
    );
  }
}
