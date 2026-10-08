import { NextResponse } from "next/server";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";
import { buscarMembroEquipa } from "@/lib/equipa";
import { atualizarPassoConsultor, importarProgressoConsultor } from "@/lib/progresso-consultor";
import { TOTAL_PRIMEIROS_PASSOS } from "@/lib/primeiros-passos";

async function guardar(request: Request, importar: boolean): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return NextResponse.json({ erro: "Esta área ainda está em preparação." }, { status: 403 });
  const passoValido = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= TOTAL_PRIMEIROS_PASSOS;
  if (importar ? !Array.isArray(corpo?.feitos) || corpo.feitos.length > TOTAL_PRIMEIROS_PASSOS || !corpo.feitos.every(passoValido)
    : !passoValido(corpo?.passo) || typeof corpo?.concluido !== "boolean") {
    return NextResponse.json({ erro: "Escolhe um passo válido." }, { status: 400 });
  }
  try {
    if (!await buscarMembroEquipa(email)) return NextResponse.json({ erro: "Conta não encontrada." }, { status: 403 });
    const feitos = importar ? await importarProgressoConsultor(email, corpo.feitos)
      : await atualizarPassoConsultor(email, corpo.passo, corpo.concluido);
    return NextResponse.json({ feitos }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao guardar primeiros passos:", erro);
    return NextResponse.json({ erro: "Não foi possível guardar este passo. Tenta novamente." }, { status: 500 });
  }
}

export async function POST(request: Request) { return guardar(request, true); }
export async function PATCH(request: Request) { return guardar(request, false); }
