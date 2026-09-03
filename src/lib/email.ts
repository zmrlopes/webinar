import { db } from "./db";

export interface AnexoMensagem {
  nome: string;
  conteudoBase64: string;
}

export interface Mensagem {
  destinatario: string;
  assunto: string;
  corpoTexto: string;
  anexos?: AnexoMensagem[];
}

export interface EmailSender {
  enviar(mensagem: Mensagem): Promise<void>;
}

/**
 * Implementação por omissão: só regista no log, não envia nada a sério.
 *
 * Usada como recurso (fallback) quando não há `BREVO_API_KEY` configurada —
 * ver `criarEmailSender()` mais abaixo.
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
    // Log temporário para diagnosticar emails "aceites mas nunca aparecem no
    // Brevo" — JSON.stringify expõe espaços/caracteres escondidos no
    // destinatário que um console.log normal não mostraria.
    console.log("A enviar email via Brevo, destinatário:", JSON.stringify(mensagem.destinatario));
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

    const corpo = await resposta.text();
    if (!resposta.ok) {
      throw new Error(`Brevo devolveu ${resposta.status} ao enviar email: ${corpo}`);
    }
    console.log("Brevo aceitou o email:", corpo);
  }
}

/**
 * Com BREVO_API_KEY definida, envia a sério; sem ela, só regista no log
 * (útil em desenvolvimento, sem custos nem risco de mandar email a ninguém).
 */
export function criarEmailSender(): EmailSender {
  return process.env.BREVO_API_KEY ? new BrevoEmailSender() : new ConsoleEmailSender();
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
}

export interface NotificacaoNovaSessao {
  titulo: string;
  tipo: string;
  sessaoExternaEm: Date | null;
}

/**
 * Avisa toda a equipa (equipa_afiliados) que uma nova sessão ficou
 * disponível — webinar público, formação recorrente do Patrick, ou
 * formação ad-hoc criada no admin. Não leva o link do Zoom (ninguém está
 * inscrito ainda) — só o aviso e o link para o painel do consultor, onde
 * cada um se inscreve à sua vez. Sem tabela de deduplicação própria — só é
 * chamada uma vez, no momento em que a sessão é criada/descoberta pela
 * sincronização. Uma falha a notificar uma pessoa não trava as restantes.
 */
export async function notificarEquipaNovaSessao(
  sender: EmailSender,
  sessao: NotificacaoNovaSessao,
): Promise<void> {
  const { rows } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados`,
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

  for (const r of rows) {
    try {
      await sender.enviar({
        destinatario: r.email,
        assunto: `Nova ${rotulo} disponível: "${sessao.titulo}"`,
        corpoTexto:
          `Olá ${r.nome},\n\nHá uma nova sessão disponível: "${sessao.titulo}", ${dataTexto}.\n\n` +
          `Vai ao teu painel para te inscreveres:\n${base}/consultor`,
      });
    } catch (erro) {
      console.error(`falha ao notificar ${r.email} sobre nova sessão:`, erro);
    }
  }
}
