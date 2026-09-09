import { NextResponse } from "next/server";
import { adicionarConhecimentoObjecaoPdf } from "@/lib/objecoes";

const TAMANHO_MAXIMO_PDF = 8 * 1024 * 1024; // 8MB — margem sob o limite de payload do Vercel

export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();
    const titulo = dados.get("titulo");
    const pdf = dados.get("pdf");

    if (typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ erro: "título é obrigatório" }, { status: 400 });
    }
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
    const resultado = await adicionarConhecimentoObjecaoPdf(titulo.trim(), pdfBytes, pdf.name);
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao adicionar conhecimento de objeções a partir de PDF:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível gravar (${mensagem})` }, { status: 500 });
  }
}
