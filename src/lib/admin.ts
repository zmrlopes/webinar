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
  leadsInscritas: number;
  consultoresInscritos: number;
  leadsPresentes: number;
  pctLeadsPresentes: number;
  consultoresPresentes: number;
  pctConsultoresPresentes: number;
  duracaoMediaLeadsMinutos: number | null;
}

/**
 * Números globais para o topo do painel. "Consultores ativos" conta quem
 * já gerou o link pelo menos uma vez em /consultor (uma linha por
 * consultor em `links_consultor`) — não implica que tenha trazido
 * inscrições, só que já se "ativou". O resto separa leads de consultores
 * auto-inscritos, tal como já acontece na página de cada sessão.
 */
export async function buscarVisaoGeralAdmin(): Promise<VisaoGeralAdmin> {
  const { rows } = await db().query<{
    inscricoes_totais: string;
    consultores_ativos: string;
    leads_inscritas: string;
    consultores_inscritos: string;
    leads_presentes: string;
    consultores_presentes: string;
    duracao_media_leads: string | null;
  }>(
    `select
       (select count(*) from registrations where cancelada_em is null) as inscricoes_totais,
       (select count(*) from links_consultor) as consultores_ativos,
       count(*) filter (
         where r.cancelada_em is null and not exists (select 1 from equipa_afiliados ea where ea.email = r.email)
       ) as leads_inscritas,
       count(*) filter (
         where r.cancelada_em is null and exists (select 1 from equipa_afiliados ea where ea.email = r.email)
       ) as consultores_inscritos,
       count(*) filter (
         where r.cancelada_em is null and r.presenca = 'attended'
           and not exists (select 1 from equipa_afiliados ea where ea.email = r.email)
       ) as leads_presentes,
       count(*) filter (
         where r.cancelada_em is null and r.presenca = 'attended'
           and exists (select 1 from equipa_afiliados ea where ea.email = r.email)
       ) as consultores_presentes,
       avg(r.presenca_minutos) filter (
         where r.cancelada_em is null and r.presenca = 'attended' and r.presenca_minutos is not null
           and not exists (select 1 from equipa_afiliados ea where ea.email = r.email)
       ) as duracao_media_leads
     from registrations r`,
  );
  const linha = rows[0];
  const leadsInscritas = Number(linha?.leads_inscritas ?? 0);
  const consultoresInscritos = Number(linha?.consultores_inscritos ?? 0);
  const leadsPresentes = Number(linha?.leads_presentes ?? 0);
  const consultoresPresentes = Number(linha?.consultores_presentes ?? 0);
  return {
    inscricoesTotais: Number(linha?.inscricoes_totais ?? 0),
    consultoresAtivos: Number(linha?.consultores_ativos ?? 0),
    leadsInscritas,
    consultoresInscritos,
    leadsPresentes,
    pctLeadsPresentes: leadsInscritas > 0 ? Math.round((leadsPresentes / leadsInscritas) * 100) : 0,
    consultoresPresentes,
    pctConsultoresPresentes:
      consultoresInscritos > 0 ? Math.round((consultoresPresentes / consultoresInscritos) * 100) : 0,
    duracaoMediaLeadsMinutos:
      linha?.duracao_media_leads !== null && linha?.duracao_media_leads !== undefined
        ? Math.round(Number(linha.duracao_media_leads))
        : null,
  };
}

export interface DiaInscricoes {
  dia: string;
  total: number;
}

/**
 * Inscrições por dia, últimos `dias` dias — para o gráfico de barras do
 * painel. Preenche os dias sem nenhuma inscrição com 0, para o gráfico não
 * ficar com buracos.
 */
export async function listarInscricoesPorDia(dias: number): Promise<DiaInscricoes[]> {
  const { rows } = await db().query<{ dia: Date; total: string }>(
    `select date_trunc('day', criado_em) as dia, count(*) as total
     from registrations
     where cancelada_em is null and criado_em > now() - ($1 || ' days')::interval
     group by dia`,
    [dias],
  );
  const porDia = new Map(rows.map((r) => [r.dia.toISOString().slice(0, 10), Number(r.total)]));

  const resultado: DiaInscricoes[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    const chave = data.toISOString().slice(0, 10);
    resultado.push({ dia: chave, total: porDia.get(chave) ?? 0 });
  }
  return resultado;
}

export interface OrigemInscricoes {
  viaConsultor: number;
  direto: number;
  invalido: number;
}

/**
 * De onde vieram as inscrições dos últimos `dias` dias: por um link de
 * consultor válido, sem nenhuma referência (direto), ou com uma referência
 * que não corresponde a nenhum link de consultor conhecido (inválida —
 * normalmente um `?ref=` adulterado ou de um link já apagado).
 */
