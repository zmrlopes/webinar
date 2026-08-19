import { db } from "./db";

export interface Mensagem {
  destinatario: string;
  assunto: string;
  corpoTexto: string;
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
    console.log(`[email] para ${mensagem.destinatario} — ${mensagem.assunto}`);
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
    corpoTexto: `Olá ${registro.nome},\n\nO teu link pessoal de entrada:\n${registro.link_pessoal}\n\nEste link é só teu — não o partilhes.`,
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
    corpoTexto: `Olá ${registro.nome},\n\nO teu link pessoal de entrada:\n${registro.link_pessoal}\n\nEste link é só teu — não o partilhes.`,
  });

  await registarEnvio(registrationId, "lembrete");
}
