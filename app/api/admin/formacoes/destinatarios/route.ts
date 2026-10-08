import { NextResponse } from "next/server";
import { pesquisarDestinatariosFormacao } from "@/lib/formacoes-destinatarios";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const pagina = Number(params.get("pagina") ?? 1);
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 10000) {
    return NextResponse.json({ erro: "Página inválida." }, { status: 400 });
  }
  try {
    const resultado = await pesquisarDestinatariosFormacao(params.get("pesquisa") ?? "", pagina);
    return NextResponse.json(resultado, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao pesquisar destinatários da formação:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar a lista. Tenta novamente." }, { status: 500 });
  }
}
