import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criarEmailSender, enviarConfirmacao } from "@/lib/email";
import { buscarMembroEquipa } from "@/lib/equipa";
import { pedirLinkPessoal, SalaError } from "@/lib/sala-zoom";
import { buscarWebinarFormacao } from "@/lib/webinars";

/**
 * "Quero assistir" a uma formação: só para quem está em equipa_afiliados.
 * Sem `webinarId` no corpo, usa a Formação de segunda recorrente do Patrick
 * (`buscarWebinarFormacao`); com `webinarId`, entra numa formação ad-hoc
 * específica escolhida na lista "Outras formações" do painel (pode haver
 * várias em simultâneo). Ao contrário do fluxo público (fila assíncrona,
 * secção 7-C), pede o link ao Zoom aqui mesmo, na hora — é uma ação
 * pontual de uma pessoa de cada vez, não um lote de inscrições públicas.
 * O link devolvido passa por /api/entrar/<id>, como tudo o resto, para
 * ficar rastreado. Envia sempre o email de confirmação com esse link
 * (enviarConfirmacao já deduplica) — garante que a pessoa fica com o link
 * na caixa de correio mesmo que só volte a "entrar" já depois da sessão
 * ter começado.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const webinarId = corpo?.webinarId;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (webinarId !== undefined && typeof webinarId !== "string") {
    return NextResponse.json({ erro: "webinarId inválido" }, { status: 400 });
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

    let webinarRow: { id: string; sessao_externa_id: string; tipo: string; link_zoom: string | null };
    if (webinarId) {
      const { rows } = await db().query<{
        id: string;
        sessao_externa_id: string;
        tipo: string;
        link_zoom: string | null;
      }>(
        `select id, sessao_externa_id, tipo, link_zoom from webinars
         where id = $1 and tipo = 'formacao' and not publico_para_leads and cancelada_em is null`,
        [webinarId],
      );
      if (!rows[0]) {
        return NextResponse.json({ erro: "formação não encontrada" }, { status: 404 });
      }
      webinarRow = rows[0];
    } else {
      const formacao = await buscarWebinarFormacao();
      if (!formacao) {
        return NextResponse.json(
          { erro: "não há nenhuma sessão de formação agendada de momento" },
          { status: 404 },
        );
      }
      const { rows } = await db().query<{
        id: string;
        sessao_externa_id: string;
        tipo: string;
        link_zoom: string | null;
      }>(
        `select id, sessao_externa_id, tipo, link_zoom from webinars where id = $1`,
        [formacao.id],
      );
      webinarRow = rows[0]!;
    }

    const nome = membro.nome || "Consultor";
    const apelido = membro.nome || "Consultor";

    // Upsert atómico (não select-depois-insert) — dois cliques rápidos em
    // "Entrar na formação" não podem criar duas inscrições em simultâneo;
    // a unique index parcial (migração 020) garante isso mesmo com dois
    // pedidos ao mesmo tempo.
    const { rows: gravado } = await db().query<{ id: string; link_pessoal: string | null }>(
      `insert into registrations
         (webinar_id, nome, apelido, email, referencia, telemovel,
          referencia_email, consentimento_privacidade_em, link_estado, presenca)
       values ($1, $2, $3, $4, null, null, null, now(), 'pendente', 'unknown')
       on conflict (webinar_id, email) where cancelada_em is null
         do update set webinar_id = excluded.webinar_id
       returning id, link_pessoal`,
      [webinarRow.id, nome, apelido, emailNormalizado],
    );
    const registrationId = gravado[0]!.id;
    let linkPessoal = gravado[0]!.link_pessoal;

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

    try {
      await enviarConfirmacao(criarEmailSender(), registrationId);
    } catch (erroEmail) {
      console.error("falha ao enviar confirmação da formação ao consultor:", erroEmail);
    }

    const host = request.headers.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    return NextResponse.json({ url: `${protocolo}://${host}/api/entrar/${registrationId}` });
  } catch (erro) {
    console.error("falha ao gerar link da formação:", erro);
    if (erro instanceof SalaError && erro.estado === 404) {
      return NextResponse.json(
        { erro: "esta sessão já começou — já não é possível pedir um link novo por aqui" },
        { status: 409 },
      );
    }
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível obter o link (${mensagem})` }, { status: 500 });
  }
}
