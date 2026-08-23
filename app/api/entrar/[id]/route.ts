import { NextResponse } from "next/server";
import { registarCliqueEntrada } from "@/lib/entrada";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O que os emails de confirmação/lembrete passam a mandar em vez do link do
 * Zoom cru: regista que a pessoa clicou (uma vez) e só depois redireciona a
 * sério. Um id inválido ou sem link ainda obtido volta para a página
 * inicial em vez de dar erro — não há nada de sensível a proteger aqui além
 * do próprio link_pessoal, que nunca aparece nesta URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!FORMATO_UUID.test(id)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const linkPessoal = await registarCliqueEntrada(id).catch((erro) => {
    console.error("falha ao registar clique de entrada:", erro);
    return null;
  });

  if (!linkPessoal) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(linkPessoal);
}
