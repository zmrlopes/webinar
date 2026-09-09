import { NextResponse } from "next/server";
import { adicionarPdfDiretrizesGerais } from "@/lib/objecoes";

// 4MB — a Vercel rejeita o pedido inteiro (sem sequer chegar a este código)
// acima de ~4.5MB, por isso tem de ficar bem abaixo disso, não perto.
const TAMANHO_MAXIMO_PDF = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();
    const pdf = dados.get("pdf");

    if (!(pdf instanceof File) || pdf.size === 0) {
      return NextResponse.json({ erro: "escolhe um ficheiro PDF" }, { status: 400 });
    }
    if (pdf.type !== "application/pdf") {
      return NextResponse.json({ erro: "o ficheiro tem de ser um PDF" }, { status: 400 });
    }
    if (pdf.size > TAMANHO_MAXIMO_PDF) {
      return NextResponse.json({ erro: "o PDF não pode passar 8MB" }, { status: 400 });
    }

    const pdfBytes = Buffer.from(await pdf.arrayBuffer());
    await adicionarPdfDiretrizesGerais(pdf.name, pdfBytes);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao adicionar PDF às diretrizes gerais de objeções:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível gravar (${mensagem})` }, { status: 500 });
  }
}
