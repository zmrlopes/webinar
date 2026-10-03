import { buscarComprovativo } from "@/lib/bilhetes-convencao";

/** Abre o comprovativo de pagamento de um pedido — protegido pela Basic Auth de /api/admin/:path* (ver proxy.ts). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const comprovativo = Number.isInteger(Number(id)) ? await buscarComprovativo(Number(id)) : null;
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
