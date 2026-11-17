import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { temAcessoNovaArea } from "@/lib/consultor-nova-area-servidor";
import { calcularJornadaConsultor } from "@/lib/consultor-jornada";

/** Apenas os pontos e patamar da própria conta; não devolve dados da descendência. */
export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const json = (dados: unknown, status = 200) => NextResponse.json(dados, {status, headers: {"Cache-Control": "private, no-store"}});
  try {
    if (!(await temAcessoNovaArea(email))) return json({erro: "Acesso reservado à equipa."}, 403);
    const {rows} = await db().query<{nivel: string | null; pontos: string | null; atualizado_em: Date | null}>(
      "select nivel, pontos, atualizado_em from equipa_afiliados where email = $1", [email],
    );
    if (!rows[0]) return json({erro: "Não encontrámos esta conta na equipa."}, 403);
    const membro = rows[0];
    return json({jornada: calcularJornadaConsultor(membro.nivel, membro.pontos, membro.atualizado_em)});
  } catch (erro) {
    console.error("Falha ao carregar a jornada do consultor:", erro);
    return json({erro: "Não foi possível atualizar os teus pontos. Tenta novamente."}, 500);
  }
}
