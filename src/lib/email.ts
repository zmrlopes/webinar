import {
  cabecalhosActiveCampaign,
  configActiveCampaign,
  subscreverContactoNaLista,
} from "./activecampaign";
import { db } from "./db";
import { CONDICAO_CONSULTOR_COM_PAINEL } from "./equipa";
import { notificarPush } from "./push";

export interface AnexoMensagem {
  nome: string;
  conteudoBase64: string;
}

export interface Mensagem {
  destinatario: string;
  assunto: string;
  corpoTexto: string;
  anexos?: AnexoMensagem[];
  /**
   * Lista da ActiveCampaign onde o destinatário tem de estar subscrito para
   * este email lhe chegar. Na AC o cancelamento de subscrição é por lista, e
   * uma automação não entrega a quem está descansado da lista — por isso os
   * avisos operacionais à equipa passam a lista dos consultores ativos aqui
   * (ver notificarEquipaNovaSessao). Sem isto, fica como estava.
   */
  listaActiveCampaign?: string;
}

export interface EmailSender {
  enviar(mensagem: Mensagem): Promise<void>;
}

/**
 * Implementação por omissão: só regista no log, não envia nada a sério.
 *
 * Usada como recurso (fallback) quando não há nenhum fornecedor de email
 * configurado — ver `criarEmailSender()` mais abaixo.
 */
export class ConsoleEmailSender implements EmailSender {
  async enviar(mensagem: Mensagem): Promise<void> {
    const anexos =
      mensagem.anexos && mensagem.anexos.length > 0
        ? ` (anexos: ${mensagem.anexos.map((a) => a.nome).join(", ")})`
        : "";
    console.log(`[email] para ${mensagem.destinatario} — ${mensagem.assunto}${anexos}`);
  }
}

/**
 * Envia a sério, pela API transacional da Brevo (v3/smtp/email).
 * https://developers.brevo.com/reference/sendtransacemail
 */
