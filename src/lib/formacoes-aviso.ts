import { configActiveCampaign } from "./activecampaign";
import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import type { EmailSender } from "./email";
import { CONDICAO_CONSULTOR_COM_PAINEL } from "./equipa";
import { formacoesGravadasPublicadas } from "./formacoes-gravadas";
import { notificarPush } from "./push";

/**
 * Aviso único à equipa (email + notificação da app) de que a secção das
 * formações gravadas já está no painel do consultor. Disparado à mão em
 * /admin/formacoes-aviso.
 */

/** O texto do aviso — único sítio a mexer para o mudar. */
function mensagemAvisoFormacoes(nome: string, base: string): { assunto: string; corpoTexto: string } {
  return {
    assunto: "🎓 Já tens as formações gravadas no teu painel",
    corpoTexto:
      `Olá${nome ? ` ${nome}` : ""},\n\n` +
      `A tua área de consultor tem uma secção nova: Formações. Estão lá as formações gravadas da ` +
      `Tropa de Elite e da iCliGo, todas num só sítio:\n\n` +
      `- Essenciais: as 7 Skills, Consultor de Excelência, Canva e mais\n` +
      `- Reservas: pesquisa de orçamentos e destinos, organizados por continente\n` +
      `- Equipa: masterclasses, Eric Worre e os cursos Be a Pro, Be a Leader e Be a Promoter\n\n` +
      `Podes pesquisar por tema ou por destino e marcar as aulas que já viste, para saberes ` +
      `sempre onde ficaste.\n\n` +
      `Entra aqui:\n${base}/consultor/formacoes\n\n` +
      `Boas formações!\nEquipa Viajar é Viver`,
  };
}

const AVISO_PUSH = {
  titulo: "Formações gravadas",
  corpo: "Já tens uma secção com as formações gravadas no teu painel de consultor.",
  url: "/consultor/formacoes",
};

export interface ResultadoAvisoFormacoes {
  enviados: number;
  falhas: number;
  /** Quantos consultores faltam avisar — 0 quando o aviso ficou completo. */
  restantes: number;
}

/** Quantos consultores com painel ainda não receberam o aviso. */
export async function contarPorAvisarFormacoes(): Promise<number> {
  const { rows } = await db().query<{ restantes: string }>(
    `select count(*) as restantes from equipa_afiliados
     where ${CONDICAO_CONSULTOR_COM_PAINEL}
       and not exists (select 1 from avisos_formacoes af where af.destinatario = equipa_afiliados.email)`,
  );
  return Number(rows[0]?.restantes ?? 0);
}

/** Quantos já foram avisados (com sucesso / com falha). */
export async function resumoAvisosFormacoes(): Promise<{ sucesso: number; falhas: number }> {
  const { rows } = await db().query<{ sucesso: string; falhas: string }>(
    `select count(*) filter (where sucesso) as sucesso, count(*) filter (where not sucesso) as falhas
     from avisos_formacoes`,
  );
  return { sucesso: Number(rows[0]?.sucesso ?? 0), falhas: Number(rows[0]?.falhas ?? 0) };
}

/**
 * Com `teste`, vai só ao painel de demonstração e não fica registado. Sem
 * `teste`, avisa até `limite` consultores com painel (ver
 * CONDICAO_CONSULTOR_COM_PAINEL) que ainda não estejam em
 * avisos_formacoes — o painel chama isto em lotes até `restantes` chegar a
 * zero, e voltar a chamar nunca repete o email a quem já o recebeu. Só
 * depois de as formações estarem publicadas.
 */
export async function avisarEquipaFormacoes(
  sender: EmailSender,
  { teste, limite }: { teste: boolean; limite: number },
): Promise<ResultadoAvisoFormacoes> {
  if (!teste && !formacoesGravadasPublicadas()) {
    throw new Error("as formações ainda só estão no painel de demonstração — publica-as antes de avisar a equipa");
  }

  const destinatarios = teste
    ? (
        await db().query<{ email: string; nome: string | null }>(
          `select $1::text as email, (select nome from equipa_afiliados where email = $1) as nome`,
          [EMAIL_PAINEL_DEMONSTRACAO],
        )
      ).rows
    : (
        await db().query<{ email: string; nome: string | null }>(
          `select email, nome from equipa_afiliados
           where ${CONDICAO_CONSULTOR_COM_PAINEL}
             and not exists (select 1 from avisos_formacoes af where af.destinatario = equipa_afiliados.email)
           order by email
           limit $1`,
          [limite],
        )
      ).rows;

  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  // Ver Mensagem.listaActiveCampaign: sem isto, quem se descansou de uma
  // lista antiga da AC nunca chega a receber o aviso.
  const lista = configActiveCampaign()?.listaConsultores;
  let enviados = 0;
  let falhas = 0;

  for (const d of destinatarios) {
    // Fora do try do email: um email falhado não pode levar atrás a
    // notificação de quem tem a app instalada.
    await notificarPush(d.email, AVISO_PUSH).catch((erroPush) =>
      console.error(`falha ao enviar push a ${d.email}:`, erroPush),
    );

    let erro: string | null = null;
    try {
      await sender.enviar({
        destinatario: d.email,
        ...mensagemAvisoFormacoes(d.nome ?? "", base),
        listaActiveCampaign: lista,
      });
      enviados += 1;
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
      falhas += 1;
      console.error(`falha ao avisar ${d.email} sobre as formações:`, e);
    }

    if (!teste) {
      await db().query(
        `insert into avisos_formacoes (destinatario, sucesso, erro) values ($1, $2, $3)
         on conflict (destinatario) do nothing`,
        [d.email, erro === null, erro],
      );
    }
  }

  return { enviados, falhas, restantes: teste ? 0 : await contarPorAvisarFormacoes() };
}
