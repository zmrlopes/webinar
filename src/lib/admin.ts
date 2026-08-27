import { db } from "./db";

export interface WebinarAdmin {
  id: string;
  titulo: string;
  tipo: string;
  sessaoExternaEm: Date | null;
  duracaoMinutos: number | null;
  presencasFechadas: boolean;
  totalInscritos: number;
  linksObtidos: number;
  linksPendentes: number;
  linksFalhados: number;
  presentes: number;
  mediaAssistencia: number | null;
}

/**
 * Nunca seleciona `link_pessoal` — o painel de administração não pode
 * mostrar a credencial de entrada de ninguém (secção 6 do guia).
 */
export async function listarWebinarsAdmin(): Promise<WebinarAdmin[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    tipo: string;
    sessao_externa_em: Date | null;
    duracao_minutos: number | null;
    presencas_fechadas: boolean;
    total_inscritos: string;
    links_obtidos: string;
    links_pendentes: string;
    links_falhados: string;
    presentes: string;
    media_assistencia: string | null;
  }>(
    `select
       w.id, w.titulo, w.tipo, w.sessao_externa_em, w.duracao_minutos,
       w.presencas_fechadas,
       count(r.id) filter (where r.cancelada_em is null) as total_inscritos,
       count(r.id) filter (where r.link_estado = 'obtido')   as links_obtidos,
       count(r.id) filter (where r.link_estado = 'pendente') as links_pendentes,
       count(r.id) filter (where r.link_estado = 'falhado')  as links_falhados,
       count(r.id) filter (where r.cancelada_em is null and r.presenca = 'attended') as presentes,
       avg(r.presenca_minutos) filter (
         where r.cancelada_em is null and r.presenca = 'attended' and r.presenca_minutos is not null
       ) as media_assistencia
     from webinars w
     left join registrations r on r.webinar_id = w.id
     where w.cancelada_em is null
     group by w.id
     order by w.sessao_externa_em desc nulls last`,
  );

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
    presencasFechadas: r.presencas_fechadas,
    totalInscritos: Number(r.total_inscritos),
    linksObtidos: Number(r.links_obtidos),
    linksPendentes: Number(r.links_pendentes),
    linksFalhados: Number(r.links_falhados),
    presentes: Number(r.presentes),
    mediaAssistencia:
      r.media_assistencia !== null && r.duracao_minutos
        ? Math.min(100, Math.round((Number(r.media_assistencia) / r.duracao_minutos) * 100))
        : null,
  }));
}

export interface VisaoGeralAdmin {
  inscricoesTotais: number;
  consultoresAtivos: number;
}

/**
 * Números globais para o topo do painel. "Consultores ativos" conta quem
 * já gerou o link pelo menos uma vez em /consultor (uma linha por
 * consultor em `links_consultor`) — não implica que tenha trazido
 * inscrições, só que já se "ativou".
 */
export async function buscarVisaoGeralAdmin(): Promise<VisaoGeralAdmin> {
  const { rows } = await db().query<{
    inscricoes_totais: string;
    consultores_ativos: string;
  }>(
    `select
       (select count(*) from registrations where cancelada_em is null) as inscricoes_totais,
       (select count(*) from links_consultor) as consultores_ativos`,
  );
  const linha = rows[0];
  return {
    inscricoesTotais: Number(linha?.inscricoes_totais ?? 0),
    consultoresAtivos: Number(linha?.consultores_ativos ?? 0),
  };
}

export interface InscricaoAdmin {
  id: string;
  nome: string;
  apelido: string;
  telemovel: string | null;
  email: string;
  linkEstado: "pendente" | "obtido" | "falhado";
  linkTentativas: number;
  linkUltimoErro: string | null;
  presenca: "unknown" | "attended" | "absent";
  presencaMinutos: number | null;
  cancelada: boolean;
  referencia: string | null;
  referenciaNome: string | null;
  ehConsultor: boolean;
  clicouZoom: boolean;
}

