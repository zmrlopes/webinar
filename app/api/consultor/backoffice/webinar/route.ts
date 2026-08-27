import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buscarMembroEquipa } from "@/lib/equipa";
import { pedirLinkPessoal } from "@/lib/sala-zoom";
import { buscarProximoWebinarPublico } from "@/lib/webinars";

/**
 * "Entrar na formação" do próximo webinar público, a partir do backoffice:
 * inscreve o consultor a si próprio (sem referencia_email — não é um lead,
 * é ele a assistir) e pede o link ao Zoom na hora, tal como o fluxo da
 * Formação de segunda. O link devolvido passa por /api/entrar/<id>, como
 * tudo o resto, para ficar rastreado.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const proximo = await buscarProximoWebinarPublico();
    if (!proximo) {
      return NextResponse.json({ erro: "não há sessões públicas agendadas de momento" }, { status: 404 });
    }
    const { rows: sessaoRows } = await db().query<{ sessao_externa_id: string }>(
      `select sessao_externa_id from webinars where id = $1`,
      [proximo.id],
    );
    const sessaoExternaId = sessaoRows[0]!.sessao_externa_id;

    const membro = await buscarMembroEquipa(emailNormalizado);
    if (!membro) {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }
    const nome = membro.nome || "Consultor";
    const apelido = membro.nome || "Consultor";

    const { rows: existentes } = await db().query<{
      id: string;
      link_pessoal: string | null;
    }>(
      `select id, link_pessoal from registrations
       where webinar_id = $1 and email = $2 and cancelada_em is null`,
      [proximo.id, emailNormalizado],
    );
    let registrationId = existentes[0]?.id;
    let linkPessoal = existentes[0]?.link_pessoal ?? null;

    if (!registrationId) {
      const { rows } = await db().query<{ id: string }>(
        `insert into registrations
           (webinar_id, nome, apelido, email, referencia, telemovel,
            referencia_email, consentimento_privacidade_em, link_estado, presenca)
         values ($1, $2, $3, $4, null, null, null, now(), 'pendente', 'unknown')
         returning id`,
        [proximo.id, nome, apelido, emailNormalizado],
      );
      registrationId = rows[0]!.id;
    }

    if (!linkPessoal) {
      linkPessoal = await pedirLinkPessoal({
        sessao: sessaoExternaId,
        nome,
        apelido,
        email: emailNormalizado,
      });
      await db().query(
        `update registrations
         set link_pessoal = $1, link_pedido_em = now(), link_estado = 'obtido'
         where id = $2`,
        [linkPessoal, registrationId],
      );
    }

    const host = request.headers.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    return NextResponse.json({ url: `${protocolo}://${host}/api/entrar/${registrationId}` });
  } catch (erro) {
    console.error("falha ao gerar link do webinar:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível obter o link (${mensagem})` }, { status: 500 });
  }
}
