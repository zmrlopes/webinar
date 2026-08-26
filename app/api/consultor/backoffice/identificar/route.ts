import { NextResponse } from "next/server";
import { procurarContactoBrevo } from "@/lib/brevo-contatos";
import { db } from "@/lib/db";
import { guardarLinkConsultor, referenciaSemColisao } from "@/lib/consultor";
import { gerarSlug } from "@/lib/slug";
import { buscarWebinarFormacao } from "@/lib/webinars";

/**
 * Identifica o consultor no backoffice: valida o email na Brevo, garante o
 * link de partilha dele (upsert silencioso — ao contrário de
 * /api/consultor/link, nunca envia email; é só para mostrar já no ecrã) e
 * diz se está na equipa_afiliados (controla o acesso à Formação de segunda).
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const contacto = await procurarContactoBrevo(emailNormalizado);
    if (!contacto) {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }

    const nomeCompleto = [contacto.nome, contacto.apelido].filter(Boolean).join(" ").trim();
    const referenciaBase =
      gerarSlug(nomeCompleto) || gerarSlug(emailNormalizado.split("@")[0] ?? "");
    const referencia = referenciaSemColisao(referenciaBase);
    await guardarLinkConsultor(referencia, emailNormalizado, contacto.nome);

    const host = request.headers.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    const link = `${protocolo}://${host}/${referencia}`;

    const { rows } = await db().query<{ existe: boolean }>(
      `select exists(select 1 from equipa_afiliados where email = $1) as existe`,
      [emailNormalizado],
    );
    const ehConsultorEquipa = rows[0]?.existe ?? false;
    const formacao = ehConsultorEquipa ? await buscarWebinarFormacao() : undefined;

    return NextResponse.json({
      nome: contacto.nome,
      link,
      ehConsultorEquipa,
      formacao: formacao
        ? { titulo: formacao.titulo, sessaoExternaEm: formacao.sessaoExternaEm }
        : null,
    });
  } catch (erro) {
    console.error("falha ao identificar consultor no backoffice:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível identificar (${mensagem})` }, { status: 500 });
  }
}