export async function buscarOrigemInscricoes(dias: number): Promise<OrigemInscricoes> {
  const { rows } = await db().query<{ via_consultor: string; direto: string; invalido: string }>(
    `select
       count(*) filter (where r.referencia is not null and lc.referencia is not null) as via_consultor,
       count(*) filter (where r.referencia is null) as direto,
       count(*) filter (where r.referencia is not null and lc.referencia is null) as invalido
     from registrations r
     left join links_consultor lc on lc.referencia = r.referencia
     where r.cancelada_em is null and r.criado_em > now() - ($1 || ' days')::interval`,
    [dias],
  );
  const linha = rows[0];
  return {
    viaConsultor: Number(linha?.via_consultor ?? 0),
    direto: Number(linha?.direto ?? 0),
    invalido: Number(linha?.invalido ?? 0),
  };
}

export interface LiderAdmin {
  email: string;
  nome: string;
  leadsEquipa: number;
  equipaTotal: number;
}

/**
 * Quem tem mais leads trazidas pela equipa toda (a soma de si próprio +
 * toda a descendência), entre quem tem pelo menos uma pessoa abaixo —
 * mesma lógica de buscarArvoreEquipa (src/lib/equipa.ts), mas para todo o
 * sistema de uma vez, sem partir de um email específico.
 */
export async function listarTopLideres(limite: number): Promise<LiderAdmin[]> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    upline_email: string | null;
    leads_proprios: string;
  }>(
    `select ea.email, ea.nome, ea.upline_email,
            count(r.id) filter (
              where r.cancelada_em is null and r.referencia_email = ea.email
                and not exists (select 1 from equipa_afiliados ea2 where ea2.email = r.email)
            ) as leads_proprios
     from equipa_afiliados ea
     left join registrations r on r.referencia_email = ea.email
     group by ea.email, ea.nome, ea.upline_email`,
  );

  interface No {
    email: string;
    nome: string;
    uplineEmail: string | null;
    leadsProprios: number;
    leadsEquipa: number;
    equipaTotal: number;
    filhos: No[];
  }

  const porEmail = new Map<string, No>(
    rows.map((r) => [
      r.email,
      {
        email: r.email,
        nome: r.nome,
        uplineEmail: r.upline_email,
        leadsProprios: Number(r.leads_proprios),
        leadsEquipa: 0,
        equipaTotal: 0,
        filhos: [],
      },
    ]),
  );

  const raizes: No[] = [];
  for (const no of porEmail.values()) {
    const pai = no.uplineEmail ? porEmail.get(no.uplineEmail) : undefined;
    if (pai) pai.filhos.push(no);
    else raizes.push(no); // sem upline, ou upline fora da equipa (não devia acontecer)
  }

  function somar(no: No): void {
    no.leadsEquipa = no.leadsProprios;
    no.equipaTotal = 0;
    for (const filho of no.filhos) {
      somar(filho);
      no.leadsEquipa += filho.leadsEquipa;
      no.equipaTotal += 1 + filho.equipaTotal;
    }
  }
  for (const raiz of raizes) somar(raiz);

  return [...porEmail.values()]
    .filter((no) => no.equipaTotal > 0)
    .sort((a, b) => b.leadsEquipa - a.leadsEquipa)
    .slice(0, limite)
    .map((no) => ({ email: no.email, nome: no.nome, leadsEquipa: no.leadsEquipa, equipaTotal: no.equipaTotal }));
}

export interface AtividadeRecente {
  nome: string;
  webinarTitulo: string;
  criadoEm: Date;
}

export async function listarAtividadeRecente(limite: number): Promise<AtividadeRecente[]> {
  const { rows } = await db().query<{ nome: string; titulo: string; criado_em: Date }>(
    `select r.nome, w.titulo, r.criado_em
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.cancelada_em is null
     order by r.criado_em desc
     limit $1`,
    [limite],
  );
  return rows.map((r) => ({ nome: r.nome, webinarTitulo: r.titulo, criadoEm: r.criado_em }));
}

/**
 * Avisos simples do estado do sistema — por agora só um caso concreto:
 * formações futuras sem link do Zoom definido (não deviam existir, o
 * formulário exige o link, mas fica como rede de segurança).
 */
export async function listarAlertasAdmin(): Promise<string[]> {
  const { rows } = await db().query<{ titulo: string }>(
    `select titulo from webinars
     where tipo = 'formacao' and cancelada_em is null and sessao_externa_em > now() and link_zoom is null`,
  );
  return rows.map((r) => `A formação "${r.titulo}" ainda não tem link do Zoom definido.`);
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
