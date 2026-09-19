import { db } from "./db";

/**
 * Notificações push do browser (Web Push / VAPID) — os mesmos avisos que
 * já mandamos por email (nova sessão, lead nova, lembretes) a chegar
 * também ao telemóvel, mesmo com a aplicação fechada, depois de o
 * consultor instalar a "app" (ver public/manifest.webmanifest e
 * public/sw.js) e dar permissão.
 *
 * Sem custo de infraestrutura próprio: a entrega passa pelos serviços de
 * push da Google/Apple/Mozilla, gratuitos — o nosso servidor só dispara o
 * pedido, uma vez, quando há algo para avisar. Não usa a base de dados
 * mais do que uma consulta por envio.
 */
export interface AvisoPush {
  titulo: string;
  corpo: string;
  /** Caminho para onde a notificação leva ao ser tocada, ex: "/consultor". */
  url: string;
}

interface ConfigPush {
  chavePublica: string;
  chavePrivada: string;
  assunto: string;
}

function configPush(): ConfigPush | null {
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chavePrivada = process.env.VAPID_PRIVATE_KEY;
  if (!chavePublica || !chavePrivada) return null;
  return {
    chavePublica,
    chavePrivada,
    assunto: process.env.VAPID_SUBJECT ?? "mailto:geral@viajareviver.net",
  };
}

/** Guarda ou atualiza a subscrição — upsert pelo endpoint, que é único por browser/dispositivo. */
export async function guardarSubscricaoPush(
  email: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  await db().query(
    `insert into push_subscriptions (email, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update set email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth`,
    [email, endpoint, p256dh, auth],
  );
}

export async function removerSubscricaoPush(endpoint: string): Promise<void> {
  await db().query(`delete from push_subscriptions where endpoint = $1`, [endpoint]);
}

/**
 * Envia um aviso push a todas as subscrições ativas de um email. Nunca
 * lança — uma falha de push não pode derrubar o envio do email
 * correspondente, que é quem chama isto a seguir a `sender.enviar(...)`.
 * Sem VAPID configurada, não faz nada (silenciosamente) — é uma
 * funcionalidade opcional, por cima do email que já existia.
 *
 * Uma subscrição que o browser já descartou do lado dele devolve 404/410 —
 * apagamo-la daqui, senão ficava para sempre a falhar sem servir para
 * nada.
 */
export async function notificarPush(email: string, aviso: AvisoPush): Promise<void> {
  const config = configPush();
  if (!config) return;

  const { rows } = await db().query<{ endpoint: string; p256dh: string; auth: string }>(
    `select endpoint, p256dh, auth from push_subscriptions where email = $1`,
    [email],
  );
  if (rows.length === 0) return;

  const webpush = await import("web-push");
  webpush.setVapidDetails(config.assunto, config.chavePublica, config.chavePrivada);

  const payload = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url });

  for (const r of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        payload,
      );
    } catch (erro) {
      const codigo = (erro as { statusCode?: number }).statusCode;
      if (codigo === 404 || codigo === 410) {
        await removerSubscricaoPush(r.endpoint).catch(() => {});
      } else {
        console.error(`falha ao enviar push para ${email}:`, erro);
      }
    }
  }
}
