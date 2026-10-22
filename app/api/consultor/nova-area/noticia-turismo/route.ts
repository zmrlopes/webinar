import { NextResponse } from "next/server";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";
import { obterNoticiaTurismo } from "@/lib/noticia-turismo-servidor";
import { FontesTurismoIndisponiveis } from "@/lib/noticia-turismo";

export const maxDuration = 15;

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email : "";
  if (!podeVerNovaArea(email)) return NextResponse.json({ erro: "Esta área ainda está em preparação." }, { status: 403 });
  try {
    return NextResponse.json(await obterNoticiaTurismo(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao carregar notícia de turismo:", erro instanceof Error ? erro.message : "fonte indisponível");
    return NextResponse.json({ erro: "Não foi possível obter uma notícia recente. Tenta novamente dentro de alguns minutos.",
      ...(erro instanceof FontesTurismoIndisponiveis ? { diagnostico: erro.diagnostico } : {}),
    }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
