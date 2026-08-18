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
 * O guia não prescreve uma ferramenta de email — isso é escolha de quem
 * implementa. Substitui por um `EmailSender` real (Brevo, ActiveCampaign,
 * Resend, etc.) antes de ires para produção.
 */
export class ConsoleEmailSender implements EmailSender {
  async enviar(mensagem: Mensagem): Promise<void> {
    console.log(`[email] para ${mensagem.destinatario} — ${mensagem.assunto}`);
  }
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
