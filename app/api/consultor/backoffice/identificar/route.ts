import { NextResponse } from "next/server";
import { guardarLinkConsultor, referenciaSemColisao } from "@/lib/consultor";
import { buscarMembroEquipa } from "@/lib/equipa";
import { gerarSlug } from "@/lib/slug";
import { buscarProximoWebinarPublico, buscarWebinarFormacao } from "@/lib/webinars";

/**
 * Identifica o consultor no backoffice: valida o email em `equipa_afiliados`
 * (a equipa real, importada do CSV da plataforma de afiliados por
 * scripts/importar-equipa.ts — não a Brevo, que também tem emails de leads
 * que nunca deviam entrar aqui), garante o link de partilha dele (upsert
 * silencioso — ao contrário de /api/consultor/link, nunca envia email; é só
 * para mostrar já no ecrã) e devolve a próxima sessão pública, para o
 * cartão de entrar diretamente no webinar.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const membro = await buscarMembroEquipa(emailNormalizado);
    if (!membro) {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }

    const referenciaBase = gerarSlug(membro.nome) || gerarSlug(emailNormalizado.split("@")[0] ?? "");
    const referencia = referenciaSemColisao(referenciaBase);
    await guardarLinkConsultor(referencia, emailNormalizado, membro.nome);

    const host = request.headers.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    const link = `${protocolo}://${host}/${referencia}`;

    const [formacao, proximoWebinar] = await Promise.all([
      buscarWebinarFormacao(),
      buscarProximoWebinarPublico(),
    ]);

    return NextResponse.json({
      nome: membro.nome,
      link,
      ehConsultorEquipa: true,
      formacao: formacao
        ? { titulo: formacao.titulo, sessaoExternaEm: formacao.sessaoExternaEm }
        : null,
      proximoWebinar: proximoWebinar
        ? { titulo: proximoWebinar.titulo, sessaoExternaEm: proximoWebinar.sessaoExternaEm }
        : null,
    });
  } catch (erro) {
    console.error("falha ao identificar consultor no backoffice:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível identificar (${mensagem})` }, { status: 500 });
  }
}