export class BrevoEmailSender implements EmailSender {
  async enviar(mensagem: Mensagem): Promise<void> {
    const chave = process.env.BREVO_API_KEY;
    if (!chave) {
      throw new Error("variável de ambiente em falta: BREVO_API_KEY");
    }

    const base = process.env.BREVO_API_BASE_URL ?? "https://api.brevo.com";
    const resposta = await fetch(`${base}/v3/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": chave,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL ?? "geral@viajareviver.net",
          name: process.env.BREVO_SENDER_NAME ?? "Viajar é Viver",
        },
        to: [{ email: mensagem.destinatario }],
        subject: mensagem.assunto,
        textContent: mensagem.corpoTexto,
        ...(mensagem.anexos && mensagem.anexos.length > 0
          ? {
              attachment: mensagem.anexos.map((a) => ({ name: a.nome, content: a.conteudoBase64 })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`Brevo devolveu ${resposta.status} ao enviar email: ${corpo}`);
    }
  }
}

/**
 * Envia a sério, pela ActiveCampaign — não tem uma API de "enviar este email
 * agora" como a Brevo, então o truque é: atualizar dois campos do contacto
 * (assunto e corpo, já prontos como texto simples, ver
 * migrations/pastas... na conta AC) e disparar uma automação de um único
 * passo ("Enviar email" com %ASSUNTO_EMAIL% e %CORPO_EMAIL%) que lê esses
 * campos. Não suporta anexos — a ActiveCampaign não tem forma de anexar um
 * ficheiro gerado dinamicamente (como o QR code do evento) dentro de uma
 * automação, por isso `criarEmailSender()` mais abaixo manda essas
 * mensagens à Brevo mesmo que a ActiveCampaign esteja configurada.
 */
export class ActiveCampaignEmailSender implements EmailSender {
  async enviar(mensagem: Mensagem): Promise<void> {
    const config = configActiveCampaign();
    if (!config) {
      throw new Error(
        "variáveis de ambiente em falta: ACTIVECAMPAIGN_API_KEY / ACTIVECAMPAIGN_API_URL / ACTIVECAMPAIGN_AUTOMATION_ID",
      );
    }

    const cabecalhos = cabecalhosActiveCampaign(config.chave);

    const respostaContacto = await fetch(`${config.base}/api/3/contact/sync`, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({
        contact: {
          email: mensagem.destinatario,
          fieldValues: [
            { field: ACTIVECAMPAIGN_CAMPO_ASSUNTO, value: mensagem.assunto },
            { field: ACTIVECAMPAIGN_CAMPO_CORPO, value: mensagem.corpoTexto },
          ],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!respostaContacto.ok) {
      const corpo = await respostaContacto.text();
      throw new Error(`ActiveCampaign devolveu ${respostaContacto.status} ao criar/atualizar contacto: ${corpo}`);
    }
    const dadosContacto = (await respostaContacto.json()) as { contact: { id: string } };

    if (mensagem.listaActiveCampaign) {
      await subscreverContactoNaLista(config, dadosContacto.contact.id, mensagem.listaActiveCampaign);
    }

    const respostaAutomacao = await fetch(`${config.base}/api/3/contactAutomations`, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({
        contactAutomation: { contact: dadosContacto.contact.id, automation: config.automacaoId },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!respostaAutomacao.ok) {
      const corpo = await respostaAutomacao.text();
      throw new Error(`ActiveCampaign devolveu ${respostaAutomacao.status} ao disparar a automação: ${corpo}`);
    }
  }
}

/** IDs dos campos "Assunto do email (sistema)" e "Corpo do email (sistema)" criados na conta AC. */
const ACTIVECAMPAIGN_CAMPO_ASSUNTO = "33";
const ACTIVECAMPAIGN_CAMPO_CORPO = "34";

/** Manda sempre para quem sabe lidar com anexos (Brevo) — a ActiveCampaign não suporta. */
class EmailSenderComFallbackParaAnexos implements EmailSender {
  constructor(
    private readonly padrao: EmailSender,
    private readonly paraAnexos: EmailSender,
  ) {}

  async enviar(mensagem: Mensagem): Promise<void> {
    const sender = mensagem.anexos && mensagem.anexos.length > 0 ? this.paraAnexos : this.padrao;
    await sender.enviar(mensagem);
  }
}

/**
 * Com ACTIVECAMPAIGN_API_KEY/API_URL/AUTOMATION_ID definidas, envia por ali
 * (exceto emails com anexos, que vão sempre pela Brevo — ver
 * ActiveCampaignEmailSender). Sem isso, cai na Brevo sozinha como antes; sem
 * nenhuma das duas, só regista no log.
 */
export function criarEmailSender(): EmailSender {
  const brevo = process.env.BREVO_API_KEY ? new BrevoEmailSender() : null;
  const activeCampaign = configActiveCampaign() ? new ActiveCampaignEmailSender() : null;

  if (activeCampaign && brevo) return new EmailSenderComFallbackParaAnexos(activeCampaign, brevo);
  return activeCampaign ?? brevo ?? new ConsoleEmailSender();
}

interface RegistroParaEmail {
  email: string;
  nome: string;
  link_pessoal: string | null;
  titulo: string;
  sessao_externa_em: Date | null;
}

async function buscarRegistro(registrationId: string): Promise<RegistroParaEmail | undefined> {
  const { rows } = await db().query<RegistroParaEmail>(
    `select r.email, r.nome, r.link_pessoal, w.titulo, w.sessao_externa_em
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.id = $1`,
    [registrationId],
  );
  return rows[0];
}

async function jaEnviado(registrationId: string, tipo: "confirmacao" | "lembrete"): Promise<boolean> {
  const { rowCount } = await db().query(
    `select 1 from emails where registration_id = $1 and tipo = $2`,
    [registrationId, tipo],
  );
  return (rowCount ?? 0) > 0;
}

async function registarEnvio(registrationId: string, tipo: "confirmacao" | "lembrete"): Promise<void> {
  await db().query(
    `insert into emails (registration_id, tipo) values ($1, $2) on conflict do nothing`,
    [registrationId, tipo],
  );
}

/**
 * Em vez do link do Zoom cru, os emails mandam este — passa por
 * /api/entrar/<id>, que regista o clique e só depois redireciona a sério
 * (ver src/lib/entrada.ts). `SITE_BASE_URL` cobre o domínio à prova de
 * futuro; sem a variável, cai no domínio principal atual.
 */
function linkEntrada(registrationId: string): string {
  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  return `${base}/api/entrar/${registrationId}`;
}

/**
 * Secção 10 — a regra que não se quebra: nunca enviar a confirmação antes de
 * ter o `link_pessoal`. Se o campo estiver vazio, esta função não envia nada
 * — nem um email genérico, nem um "enviamos depois".
 */
export async function enviarConfirmacao(
  sender: EmailSender,
  registrationId: string,
): Promise<void> {
  const registro = await buscarRegistro(registrationId);
  if (!registro) throw new Error("inscrição não encontrada");
  if (!registro.link_pessoal) return;
  if (await jaEnviado(registrationId, "confirmacao")) return;

  await sender.enviar({
    destinatario: registro.email,
    assunto: `A tua entrada para "${registro.titulo}"`,
    corpoTexto: `Olá ${registro.nome},\n\nO teu link pessoal de entrada:\n${linkEntrada(registrationId)}\n\nEste link é só teu — não o partilhes.`,
  });
  await notificarPush(registro.email, {
    titulo: "Inscrição confirmada",
    corpo: `"${registro.titulo}" — o teu link de entrada já está pronto.`,
    url: `/api/entrar/${registrationId}`,
  }).catch((erro) => console.error(`falha ao enviar push a ${registro.email}:`, erro));

  await registarEnvio(registrationId, "confirmacao");
}

/** Mesma regra do link: sem `link_pessoal`, sem lembrete. */
export async function enviarLembrete(
  sender: EmailSender,
  registrationId: string,
): Promise<void> {
  const registro = await buscarRegistro(registrationId);
  if (!registro) throw new Error("inscrição não encontrada");
  if (!registro.link_pessoal) return;
  if (await jaEnviado(registrationId, "lembrete")) return;

  await sender.enviar({
    destinatario: registro.email,
    assunto: `A sessão "${registro.titulo}" está a começar em breve`,
    corpoTexto: `Olá ${registro.nome},\n\nO teu link pessoal de entrada:\n${linkEntrada(registrationId)}\n\nEste link é só teu — não o partilhes.`,
  });
  await notificarPush(registro.email, {
    titulo: "A sessão está a começar em breve",
    corpo: `"${registro.titulo}" — toca para entrar.`,
    url: `/api/entrar/${registrationId}`,
  }).catch((erro) => console.error(`falha ao enviar push a ${registro.email}:`, erro));

  await registarEnvio(registrationId, "lembrete");
}

interface RegistroParaNotificacaoConsultor {
  nome: string;
  telemovel: string | null;
  email: string;
  referencia_email: string | null;
  titulo: string;
}

/**
 * Avisa o consultor de origem (se o link que usou tinha o email dele) de que
 * alguém se inscreveu, com os dados que o lead deixou no formulário. Corre
 * uma vez, no mesmo momento em que a inscrição obtém o link do Zoom — não
 * tem tabela de deduplicação própria porque só é chamada nesse momento único
 * (a fila nunca reprocessa uma inscrição já com link_estado = 'obtido').
 */
export async function notificarConsultorSobreLead(
  sender: EmailSender,
  registrationId: string,
): Promise<void> {
  const { rows } = await db().query<RegistroParaNotificacaoConsultor>(
    `select r.nome, r.telemovel, r.email, r.referencia_email, w.titulo
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.id = $1`,
    [registrationId],
  );
  const registro = rows[0];
  if (!registro || !registro.referencia_email) return;

  await sender.enviar({
    destinatario: registro.referencia_email,
    assunto: `Nova inscrição via o teu link — "${registro.titulo}"`,
    corpoTexto:
      `Alguém inscreveu-se em "${registro.titulo}" através do teu link:\n\n` +
      `Nome: ${registro.nome}\n` +
      `Telemóvel: ${registro.telemovel ?? "(não indicado)"}\n` +
      `Email: ${registro.email}`,
  });

  await notificarPush(registro.referencia_email, {
    titulo: "Nova inscrição pelo teu link",
    corpo: `${registro.nome} inscreveu-se em "${registro.titulo}"`,
    url: "/consultor",
  }).catch((erro) => console.error(`falha ao enviar push a ${registro.referencia_email}:`, erro));
}

export interface ResultadoNotificacaoEquipa {
  enviados: number;
  falhas: number;
  /** Quantos membros da equipa faltam avisar — 0 quando o aviso ficou completo. */
  restantes: number;
}

export interface NotificacaoNovaSessao {
  webinarId: string;
  titulo: string;
  tipo: string;
  sessaoExternaEm: Date | null;
}

/**
 * Avisa os consultores com painel (ver CONDICAO_CONSULTOR_COM_PAINEL) que
 * uma nova sessão ficou disponível — webinar público, formação recorrente do Patrick, ou
 * formação ad-hoc criada no admin. Não leva o link do Zoom (ninguém está
 * inscrito ainda) — só o aviso e o link para o painel do consultor, onde
 * cada um se inscreve à sua vez. Cada tentativa (sucesso ou falha) fica
 * registada em `notificacoes_equipa` — sem isso não havia como confirmar,
 * mesmo horas depois, se o aviso chegou a alguém (ver
 * resumoNotificacaoEquipa em src/lib/admin.ts). O `unique (webinar_id,
 * destinatario)` faz de deduplicação: chamar isto duas vezes para a mesma
 * sessão não reenvia a quem já tinha sido notificado com sucesso ou
 * falha — só falta gente nova na equipa desde a primeira vez. Uma falha a
 * notificar uma pessoa não trava as restantes.
 */
export async function notificarEquipaNovaSessao(
  sender: EmailSender,
  sessao: NotificacaoNovaSessao,
  limite?: number,
): Promise<ResultadoNotificacaoEquipa> {
  const { rows } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados
     where ${CONDICAO_CONSULTOR_COM_PAINEL}
       and not exists (
         select 1 from notificacoes_equipa ne
         where ne.webinar_id = $1 and ne.destinatario = equipa_afiliados.email
       )
     order by email
     ${limite ? "limit $2" : ""}`,
    limite ? [sessao.webinarId, limite] : [sessao.webinarId],
  );
  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  const dataTexto = sessao.sessaoExternaEm
    ? new Date(sessao.sessaoExternaEm).toLocaleString("pt-PT", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Lisbon",
      })
    : "brevemente";
  const rotulo = sessao.tipo === "formacao" ? "formação" : "webinar";
  // Ver o comentário em Mensagem.listaActiveCampaign: sem isto, quem se
  // descansou de uma lista antiga da AC nunca chega a receber este aviso.
  const listaConsultores = configActiveCampaign()?.listaConsultores;

