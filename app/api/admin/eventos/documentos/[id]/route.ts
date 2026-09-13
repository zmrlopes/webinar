import { buscarDocumentoEvento } from "@/lib/eventos";

/** Download de um documento do evento — protegido pela Basic Auth de /api/admin/:path* (ver proxy.ts). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const documento = await buscarDocumentoEvento(id);
  if (!documento) {
    return new Response("não encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(documento.bytes), {
    headers: {
      "Content-Type": documento.tipo,
      "Content-Disposition": `attachment; filename="${documento.nome.replace(/"/g, "")}"`,
    },
  });
}
