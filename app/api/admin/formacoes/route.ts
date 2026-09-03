import { NextResponse } from "next/server";
import { criarEmailSender, notificarEquipaNovaSessao } from "@/lib/email";
import { criarFormacao } from "@/lib/webinars";

export async function POST(request: Request): Promise<Response> {
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
    const { id } = await criarFormacao({
      titulo: titulo.trim(),
      comecaEm: data,
      duracaoMinutos: Math.round(duracaoMinutos),
      linkZoom: linkZoom.trim(),
      publicoParaLeads,
    });

    try {
      await notificarEquipaNovaSessao(criarEmailSender(), {
        titulo: titulo.trim(),
        tipo: "formacao",
        sessaoExternaEm: data,
      });
    } catch (erro) {
      console.error("falha ao notificar equipa sobre nova formação:", erro);
    }

    return NextResponse.json({ id });
  } catch (erro) {
    console.error("falha ao criar formação:", erro);
    return NextResponse.json({ erro: "não foi possível criar a formação" }, { status: 500 });
  }
}
