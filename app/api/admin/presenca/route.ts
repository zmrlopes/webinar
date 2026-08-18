import { NextResponse } from "next/server";
import { corrigirPresencaManualmente } from "@/lib/admin";

const PRESENCAS_VALIDAS = new Set(["unknown", "attended", "absent"]);

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const registrationId = corpo?.registrationId;
  const presenca = corpo?.presenca;
  const minutos = corpo?.minutos;

  if (
    typeof registrationId !== "string" ||
    typeof presenca !== "string" ||
    !PRESENCAS_VALIDAS.has(presenca) ||
    (minutos !== null && minutos !== undefined && typeof minutos !== "number")
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  await corrigirPresencaManualmente(
    registrationId,
    presenca as "unknown" | "attended" | "absent",
    typeof minutos === "number" ? minutos : null,
  );

  return NextResponse.json({ ok: true });
}
