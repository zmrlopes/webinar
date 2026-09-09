import { buscarPdfConhecimentoObjecao } from "@/lib/objecoes";

/** Download do PDF original de uma entrada de conhecimento — protegido pela Basic Auth de /api/admin/:path* (ver proxy.ts). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const pdf = await buscarPdfConhecimentoObjecao(id);
  if (!pdf) {
    return new Response("não encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.nome.replace(/"/g, "")}"`,
    },
  });
}
