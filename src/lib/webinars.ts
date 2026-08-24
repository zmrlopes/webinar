import { db } from "./db";

export interface WebinarResumo {
  id: string;
  titulo: string;
  sessaoExternaEm: Date;
  duracaoMinutos: number;
}

export async function listarWebinarsFuturos(): Promise<WebinarResumo[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and sessao_externa_em > now()
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

/**
 * A sessão "relevante" agora: a mais próxima no tempo, seja no futuro
 * (ainda não aconteceu) ou no passado (acabou de acontecer) — ao contrário
 * de `listarWebinarsFuturos`, que só olha para a frente.
 *
 * Usada pelos números/relatórios do consultor (painel, árvore da equipa,
 * email de resumo): mal uma sessão termina, os consultores querem
 * continuar a ver os resultados dela, não saltar logo para a sessão
 * seguinte (que só passa a ser "relevante" quando ficar mais próxima do
 * que a que acabou de passar). O fluxo de inscrição continua a usar
 * `listarWebinarsFuturos` — nunca deve inscrever alguém numa sessão já
 * passada.
 */
export async function buscarWebinarRelevante(): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
     order by abs(extract(epoch from (sessao_externa_em - now())))
     limit 1`,
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  };
}

/**
 * Sessões para os separadores do painel do consultor: as últimas 60 dias
 * mais todas as futuras, para o consultor poder escolher ver a sessão que
 * acabou de passar ou já espreitar quem se inscreveu na próxima, em vez de
 * ficar preso à sessão "mais próxima" escolhida por `buscarWebinarRelevante`.
 * Ordem cronológica (mais antiga primeiro).
 */
export async function listarWebinarsParaPainel(): Promise<WebinarResumo[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and sessao_externa_em > now() - interval '60 days'
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

export async function buscarWebinar(id: string): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where id = $1 and cancelada_em is null and sessao_externa_id is not null`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  };
}
