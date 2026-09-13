import { NextResponse } from "next/server";
import { guardarDocumentoEvento } from "@/lib/eventos";

// 4MB — a Vercel rejeita o pedido inteiro acima de ~4.5MB, antes de chegar aqui.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();
    const ficheiro = dados.get("ficheiro");

    if (!(ficheiro instanceof File) || ficheiro.size === 0) {
      return NextResponse.json({ erro: "escolhe um ficheiro" }, { status: 400 });
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ erro: "o ficheiro não pode passar 4MB" }, { status: 400 });
    }

    const bytes = Buffer.from(await ficheiro.arrayBuffer());
    await guardarDocumentoEvento(
      ficheiro.name,
      ficheiro.type || "application/octet-stream",
      bytes,
    );
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao guardar documento do evento:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível gravar (${mensagem})` }, { status: 500 });
  }
}
