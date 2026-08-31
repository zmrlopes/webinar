import { NextResponse } from "next/server";
import { guardarLinkConsultor, referenciaSemColisao } from "@/lib/consultor";
import { db } from "@/lib/db";
import { criarEmailSender, enviarConfirmacao } from "@/lib/email";
import { buscarMembroEquipa } from "@/lib/equipa";
import { gerarSlug } from "@/lib/slug";
import { buscarProximoWebinarPublico, buscarWebinarFormacao, listarFormacoesEquipa } from "@/lib/webinars";

/**
 * Identifica o consultor no backoffice: valida o email em `equipa_afiliados`
 * (a equipa real, importada do CSV da plataforma de afiliados por
 * scripts/importar-equipa.ts — não a Brevo, que também tem emails de leads
 * que nunca deviam entrar aqui), garante o link de partilha dele (upsert
 * silencioso — ao contrário de /api/consultor/link, nunca envia email; é só
 * para mostrar já no ecrã) e devolve a próxima sessão pública, para o
 * cartão de entrar diretamente no webinar.
 *
 * Também garante o email de confirmação para quem já está inscrito numa
 * sessão (link_pessoal já obtido) — enviarConfirmacao já deduplica, por
 * isso é seguro chamar sempre. Sem isto, alguém que se tinha inscrito antes
 * desta funcionalidade existir (ou que nunca chegou a clicar em "Entrar"
 * depois de já estar inscrito) ficava com o cartão a dizer "o link também
 * ficou no teu email" sem o email alguma vez ter sido enviado.
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

    const [formacao, proximoWebinar, formacoesEquipa] = await Promise.all([
      buscarWebinarFormacao(),
      buscarProximoWebinarPublico(),
      listarFormacoesEquipa(),
    ]);

    const sender = criarEmailSender();

    async function jaInscrito(webinarId: string): Promise<boolean> {
      const { rows } = await db().query<{ id: string }>(
        `select id from registrations
         where webinar_id = $1 and email = $2 and cancelada_em is null and link_pessoal is not null`,
        [webinarId, emailNormalizado],
      );
      const registrationId = rows[0]?.id;
      if (!registrationId) return false;
      try {
        await enviarConfirmacao(sender, registrationId);
      } catch (erroEmail) {
        console.error("falha ao (re)enviar confirmação ao identificar consultor:", erroEmail);
      }
      return true;
    }

    const [inscritoProximoWebinar, inscritoFormacao, formacoesEquipaInscritas] = await Promise.all([
      proximoWebinar ? jaInscrito(proximoWebinar.id) : Promise.resolve(false),
      formacao ? jaInscrito(formacao.id) : Promise.resolve(false),
      Promise.all(formacoesEquipa.map((f) => jaInscrito(f.id))),
    ]);

    return NextResponse.json({
      nome: membro.nome,
      link,
      ehConsultorEquipa: true,
      formacao: formacao
        ? { titulo: formacao.titulo, sessaoExternaEm: formacao.sessaoExternaEm }
        : null,
      inscritoFormacao,
      proximoWebinar: proximoWebinar
        ? { titulo: proximoWebinar.titulo, sessaoExternaEm: proximoWebinar.sessaoExternaEm }
        : null,
      inscritoProximoWebinar,
      formacoesEquipa: formacoesEquipa.map((f, i) => ({
        id: f.id,
        titulo: f.titulo,
        sessaoExternaEm: f.sessaoExternaEm,
        inscrito: formacoesEquipaInscritas[i],
      })),
    });
  } catch (erro) {
    console.error("falha ao identificar consultor no backoffice:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível identificar (${mensagem})` }, { status: 500 });
  }
}