/**
 * `referenciaNome` vem de `links_consultor` (o nome que o consultor tinha
 * na Brevo quando gerou o link) — "quem convidou", em vez de só o código.
 * Fica a null quando não há correspondência (inscrição sem link de
 * consultor, ou de antes de o nome passar a ser guardado).
 *
 * `ehConsultor` distingue quem se inscreveu mas já é consultor (o email da
 * inscrição coincide com o email de alguém que já gerou o link em
 * /consultor) — é um lead a mais na lista, mas não é um lead "verdadeiro".
 */
export async function listarInscricoesAdmin(webinarId: string): Promise<InscricaoAdmin[]> {
  const { rows } = await db().query<{
    id: string;
    nome: string;
    apelido: string;
    telemovel: string | null;
    email: string;
    link_estado: "pendente" | "obtido" | "falhado";
    link_tentativas: number;
    link_ultimo_erro: string | null;
    presenca: "unknown" | "attended" | "absent";
    presenca_minutos: number | null;
    cancelada_em: Date | null;
    referencia: string | null;
    referencia_nome: string | null;
    eh_consultor: boolean;
    link_zoom_clicado_em: Date | null;
  }>(
    `select r.id, r.nome, r.apelido, r.telemovel, r.email, r.link_estado, r.link_tentativas,
            r.link_ultimo_erro, r.presenca, r.presenca_minutos, r.cancelada_em, r.referencia,
            lc.nome as referencia_nome,
            lc_proprio.referencia is not null as eh_consultor,
            r.link_zoom_clicado_em
     from registrations r
     left join links_consultor lc on lc.referencia = r.referencia
     left join links_consultor lc_proprio on lc_proprio.referencia_email = r.email
     where r.webinar_id = $1
     order by r.criado_em asc`,
    [webinarId],
  );

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    apelido: r.apelido,
    telemovel: r.telemovel,
    email: r.email,
    linkEstado: r.link_estado,
    linkTentativas: r.link_tentativas,
    linkUltimoErro: r.link_ultimo_erro,
    presenca: r.presenca,
    presencaMinutos: r.presenca_minutos,
    cancelada: r.cancelada_em !== null,
    referencia: r.referencia,
    referenciaNome: r.referencia_nome,
    ehConsultor: r.eh_consultor,
    clicouZoom: r.link_zoom_clicado_em !== null,
  }));
}

export interface ConsultorAdmin {
  referencia: string;
  nome: string | null;
  email: string;
  ativoDesde: Date;
  inscricoesTotais: number;
}

/**
 * Um consultor por linha, para quem "se ativou" pelo menos uma vez (gerou o
 * link em /consultor). `inscricoesTotais` soma inscrições de todas as
 * sessões, não só da mais próxima.
 */
export async function listarConsultoresAdmin(): Promise<ConsultorAdmin[]> {
  const { rows } = await db().query<{
    referencia: string;
    nome: string | null;
    referencia_email: string;
    atualizado_em: Date;
    inscricoes_totais: string;
  }>(
    `select lc.referencia, lc.nome, lc.referencia_email, lc.atualizado_em,
            count(r.id) filter (where r.cancelada_em is null) as inscricoes_totais
     from links_consultor lc
     left join registrations r on r.referencia_email = lc.referencia_email
     group by lc.referencia, lc.nome, lc.referencia_email, lc.atualizado_em
     order by lc.atualizado_em desc`,
  );

  return rows.map((r) => ({
    referencia: r.referencia,
    nome: r.nome,
    email: r.referencia_email,
    ativoDesde: r.atualizado_em,
    inscricoesTotais: Number(r.inscricoes_totais),
  }));
}

/**
 * Correção manual, feita por um humano. A automação (secção 7-D) só toca em
 * quem está `unknown`; esta função é a exceção deliberada a essa regra.
 */
export async function corrigirPresencaManualmente(
  registrationId: string,
  presenca: "unknown" | "attended" | "absent",
  minutos: number | null,
): Promise<void> {
  await db().query(
    `update registrations set presenca = $1, presenca_minutos = $2 where id = $3`,
    [presenca, minutos, registrationId],
  );
}
