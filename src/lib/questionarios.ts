import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { notificarPush } from "./push";
import { buscarQuestionario, QUESTIONARIOS, type Questionario } from "./questionarios-lista";

export * from "./questionarios-lista";

/**
 * Questionários anónimos à equipa. A resposta é gravada sem email nem hora
 * (só o dia); quem já respondeu fica registado à parte, sem ligação à
 * resposta, só para o cartão desaparecer e não haver respostas a dobrar.
 * A conta de teste (email do painel de demonstração, que é o do próprio Zé)
 * vê sempre o cartão, mas o que envia não é gravado — para não misturar as
 * respostas dele com as da equipa.
 */

export interface EstadoQuestionario {
  slug: string;
  aberto: boolean;
  pushEnviadoEm: string | null;
}

async function estados(): Promise<Map<string, EstadoQuestionario>> {
  const { rows } = await db().query<{ slug: string; aberto: boolean; push_enviado_em: string | null }>(
    `select slug, aberto, push_enviado_em from questionarios_estado`,
  );
  return new Map(rows.map((r) => [r.slug, { slug: r.slug, aberto: r.aberto, pushEnviadoEm: r.push_enviado_em }]));
}

/** Os questionários abertos que este consultor ainda não respondeu (para o cartão nos avisos). */
export async function questionariosPendentes(email: string): Promise<{ slug: string; titulo: string; chamada: string }[]> {
  // A conta de teste vê sempre o cartão dos questionários abertos (e o que
  // envia nunca é gravado — ver a rota /api/consultor/questionario).
  const demo = email === EMAIL_PAINEL_DEMONSTRACAO;
  const { rows } = await db().query<{ slug: string }>(
    `select e.slug from questionarios_estado e
      where e.aberto
        and ($2 or not exists (select 1 from questionario_participacoes p where p.slug = e.slug and p.email = $1))`,
    [email, demo],
  );
  return rows
    .map((r) => buscarQuestionario(r.slug))
    .filter((q): q is Questionario => q !== null)
    .map((q) => ({ slug: q.slug, titulo: q.titulo, chamada: q.chamada }));
}

export type ResultadoGravar = "ok" | "fechado" | "ja-respondeu";

/**
 * Grava a participação e a resposta. As duas entram juntas (para não haver
 * participação sem resposta nem o contrário), mas a resposta não leva nada
 * que a ligue ao email.
 */
export async function gravarRespostaQuestionario(
  slug: string,
  email: string,
  respostas: Record<string, string | number>,
): Promise<ResultadoGravar> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ aberto: boolean }>(`select aberto from questionarios_estado where slug = $1`, [slug]);
    if (!rows[0]?.aberto) {
      await client.query("rollback");
      return "fechado";
    }
    const part = await client.query(
      `insert into questionario_participacoes (slug, email) values ($1, $2) on conflict do nothing`,
      [slug, email],
    );
    if (part.rowCount === 0) {
      await client.query("rollback");
      return "ja-respondeu";
    }
    await client.query(`insert into questionario_respostas (slug, respostas) values ($1, $2)`, [slug, JSON.stringify(respostas)]);
    await client.query("commit");
    return "ok";
  } catch (erro) {
    await client.query("rollback").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}

export interface ResumoQuestionario {
  questionario: Questionario;
  estado: EstadoQuestionario;
  respostas: Record<string, string | number>[];
  /** Consultores ativos da equipa (sem o Zé) — a referência para a taxa de resposta. */
  equipa: number;
}

/** Tudo o que o admin vê. As respostas vêm baralhadas — a ordem não diz nada sobre quem respondeu. */
export async function listarQuestionariosAdmin(): Promise<ResumoQuestionario[]> {
  const [mapa, respostas, equipa] = await Promise.all([
    estados(),
    db().query<{ slug: string; respostas: Record<string, string | number> }>(
      `select slug, respostas from questionario_respostas order by random()`,
    ),
    db().query<{ n: string }>(
      `select count(*) as n from equipa_afiliados where estado = 'ACTIVE' and email <> $1`,
      [EMAIL_PAINEL_DEMONSTRACAO],
    ),
  ]);
  return QUESTIONARIOS.filter((q) => mapa.has(q.slug)).map((q) => ({
    questionario: q,
    estado: mapa.get(q.slug)!,
    respostas: respostas.rows.filter((r) => r.slug === q.slug).map((r) => r.respostas),
    equipa: Number(equipa.rows[0]?.n ?? 0),
  }));
}

export async function definirAberto(slug: string, aberto: boolean): Promise<void> {
  await db().query(`update questionarios_estado set aberto = $2 where slug = $1`, [slug, aberto]);
}

/**
 * Notificação no telemóvel a quem da equipa tem as notificações ativas e
 * ainda não respondeu. Devolve a quantos emails se enviou.
 */
export async function notificarQuestionario(slug: string): Promise<number> {
  const q = buscarQuestionario(slug);
  if (!q) return 0;
  const { rows } = await db().query<{ email: string }>(
    `select distinct s.email from push_subscriptions s
       join equipa_afiliados e on e.email = s.email
      where s.email <> $2
        and not exists (select 1 from questionario_participacoes p where p.slug = $1 and p.email = s.email)`,
    [slug, EMAIL_PAINEL_DEMONSTRACAO],
  );
  for (const r of rows) {
    await notificarPush(r.email, {
      titulo: "Questionário anónimo à equipa",
      corpo: "Como estás? 9 perguntas, anónimas — a tua resposta conta.",
      url: `/consultor/questionario/${slug}`,
    }).catch((erro) => console.error("falha no push do questionário:", erro));
  }
  await db().query(`update questionarios_estado set push_enviado_em = now() where slug = $1`, [slug]);
  return rows.length;
}
