import { NextResponse } from "next/server";
import { guardarLinkConsultor, referenciaSemColisao } from "@/lib/consultor";
import { db } from "@/lib/db";
import { buscarMembroEquipa } from "@/lib/equipa";
import { gerarSlug } from "@/lib/slug";
import {
  buscarProximaSessaoWelcomeAboard,
  buscarProximoWebinarPublico,
  buscarWebinarFormacao,
  listarFormacoesEquipa,
} from "@/lib/webinars";
import { buscarPedidoDoConsultor } from "@/lib/bilhetes-convencao";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { estaoInscricoesAbertas } from "@/lib/eventos";
import { formacoesGravadasVisiveis } from "@/lib/formacoes-gravadas";
import { precisaResponderHotel } from "@/lib/hotel";
import { precisaResponderTeambuilding } from "@/lib/teambuilding";
import { precisaResponderTrofeus } from "@/lib/trofeus";
import { questionariosPendentes } from "@/lib/questionarios";
import { listarFormacoesExternasFuturas } from "@/lib/formacoes-externas";
import { listarWelcomeAboardDaEquipa, obterElegibilidadeWelcomeAboard } from "@/lib/welcome-aboard";

/**
 * Identifica o consultor no backoffice: valida o email em `equipa_afiliados`
 * (a equipa real, importada do CSV da plataforma de afiliados por
 * scripts/importar-equipa.ts — não a Brevo, que também tem emails de leads
 * que nunca deviam entrar aqui), garante o link de partilha dele (upsert
 * silencioso — ao contrário de /api/consultor/link, nunca envia email; é só
 * para mostrar já no ecrã) e devolve a próxima sessão pública, para o
 * cartão de entrar diretamente no webinar. Nunca envia email nenhum — só
 * quem clica em "Inscrever" (formacao/route.ts, webinar/route.ts) dispara
 * esse envio, de propósito.
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

    const [
      formacao,
      proximoWebinar,
      formacoesEquipa,
      precisaResponderTeambuildingBool,
      inscricoesEventoAbertas,
      formacoesExternas,
      welcomeAboard,
      precisaResponderTrofeusBool,
      precisaResponderHotelBool,
      pedidoConvencao,
    ] = await Promise.all([
      buscarWebinarFormacao(),
      buscarProximoWebinarPublico(),
      listarFormacoesEquipa(),
      precisaResponderTeambuilding(emailNormalizado),
      estaoInscricoesAbertas(),
      listarFormacoesExternasFuturas(),
      obterElegibilidadeWelcomeAboard(emailNormalizado),
      precisaResponderTrofeus(emailNormalizado),
      precisaResponderHotel(emailNormalizado),
      // Um problema na tabela da Convenção não deve impedir o consultor de
      // entrar no painel — o cartão mostra um aviso em vez do pedido.
      buscarPedidoDoConsultor(emailNormalizado, membro.nome).catch((erro) => {
        console.error("falha ao buscar pedido da Convenção:", erro);
        return "erro" as const;
      }),
    ]);

    // Só vale a pena ir buscar a próxima sessão a quem realmente vai ver o
    // cartão do Welcome Aboard — poupa a consulta a todos os outros
    // pedidos (a maioria dos consultores já não é elegível).
    const proximaSessaoWelcomeAboard = welcomeAboard ? await buscarProximaSessaoWelcomeAboard() : undefined;

    const equipaWelcomeAboard = await listarWelcomeAboardDaEquipa(emailNormalizado);

    // Um problema nas tabelas dos questionários não pode impedir a entrada no painel.
    const questionarios = await questionariosPendentes(emailNormalizado).catch((erro) => {
      console.error("falha ao ver questionários pendentes:", erro);
      return [];
    });

    async function jaInscrito(webinarId: string): Promise<boolean> {
      const { rows } = await db().query<{ existe: boolean }>(
        `select exists(
           select 1 from registrations
           where webinar_id = $1 and email = $2 and cancelada_em is null and link_pessoal is not null
         ) as existe`,
        [webinarId, emailNormalizado],
      );
      return rows[0]?.existe ?? false;
    }

    const [inscritoProximoWebinar, inscritoFormacao, formacoesEquipaInscritas, inscritoWelcomeAboard] =
      await Promise.all([
        proximoWebinar ? jaInscrito(proximoWebinar.id) : Promise.resolve(false),
        formacao ? jaInscrito(formacao.id) : Promise.resolve(false),
        Promise.all(formacoesEquipa.map((f) => jaInscrito(f.id))),
        proximaSessaoWelcomeAboard ? jaInscrito(proximaSessaoWelcomeAboard.id) : Promise.resolve(false),
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
      precisaResponderTeambuilding: precisaResponderTeambuildingBool,
      precisaResponderTrofeus: precisaResponderTrofeusBool,
      precisaResponderHotel: precisaResponderHotelBool,
      questionarios,
      inscricoesEventoAbertas,
      erroConvencao: pedidoConvencao === "erro",
      pedidoConvencao: pedidoConvencao === "erro"
        ? null
        : pedidoConvencao
        ? {
            bilhetes: pedidoConvencao.bilhetes,
            pagamento: pedidoConvencao.pagamento,
            comprovativoNome: pedidoConvencao.comprovativoNome,
            comprovativoEm: pedidoConvencao.comprovativoEm,
            comprovativo2Nome: pedidoConvencao.comprovativo2Nome,
            comprovativo2Em: pedidoConvencao.comprovativo2Em,
          }
        : emailNormalizado === EMAIL_PAINEL_DEMONSTRACAO
          ? // Sem pedido próprio, o painel de demonstração mostra um de exemplo.
            {
              bilhetes: 2,
              pagamento: "Só uma parte, para bloquear o lugar",
              comprovativoNome: null,
              comprovativoEm: null,
              comprovativo2Nome: null,
              comprovativo2Em: null,
            }
          : null,
      formacoesExternas: formacoesExternas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        sessaoExternaEm: f.sessaoExternaEm,
        link: f.link,
      })),
      welcomeAboard,
      equipaWelcomeAboard,
      proximaSessaoWelcomeAboard: proximaSessaoWelcomeAboard
        ? { id: proximaSessaoWelcomeAboard.id, sessaoExternaEm: proximaSessaoWelcomeAboard.sessaoExternaEm }
        : null,
      inscritoWelcomeAboard,
      formacoesGravadas: formacoesGravadasVisiveis(emailNormalizado),
    });
  } catch (erro) {
    console.error("falha ao identificar consultor no backoffice:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível identificar (${mensagem})` }, { status: 500 });
  }
}
