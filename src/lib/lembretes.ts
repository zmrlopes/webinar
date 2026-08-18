import { db } from "./db";
import { enviarLembrete, type EmailSender } from "./email";

/**
 * Secção 7 / 9 do guia: o lembrete usa o mesmo link da confirmação e não
 * depende de disparar no minuto certo — a janela é larga de propósito,
 * porque o cron que o chama pode correr entre alguns minutos e horas de
 * atraso. Corre com uma cadência frequente (ex.: a cada 15-30 min); cada
 * inscrição só recebe um lembrete (secção "emails", unique por tipo).
 */
export async function processarLembretes(opts?: {
  janelaHoras?: number;
  sender: EmailSender;
}): Promise<{ enviados: number }> {
  const janelaHoras = opts?.janelaHoras ?? 3;

  const { rows } = await db().query<{ id: string }>(
    `select r.id
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.link_pessoal is not null
       and r.cancelada_em is null
       and w.cancelada_em is null
       and w.sessao_externa_em between now() and now() + ($1 || ' hours')::interval
       and not exists (
         select 1 from emails e
         where e.registration_id = r.id and e.tipo = 'lembrete'
       )`,
    [janelaHoras],
  );

  let enviados = 0;
  for (const linha of rows) {
    await enviarLembrete(opts!.sender, linha.id);
    enviados += 1;
  }
  return { enviados };
}