  let enviados = 0;
  let falhas = 0;

  for (const r of rows) {
    let sucesso = true;
    let mensagemErro: string | null = null;
    try {
      await sender.enviar({
        destinatario: r.email,
        assunto: `Nova ${rotulo} disponível: "${sessao.titulo}"`,
        corpoTexto:
          `Olá ${r.nome},\n\nHá uma nova sessão disponível: "${sessao.titulo}", ${dataTexto}.\n\n` +
          `Vai ao teu painel para te inscreveres:\n${base}/consultor`,
        listaActiveCampaign: listaConsultores,
      });
      await notificarPush(r.email, {
        titulo: `Nova ${rotulo} disponível`,
        corpo: sessao.titulo,
        url: "/consultor",
      }).catch((erroPush) => console.error(`falha ao enviar push a ${r.email}:`, erroPush));
    } catch (erro) {
      sucesso = false;
      mensagemErro = erro instanceof Error ? erro.message : String(erro);
      console.error(`falha ao notificar ${r.email} sobre nova sessão:`, erro);
    }
    await db().query(
      `insert into notificacoes_equipa (webinar_id, destinatario, sucesso, erro)
       values ($1, $2, $3, $4)
       on conflict (webinar_id, destinatario) do nothing`,
      [sessao.webinarId, r.email, sucesso, mensagemErro],
    );
    if (sucesso) enviados += 1;
    else falhas += 1;
  }

  const { rows: porNotificar } = await db().query<{ restantes: string }>(
    `select count(*) as restantes from equipa_afiliados
     where ${CONDICAO_CONSULTOR_COM_PAINEL}
       and not exists (
         select 1 from notificacoes_equipa ne
         where ne.webinar_id = $1 and ne.destinatario = equipa_afiliados.email
       )`,
    [sessao.webinarId],
  );

  return { enviados, falhas, restantes: Number(porNotificar[0]?.restantes ?? 0) };
}

/**
 * Apaga o registo de quem já foi avisado sobre esta sessão, para que a
 * próxima chamada a `notificarEquipaNovaSessao` volte a avisar toda a
 * gente. É o que permite reenviar um aviso que, por um problema do lado do
 * fornecedor de email, ficou marcado como enviado sem ter chegado a
 * ninguém — sem isto a deduplicação do `unique (webinar_id, destinatario)`
 * torna o reenvio silenciosamente vazio.
 */
export async function reiniciarAvisoEquipa(webinarId: string): Promise<number> {
  const { rowCount } = await db().query(`delete from notificacoes_equipa where webinar_id = $1`, [
    webinarId,
  ]);
  return rowCount ?? 0;
}
