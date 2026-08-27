import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buscarMembroEquipa } from "@/lib/equipa";
import { pedirLinkPessoal } from "@/lib/sala-zoom";
import { buscarWebinarFormacao } from "@/lib/webinars";

/**
 * "Quero assistir" à Formação de segunda: só para quem está em
 * equipa_afiliados. Ao contrário do fluxo público (fila assíncrona,
 * secção 7-C), pede o link ao Zoom aqui mesmo, na hora — é uma ação
 * pontual de uma pessoa de cada vez, não um lote de inscrições públicas.
 * O link devolvido passa por /api/entrar/<id>, como tudo o resto, para
 * ficar rastreado.
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
        { erro: "esta sessão é só para consultores já na equipa" },
        { status: 403 },
      );
    }

    const formacao = await buscarWebinarFormacao();
    if (!formacao) {
      return NextResponse.json(
        { erro: "não há nenhuma sessão de formação agendada de momento" },
        { status: 404 },
      );
    }
    const { rows: webinarRows } = await db().query<{
      sessao_externa_id: string;
      tipo: string;
      link_zoom: string | null;
    }>(
      `select sessao_externa_id, tipo, link_zoom from webinars where id = $1`,
      [formacao.id],
    );
    const webinarRow = webinarRows[0]!;

    const nome = membro.nome || "Consultor";
    const apelido = membro.nome || "Consultor";

    const { rows: existentes } = await db().query<{
      id: string;
      link_pessoal: string | null;
    }>(
      `select id, link_pessoal from registrations
       where webinar_id = $1 and email = $2 and cancelada_em is null`,
      [formacao.id, emailNormalizado],
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
        [formacao.id, nome, apelido, emailNormalizado],
      );
      registrationId = rows[0]!.id;
    }

    if (!linkPessoal) {
      linkPessoal =
        webinarRow.tipo === "formacao"
          ? webinarRow.link_zoom
          : await pedirLinkPessoal({
              sessao: webinarRow.sessao_externa_id,
              nome,
              apelido,
              email: emailNormalizado,
            });
      if (!linkPessoal) {
        return NextResponse.json({ erro: "esta formação ainda não tem link do Zoom definido" }, { status: 500 });
      }
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
    console.error("falha ao gerar link da formação:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível obter o link (${mensagem})` }, { status: 500 });
  }
}
