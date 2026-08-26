import { buscarComprovativoEvento } from "@/lib/eventos";

/** Download do comprovativo de pagamento de uma inscrição no evento — protegido pela Basic Auth de /api/admin/:path* (ver proxy.ts). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const comprovativo = await buscarComprovativoEvento(id);
  if (!comprovativo) {
    return new Response("não encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(comprovativo.bytes), {
    headers: {
      "Content-Type": comprovativo.tipo,
      "Content-Disposition": `attachment; filename="${comprovativo.nome.replace(/"/g, "")}"`,
    },
  });
}
