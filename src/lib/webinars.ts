import { db } from "./db";

export interface WebinarResumo {
  id: string;
  titulo: string;
  tipo: string;
  sessaoExternaEm: Date;
  duracaoMinutos: number;
}

export async function listarWebinarsFuturos(): Promise<WebinarResumo[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and sessao_externa_em > now()
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
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
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
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
    tipo: r.tipo,
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
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and sessao_externa_em > now() - interval '60 days'
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

/** Título exato das sessões públicas de apresentação — usado para as distinguir de sessões internas (ex: formação da equipa), já que o Patrick só nos dá o título. */
export const TITULO_WEBINAR_PUBLICO = "A tua oportunidade de negócio no turismo";

/**
 * A próxima sessão pública que ainda dá para entrar — a mais próxima no
 * tempo entre as que ainda não começaram e as que já começaram mas ainda
 * não devem ter acabado (usa `duracao_minutos` para saber quando acaba;
 * sem essa duração, assume 90 minutos por omissão). Usada pelo cartão do
 * backoffice que deixa o consultor entrar diretamente no Zoom.
 *
 * A janela fica alargada mesmo para as sessões sincronizadas do Patrick,
 * cuja API de pré-inscrição (`pedirLinkPessoal`) rejeita quem tenta
 * inscrever-se pela primeira vez depois de a sessão já ter começado
 * (404) — mas quem já tinha o link obtido de antes (já se tinha inscrito
 * ou já tinha clicado em "Entrar" antes da hora) continua a conseguir
 * entrar sem problema, porque nesse caso só reutiliza o link já guardado,
 * sem voltar a chamar a API. É só o pedido de um link novo, já depois de
 * começar, que falha — tratado com uma mensagem clara em
 * webinar/route.ts e formacao/route.ts, em vez de escondido aqui.
 */
export async function buscarProximoWebinarPublico(): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and (titulo = $1 or (tipo = 'formacao' and publico_para_leads))
       and sessao_externa_em + (coalesce(duracao_minutos, 90) * interval '1 minute') > now()
     order by sessao_externa_em asc
     limit 1`,
    [TITULO_WEBINAR_PUBLICO],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
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
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
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
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

/**
 * A sessão de formação recorrente do Patrick (só para quem já é consultor)
 * mais próxima no tempo — mesma lógica de `buscarWebinarRelevante`, mas
 * filtrada. Identificada por conter "potencial" no título (case-insensitive),
 * já que ele não dá nenhuma categoria própria. Não inclui formações ad-hoc
 * — essas têm a sua própria lista em `listarFormacoesEquipa`, porque podem
 * existir várias ao mesmo tempo e "a mais próxima no tempo" esconderia as
 * outras.
 */
export async function buscarWebinarFormacao(): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and titulo ilike '%potencial%'
     order by abs(extract(epoch from (sessao_externa_em - now())))
     limit 1`,
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  };
}

/**
 * Todas as formações ad-hoc só-para-equipa ainda por acontecer, ordenadas
 * pela mais próxima primeiro — ao contrário de `buscarWebinarFormacao`
 * (que só devolve uma), pode haver várias criadas em simultâneo e todas
 * devem aparecer no painel do consultor.
 */
export async function listarFormacoesEquipa(): Promise<WebinarResumo[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and tipo = 'formacao'
       and not publico_para_leads
       and sessao_externa_em > now()
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
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

export interface FormacaoParaEditar {
  titulo: string;
  comecaEm: Date;
  duracaoMinutos: number;
  linkZoom: string | null;
  publicoParaLeads: boolean;
}

/** Só devolve `tipo = 'formacao'` — nunca uma sessão sincronizada do Patrick. */
export async function buscarFormacaoParaEditar(id: string): Promise<FormacaoParaEditar | undefined> {
  const { rows } = await db().query<{
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
    link_zoom: string | null;
    publico_para_leads: boolean;
  }>(
    `select titulo, sessao_externa_em, duracao_minutos, link_zoom, publico_para_leads
     from webinars
     where id = $1 and tipo = 'formacao' and cancelada_em is null`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    titulo: r.titulo,
    comecaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
    linkZoom: r.link_zoom,
    publicoParaLeads: r.publico_para_leads,
  };
}

/**
 * Atualiza uma formação ad-hoc já criada — pensado para corrigir enganos
 * (ex: hora escrita errada) sem ter de cancelar e criar outra vez. Só
 * mexe em `tipo = 'formacao'`, nunca numa sessão sincronizada.
 */
export async function atualizarFormacao(id: string, dados: DadosNovaFormacao): Promise<boolean> {
  const { rowCount } = await db().query(
    `update webinars
     set titulo = $1, sessao_externa_em = $2, duracao_minutos = $3, link_zoom = $4, publico_para_leads = $5
     where id = $6 and tipo = 'formacao' and cancelada_em is null`,
    [dados.titulo, dados.comecaEm, dados.duracaoMinutos, dados.linkZoom, dados.publicoParaLeads, id],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Cancela (soft-delete, `cancelada_em`) uma formação ad-hoc — nunca uma
 * sessão sincronizada da sala do Patrick, essas são geridas só pelo
 * processo de sincronização. Só apaga aqui quem chamou já confirmou que
 * `tipo = 'formacao'` (ver a rota da API).
 */
export async function cancelarFormacao(id: string): Promise<boolean> {
  const { rowCount } = await db().query(
    `update webinars set cancelada_em = now() where id = $1 and tipo = 'formacao' and cancelada_em is null`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

export async function buscarWebinar(id: string): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, tipo, sessao_externa_em, duracao_minutos
     from webinars
     where id = $1 and cancelada_em is null and sessao_externa_id is not null`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  };
}
