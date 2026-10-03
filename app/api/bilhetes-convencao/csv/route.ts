import { chaveCsvValida, csvPedidosBilhete, listarPedidosBilhete } from "@/lib/bilhetes-convencao";

export const dynamic = "force-dynamic";

/**
 * Lido pela Google Sheet com =IMPORTDATA(...), que não sabe fazer Basic
 * Auth — por isso fica fora de /api/admin e é protegido pela chave no link.
 */
export async function GET(request: Request): Promise<Response> {
  const chave = new URL(request.url).searchParams.get("chave");
  if (!chaveCsvValida(chave)) {
    return new Response("chave inválida", { status: 403 });
  }

  const csv = csvPedidosBilhete(await listarPedidosBilhete());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
