import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardarRespostaTeambuilding } from "@/lib/teambuilding";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const expectativa = corpo?.expectativa;
  const formacoesDesejadas = corpo?.formacoesDesejadas;
  const duvidas = corpo?.duvidas;
  const outros = corpo?.outros;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof expectativa !== "string" ||
    expectativa.trim() === "" ||
    typeof formacoesDesejadas !== "string" ||
    formacoesDesejadas.trim() === "" ||
    (duvidas !== undefined && typeof duvidas !== "string") ||
    (outros !== undefined && typeof outros !== "string")
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const { rows } = await db().query<{ existe: boolean }>(
      `select exists(select 1 from evento_inscricoes where email = $1) as existe`,
      [emailNormalizado],
    );
    if (!rows[0]?.existe) {
      return NextResponse.json(
        { erro: "este formulário é só para quem se inscreveu no Teambuilding" },
        { status: 403 },
      );
    }

    await guardarRespostaTeambuilding(emailNormalizado, {
      expectativa: expectativa.trim(),
      formacoesDesejadas: formacoesDesejadas.trim(),
      duvidas: (duvidas ?? "").trim(),
      outros: (outros ?? "").trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar resposta do teambuilding:", erro);
    return NextResponse.json({ erro: "não foi possível gravar a resposta" }, { status: 500 });
  }
}
