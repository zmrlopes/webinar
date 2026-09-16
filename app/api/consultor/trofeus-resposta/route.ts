import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { guardarRespostaTrofeus } from "@/lib/trofeus";

function listaDeTexto(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  return valor.every((v) => typeof v === "string") ? (valor as string[]) : null;
}

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const quero = listaDeTexto(corpo?.quero);
  const jaTenho = listaDeTexto(corpo?.jaTenho);

  if (typeof email !== "string" || !email.includes("@") || quero === null || jaTenho === null) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    // Mesma regra do formulário de preparação: só responde quem vai ao
    // evento. O painel de demonstração é a exceção, para se poder testar.
    if (emailNormalizado !== EMAIL_PAINEL_DEMONSTRACAO) {
      const { rows } = await db().query<{ existe: boolean }>(
        `select exists(select 1 from evento_inscricoes where email = $1) as existe`,
        [emailNormalizado],
      );
      if (!rows[0]?.existe) {
        return NextResponse.json(
          { erro: "este questionário é só para quem se inscreveu no Teambuilding" },
          { status: 403 },
        );
      }
    }

    await guardarRespostaTrofeus(emailNormalizado, quero, jaTenho);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar resposta dos troféus:", erro);
    return NextResponse.json({ erro: "não foi possível gravar a resposta" }, { status: 500 });
  }
}
