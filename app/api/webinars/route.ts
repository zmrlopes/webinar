import { NextResponse } from "next/server";
import { CABECALHOS_CORS, respostaOptionsCors } from "../../../src/lib/cors";
import { listarWebinarsFuturos } from "../../../src/lib/webinars";

export async function OPTIONS(): Promise<Response> {
  return respostaOptionsCors();
}

export async function GET(): Promise<Response> {
  const webinars = await listarWebinarsFuturos();
  return NextResponse.json(
    {
      webinars: webinars.map((w) => ({
        id: w.id,
        titulo: w.titulo,
        comecaEm: w.sessaoExternaEm,
        duracaoMinutos: w.duracaoMinutos,
      })),
    },
    { headers: CABECALHOS_CORS },
  );
}
