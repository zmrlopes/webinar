import { NextResponse } from "next/server";
import { CABECALHOS_CORS, respostaOptionsCors } from "../../../../src/lib/cors";
import { procurarLinkConsultor } from "@/lib/consultor";

export async function OPTIONS(): Promise<Response> {
  return respostaOptionsCors();
}

/**
 * Só devolve o primeiro nome do consultor a partir do código curto (a
 * "referencia") — para o widget mostrar "Convite de <nome>", já que ele
 * não tem acesso direto à base de dados como a página /webinar/[id] tem.
 * Nunca devolve o email nem nenhum outro dado do consultor.
 */
export async function GET(request: Request): Promise<Response> {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ nome: null }, { status: 200, headers: CABECALHOS_CORS });
  }

  try {
    const link = await procurarLinkConsultor(ref);
    return NextResponse.json({ nome: link?.nome ?? null }, { status: 200, headers: CABECALHOS_CORS });
  } catch (erro) {
    console.error("falha ao procurar nome do consultor:", erro);
    return NextResponse.json({ nome: null }, { status: 200, headers: CABECALHOS_CORS });
  }
}
