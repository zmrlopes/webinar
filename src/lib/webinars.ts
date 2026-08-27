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

/** Título exato das sessões públicas de apresentação — usado para as distinguir de sessões internas (ex: formação da equipa), já que o Patrick só nos dá o título. */
export const TITULO_WEBINAR_PUBLICO = "A tua oportunidade de negócio no turismo";

/**
 * A próxima sessão pública (a que ainda não aconteceu, mais próxima no
 * tempo) — usada pelo cartão do backoffice que deixa o consultor entrar
 * diretamente no Zoom do webinar público, inscrevendo-se a si próprio de
 * caminho. Ao contrário de `buscarWebinarRelevante`, nunca aponta para uma
 * sessão já passada — não faz sentido "entrar" numa que já aconteceu.
 */
export async function buscarProximoWebinarPublico(): Promise<WebinarResumo | undefined> {
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
       and (titulo = $1 or (tipo = 'formacao' and publico_para_leads))
       and sessao_externa_em > now()
     order by sessao_externa_em asc
     limit 1`,
    [TITULO_WEBINAR_PUBLICO],
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
 * Sessões públicas (excluindo formação interna da equipa) para os
 * separadores da página de webinares do backoffice — mesma janela de
 * `listarWebinarsParaPainel` (últimos 60 dias + futuras), mas só do
 * webinar público.
 */
export async function listarSessoesPublicasParaPainel(): Promise<WebinarResumo[]> {
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
       and (titulo = $1 or (tipo = 'formacao' and publico_para_leads))
       and sessao_externa_em > now() - interval '60 days'
     order by sessao_externa_em asc`,
    [TITULO_WEBINAR_PUBLICO],
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

/**
 * A sessão de formação interna (só para quem já é consultor) mais próxima
 * no tempo — mesma lógica de `buscarWebinarRelevante`, mas filtrada. Junta
 * duas origens: a formação recorrente do Patrick, identificada por conter
 * "potencial" no título (case-insensitive) já que ele não dá nenhuma
 * categoria própria; e formações ad-hoc criadas em criarFormacao() com
 * `tipo = 'formacao'` e `publico_para_leads = false`.
 */
export async function buscarWebinarFormacao(): Promise<WebinarResumo | undefined> {
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
       and (titulo ilike '%potencial%' or (tipo = 'formacao' and not publico_para_leads))
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

export interface DadosNovaFormacao {
  titulo: string;
  comecaEm: Date;
  duracaoMinutos: number;
  linkZoom: string;
  publicoParaLeads: boolean;
}

/**
 * Cria uma formação ad-hoc (conta Zoom própria, não a sala partilhada do
 * Patrick) — usada pelo botão "Criar formação" no admin. `sessao_externa_id`
 * recebe um valor sintético só para satisfazer os filtros `is not null`
 * usados em todo este ficheiro (nunca é enviado a nenhuma API externa);
 * `link_zoom` é usado diretamente como link de entrada em vez de pedir um
 * link pessoal ao Patrick (ver formacao/route.ts, webinar/route.ts e
 * fila-links.ts).
 */
export async function criarFormacao(dados: DadosNovaFormacao): Promise<{ id: string }> {
  const { rows } = await db().query<{ id: string }>(
    `insert into webinars
       (titulo, sessao_externa_id, sessao_externa_em, duracao_minutos, tipo, link_zoom, publico_para_leads)
     values ($1, 'formacao-' || gen_random_uuid(), $2, $3, 'formacao', $4, $5)
     returning id`,
    [dados.titulo, dados.comecaEm, dados.duracaoMinutos, dados.linkZoom, dados.publicoParaLeads],
  );
  return { id: rows[0]!.id };
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
