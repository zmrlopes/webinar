import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { guardarRespostaHotel, type TipoQuarto } from "@/lib/hotel";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const querQuarto = corpo?.querQuarto;
  const tipoQuartoBruto = corpo?.tipoQuarto ?? null;
  const noiteAnterior = corpo?.noiteAnterior;
  const noiteSeguinte = corpo?.noiteSeguinte;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof querQuarto !== "boolean" ||
    typeof noiteAnterior !== "boolean" ||
    typeof noiteSeguinte !== "boolean" ||
    (tipoQuartoBruto !== null && tipoQuartoBruto !== "single" && tipoQuartoBruto !== "duplo")
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  if (querQuarto && tipoQuartoBruto === null) {
    return NextResponse.json({ erro: "escolhe o tipo de quarto" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();
  const tipoQuarto = tipoQuartoBruto as TipoQuarto | null;

  try {
    // Mesma regra do formulário de preparação e dos troféus: só responde
    // quem vai ao evento. O painel de demonstração é a exceção.
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

    await guardarRespostaHotel(emailNormalizado, { querQuarto, tipoQuarto, noiteAnterior, noiteSeguinte });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar resposta do hotel:", erro);
    return NextResponse.json({ erro: "não foi possível gravar a resposta" }, { status: 500 });
  }
}
