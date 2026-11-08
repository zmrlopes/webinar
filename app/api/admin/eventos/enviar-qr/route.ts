import { NextResponse } from "next/server";
import { criarEmailSender } from "@/lib/email";
import { db } from "@/lib/db";
import { enviarEmailBilhetesEvento, type BilheteNovo } from "@/lib/eventos";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  if (typeof corpo?.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(corpo.id)) {
    return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  }
  try {
    // Os QR codes são anexos: exigem o fornecedor transacional configurado.
    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ erro: "O envio de emails com anexos não está configurado." }, { status: 503 });
    }
    const { rows } = await db().query<{ id: string; nome: string; email: string }>(
      "select id, nome, email from evento_inscricoes where id = $1", [corpo.id],
    );
    const inscricao = rows[0];
    if (!inscricao) return NextResponse.json({ erro: "Inscrição não encontrada." }, { status: 404 });
    const { rows: bilhetes } = await db().query<BilheteNovo>(
      "select id, rotulo from evento_bilhetes where inscricao_id = $1 order by rotulo", [inscricao.id],
    );
    const baseUrl = process.env.SITE_BASE_URL ?? new URL(request.url).origin;
    const emailEnviado = await enviarEmailBilhetesEvento(criarEmailSender(), baseUrl, { ...inscricao, bilhetes });
    if (!emailEnviado) return NextResponse.json({ erro: "Não foi possível enviar o email com os QR codes." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Falha no envio manual dos QR codes:", erro);
    return NextResponse.json({ erro: "Não foi possível concluir o envio. Verifica o estado antes de repetir." }, { status: 500 });
  }
}
