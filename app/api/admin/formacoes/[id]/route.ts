import { NextResponse } from "next/server";
import { atualizarFormacao } from "@/lib/webinars";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const titulo = corpo?.titulo;
  const comecaEm = corpo?.comecaEm;
  const duracaoMinutos = corpo?.duracaoMinutos;
  const linkZoom = corpo?.linkZoom;
  const publicoParaLeads = corpo?.publicoParaLeads;

  if (
    typeof titulo !== "string" ||
    titulo.trim() === "" ||
    typeof comecaEm !== "string" ||
    typeof duracaoMinutos !== "number" ||
    !Number.isFinite(duracaoMinutos) ||
    duracaoMinutos <= 0 ||
    typeof linkZoom !== "string" ||
    linkZoom.trim() === "" ||
    typeof publicoParaLeads !== "boolean"
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  const data = new Date(comecaEm);
  if (Number.isNaN(data.getTime())) {
    return NextResponse.json({ erro: "data inválida" }, { status: 400 });
  }

  try {
    const atualizada = await atualizarFormacao(id, {
      titulo: titulo.trim(),
      comecaEm: data,
      duracaoMinutos: Math.round(duracaoMinutos),
      linkZoom: linkZoom.trim(),
      publicoParaLeads,
    });
    if (!atualizada) {
      return NextResponse.json({ erro: "formação não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao atualizar formação:", erro);
    return NextResponse.json({ erro: "não foi possível atualizar a formação" }, { status: 500 });
  }
}
