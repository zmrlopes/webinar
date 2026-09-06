import { NextResponse } from "next/server";
import { importarLinhasEquipa, parseCsvEquipa } from "@/lib/equipa-import";
import { db } from "@/lib/db";

/**
 * Mesma lógica de scripts/importar-equipa.ts, para quando não há acesso ao
 * PC para correr o script — upload do CSV direto no admin, a partir do
 * telemóvel. Protegida pela mesma Basic Auth de /api/admin/* (ver
 * proxy.ts), por isso grava logo, sem confirmação extra própria.
 */
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const ficheiro = formData?.get("ficheiro");
  if (!(ficheiro instanceof File)) {
    return NextResponse.json({ erro: "nenhum ficheiro enviado" }, { status: 400 });
  }

  const texto = await ficheiro.text();
  const { linhas, totalLinhasCru, semEmail } = parseCsvEquipa(texto);

  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "não encontrei nenhuma linha válida (com email) neste ficheiro" },
      { status: 400 },
    );
  }

  const { rows: existentes } = await db().query<{ total: string }>(
    "select count(*) as total from equipa_afiliados",
  );

  await importarLinhasEquipa(linhas);

  return NextResponse.json({
    ficheiro: ficheiro.name,
    totalLinhasCru,
    importados: linhas.length,
    ignorados: semEmail,
    jaExistiam: existentes[0]?.total ?? "0",
  });
}
