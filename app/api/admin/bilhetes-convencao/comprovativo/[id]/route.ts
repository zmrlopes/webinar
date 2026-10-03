import { buscarComprovativo } from "@/lib/bilhetes-convencao";

/**
 * Abre o comprovativo de pagamento de um pedido — protegido pela Basic Auth
 * de /api/admin/:path* (ver proxy.ts). ?pagamento=2 abre o do 2º pagamento.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const numero = new URL(request.url).searchParams.get("pagamento") === "2" ? 2 : 1;
  const comprovativo = Number.isInteger(Number(id)) ? await buscarComprovativo(Number(id), numero) : null;
  if (!comprovativo) {
    return new Response("não encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(comprovativo.bytes), {
    headers: {
      "Content-Type": comprovativo.tipo,
      "Content-Disposition": `inline; filename="${comprovativo.nome.replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
