import { db } from "./db";
import type { EstadoLead } from "./leads";
import { TITULO_WEBINAR_PUBLICO } from "./webinars";

export interface WebinarAdmin {
  id: string;
  titulo: string;
  tipo: string;
  publicoParaLeads: boolean;
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
    publico_para_leads: boolean;
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
       w.id, w.titulo, w.tipo, w.publico_para_leads, w.sessao_externa_em, w.duracao_minutos,
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
    publicoParaLeads: r.publico_para_leads,
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

export interface VisaoGeralCategoria {
  leadsInscritas: number;
  consultoresInscritos: number;
  leadsPresentes: number;
  pctLeadsPresentes: number;
  consultoresPresentes: number;
  pctConsultoresPresentes: number;
  duracaoMediaLeadsMinutos: number | null;
}

export interface VisaoGeralPorCategoria {
  webinares: VisaoGeralCategoria;
  formacoes: VisaoGeralCategoria;
}

function categoriaVazia(): VisaoGeralCategoria {
  return {
    leadsInscritas: 0,
    consultoresInscritos: 0,
    leadsPresentes: 0,
    pctLeadsPresentes: 0,
    consultoresPresentes: 0,
    pctConsultoresPresentes: 0,
    duracaoMediaLeadsMinutos: null,
  };
}

/**
 * As mesmas métricas de `buscarVisaoGeralAdmin`, mas separadas por
 * categoria — "webinares" (o webinar público) e "formações" (tudo o resto:
 * internas + gerais juntas), para se conseguir medir a relação de quem se
 * inscreve e assiste em cada uma, sem ficarem misturadas numa soma só.
 */
export async function buscarVisaoGeralPorCategoria(): Promise<VisaoGeralPorCategoria> {
  const { rows } = await db().query<{
    categoria: "webinares" | "formacoes";
    leads_inscritas: string;
    consultores_inscritos: string;
    leads_presentes: string;
    consultores_presentes: string;
    duracao_media_leads: string | null;
  }>(
    `select
       case when w.titulo = $1 then 'webinares' else 'formacoes' end as categoria,
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
     from registrations r
     join webinars w on w.id = r.webinar_id
     group by categoria`,
    [TITULO_WEBINAR_PUBLICO],
  );

  const resultado: VisaoGeralPorCategoria = { webinares: categoriaVazia(), formacoes: categoriaVazia() };
  for (const linha of rows) {
    const leadsInscritas = Number(linha.leads_inscritas);
    const consultoresInscritos = Number(linha.consultores_inscritos);
    const leadsPresentes = Number(linha.leads_presentes);
    const consultoresPresentes = Number(linha.consultores_presentes);
    resultado[linha.categoria] = {
      leadsInscritas,
      consultoresInscritos,
      leadsPresentes,
      pctLeadsPresentes: leadsInscritas > 0 ? Math.round((leadsPresentes / leadsInscritas) * 100) : 0,
      consultoresPresentes,
      pctConsultoresPresentes:
        consultoresInscritos > 0 ? Math.round((consultoresPresentes / consultoresInscritos) * 100) : 0,
      duracaoMediaLeadsMinutos:
        linha.duracao_media_leads !== null ? Math.round(Number(linha.duracao_media_leads)) : null,
    };
  }
  return resultado;
}

export interface DiaInscricoes {
  dia: string;
  totalLeads: number;
  totalConsultores: number;
}

/**
 * Inscrições por dia, últimos `dias` dias — para o gráfico de barras do
 * painel, separadas em leads e consultores auto-inscritos (mesmo critério
 * usado em todo o resto do admin: email em equipa_afiliados). Preenche os
 * dias sem nenhuma inscrição com 0, para o gráfico não ficar com buracos.
 */
export async function listarInscricoesPorDia(dias: number): Promise<DiaInscricoes[]> {
  const { rows } = await db().query<{ dia: Date; total_leads: string; total_consultores: string }>(
    `select date_trunc('day', r.criado_em) as dia,
            count(*) filter (
              where not exists (select 1 from equipa_afiliados ea where ea.email = r.email)
            ) as total_leads,
            count(*) filter (
              where exists (select 1 from equipa_afiliados ea where ea.email = r.email)
            ) as total_consultores
     from registrations r
     where r.cancelada_em is null and r.criado_em > now() - ($1 || ' days')::interval
     group by dia`,
    [dias],
  );
  const porDia = new Map(
    rows.map((r) => [
      r.dia.toISOString().slice(0, 10),
      { totalLeads: Number(r.total_leads), totalConsultores: Number(r.total_consultores) },
    ]),
  );

  const resultado: DiaInscricoes[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    const chave = data.toISOString().slice(0, 10);
    const v = porDia.get(chave);
    resultado.push({ dia: chave, totalLeads: v?.totalLeads ?? 0, totalConsultores: v?.totalConsultores ?? 0 });
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

interface NoEquipa {
  email: string;
  nome: string;
  uplineEmail: string | null;
  leadsProprios: number;
  leadsEquipa: number;
  conversoesProprias: number;
  conversoesEquipa: number;
  equipaTotal: number;
  filhos: NoEquipa[];
}

/**
 * Monta a árvore inteira da equipa a partir de `equipa_afiliados` (ligada
 * por `upline_email`), com leads e conversões de cada pessoa já somadas
 * para baixo (leadsEquipa/conversoesEquipa = próprios + de toda a
 * descendência) — mesma lógica de buscarArvoreEquipa (src/lib/equipa.ts),
 * mas para todo o sistema de uma vez, sem partir de um email específico.
 * "Conversão" = lead trazida por essa pessoa com estado 'convertido' em
 * estados_lead (src/lib/leads.ts) — independente de a que sessão a lead
 * foi, o estado é por pessoa, não por sessão. Devolve tanto as raízes
 * (quem não tem upline dentro da equipa — os "líderes de topo") como
 * todos os nós.
 */
async function construirArvoreEquipa(): Promise<{ raizes: NoEquipa[]; todos: NoEquipa[] }> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    upline_email: string | null;
    leads_proprios: string;
    conversoes_proprias: string;
  }>(
    `select ea.email, ea.nome, ea.upline_email,
            count(r.id) filter (
              where r.cancelada_em is null and r.referencia_email = ea.email
                and not exists (select 1 from equipa_afiliados ea2 where ea2.email = r.email)
            ) as leads_proprios,
            count(distinct r.email) filter (
              where r.cancelada_em is null and r.referencia_email = ea.email
                and not exists (select 1 from equipa_afiliados ea2 where ea2.email = r.email)
                and exists (
                  select 1 from estados_lead el where el.lead_email = r.email and el.estado = 'convertido'
                )
            ) as conversoes_proprias
     from equipa_afiliados ea
     left join registrations r on r.referencia_email = ea.email
     group by ea.email, ea.nome, ea.upline_email`,
  );

  // Normalizado (minúsculas + sem espaços à volta) para a ligação
  // upline_email -> email não falhar silenciosamente por causa de
  // maiúsculas/espaços na origem dos dados (CSV importado à mão).
  const normalizar = (email: string | null): string | null => email?.trim().toLowerCase() || null;

  const porEmail = new Map<string, NoEquipa>(
    rows.map((r) => [
      normalizar(r.email)!,
      {
        email: r.email,
        nome: r.nome,
        uplineEmail: r.upline_email,
        leadsProprios: Number(r.leads_proprios),
        leadsEquipa: 0,
        conversoesProprias: Number(r.conversoes_proprias),
        conversoesEquipa: 0,
        equipaTotal: 0,
        filhos: [],
      },
    ]),
  );

  const raizes: NoEquipa[] = [];
  for (const no of porEmail.values()) {
    const pai = no.uplineEmail ? porEmail.get(normalizar(no.uplineEmail)!) : undefined;
    if (pai) pai.filhos.push(no);
    else raizes.push(no); // sem upline, ou upline fora da equipa (não devia acontecer)
  }

  function somar(no: NoEquipa): void {
    no.leadsEquipa = no.leadsProprios;
    no.conversoesEquipa = no.conversoesProprias;
    no.equipaTotal = 0;
    for (const filho of no.filhos) {
      somar(filho);
      no.leadsEquipa += filho.leadsEquipa;
      no.conversoesEquipa += filho.conversoesEquipa;
      no.equipaTotal += 1 + filho.equipaTotal;
    }
  }
  for (const raiz of raizes) somar(raiz);

  return { raizes, todos: [...porEmail.values()] };
}

export interface LiderAdmin {
  nome: string;
  leadsEquipa: number;
  pessoas: number;
}

/**
 * Só estes 4 contam como "líderes de topo" para o gráfico de equipa —
 * fixo por pedido explícito, em vez de deduzido das raízes da árvore
 * (isso dava uma raiz por cada pessoa cujo upline não está em
 * equipa_afiliados, o que são mais de 100 pessoas neste negócio, não 4).
 * Quem estiver na descendência de um destes fica com ele, mesmo que
 * estruturalmente esteja "abaixo" de outra pessoa pelo meio (ex: a Ana
 * Custódia está tecnicamente abaixo do Vitor no CSV, mas continua a ser
 * tratada como líder de topo própria).
 */
const LIDERES_TOPO: { email: string; nome: string }[] = [
  { email: "v2quadrado@gmail.com", nome: "Nós" },
  { email: "apensarnaproxima@gmail.com", nome: "Ana Custódia" },
  { email: "viajarviversonhar@gmail.com", nome: "Lara Rodrigues" },
  { email: "ludmilatravels2023@gmail.com", nome: "Ludmila" },
];

/**
 * Para cada pessoa da equipa, a que líder de topo fica associada — sobe a
 * cadeia de upline até encontrar um dos 4 emails de LIDERES_TOPO (fica com
 * o primeiro que encontrar, o mais próximo). Quem nunca bater em nenhum
 * (cadeia partida, ou upline fora da equipa antes de chegar a um dos 4)
 * cai por defeito em "Nós".
 */
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sobe a cadeia de upline de `email` até encontrar um dos 4 líderes fixos
 * (comparação normalizada — minúsculas/sem espaços — para não falhar
 * silenciosamente por causa de dados do CSV importado à mão). Quem nunca
 * bater em nenhum cai por defeito em "Nós".
 */
function subirAteLider(
  email: string,
  porEmail: Map<string, NoEquipa>,
  nomePorAncora: Map<string, string>,
): string {
  let atual: string | null = normalizarEmail(email);
  while (atual) {
    const nome = nomePorAncora.get(atual);
    if (nome) return nome;
    const upline: string | null = porEmail.get(atual)?.uplineEmail ?? null;
    atual = upline ? normalizarEmail(upline) : null;
  }
  return "Nós";
}

async function mapaLiderPorEmail(): Promise<Map<string, string>> {
  const { todos } = await construirArvoreEquipa();
  const porEmail = new Map(todos.map((no) => [normalizarEmail(no.email), no]));
  const nomePorAncora = new Map(LIDERES_TOPO.map((l) => [normalizarEmail(l.email), l.nome]));
  const resultado = new Map<string, string>();

  for (const no of todos) {
    resultado.set(no.email, subirAteLider(no.email, porEmail, nomePorAncora));
  }
  return resultado;
}

/** Quanto cada um dos 4 líderes de topo fixos trouxe de leads (si próprio + toda a descendência). */
export async function listarTopLideres(): Promise<LiderAdmin[]> {
  const { todos } = await construirArvoreEquipa();
  const porEmail = new Map(todos.map((no) => [normalizarEmail(no.email), no]));
  const nomePorAncora = new Map(LIDERES_TOPO.map((l) => [normalizarEmail(l.email), l.nome]));
  const leads = new Map(LIDERES_TOPO.map((l) => [l.nome, 0]));
  const pessoas = new Map(LIDERES_TOPO.map((l) => [l.nome, 0]));

  for (const no of todos) {
    const bucket = subirAteLider(no.email, porEmail, nomePorAncora);
    leads.set(bucket, (leads.get(bucket) ?? 0) + no.leadsProprios);
    pessoas.set(bucket, (pessoas.get(bucket) ?? 0) + 1);
  }

  return LIDERES_TOPO.map((l) => ({
    nome: l.nome,
    leadsEquipa: leads.get(l.nome) ?? 0,
    pessoas: pessoas.get(l.nome) ?? 0,
  })).sort((a, b) => b.leadsEquipa - a.leadsEquipa);
}

export interface EquipaLider {
  nome: string;
  pessoas: number;
}

/** Quantas pessoas pertencem à equipa de cada um dos 4 líderes de topo fixos. */
export async function listarEquipaPorLider(): Promise<EquipaLider[]> {
  const mapa = await mapaLiderPorEmail();
  const contagem = new Map(LIDERES_TOPO.map((l) => [l.nome, 0]));
  for (const bucket of mapa.values()) contagem.set(bucket, (contagem.get(bucket) ?? 0) + 1);
  return LIDERES_TOPO.map((l) => ({ nome: l.nome, pessoas: contagem.get(l.nome) ?? 0 })).sort(
    (a, b) => b.pessoas - a.pessoas,
  );
}

export interface ConsultoresInscritosLider {
  nome: string;
  inscritos: number;
}

/**
 * Quantos consultores de cada líder de topo se inscreveram nesta sessão
 * (auto-inscrição — email do consultor em equipa_afiliados), para o
 * gráfico dentro de cada formação.
 */
export async function listarConsultoresInscritosPorLider(
  webinarId: string,
): Promise<ConsultoresInscritosLider[]> {
  const mapa = await mapaLiderPorEmail();
  const { rows } = await db().query<{ email: string }>(
    `select r.email
     from registrations r
     where r.webinar_id = $1
       and r.cancelada_em is null
       and exists (select 1 from equipa_afiliados ea where ea.email = r.email)`,
    [webinarId],
  );
  const contagem = new Map(LIDERES_TOPO.map((l) => [l.nome, 0]));
  for (const r of rows) {
    const bucket = mapa.get(r.email) ?? "Nós";
    contagem.set(bucket, (contagem.get(bucket) ?? 0) + 1);
  }
  return LIDERES_TOPO.map((l) => ({ nome: l.nome, inscritos: contagem.get(l.nome) ?? 0 })).sort(
    (a, b) => b.inscritos - a.inscritos,
  );
}

/**
 * O mesmo que `listarConsultoresInscritosPorLider`, mas para inscrições no
 * evento (`evento_inscricoes`) em vez de webinars/formações.
 */
export async function listarConsultoresInscritosEventoPorLider(): Promise<ConsultoresInscritosLider[]> {
  const mapa = await mapaLiderPorEmail();
  const { rows } = await db().query<{ email: string }>(
    `select i.email
     from evento_inscricoes i
     where exists (select 1 from equipa_afiliados ea where ea.email = i.email)`,
  );
  const contagem = new Map(LIDERES_TOPO.map((l) => [l.nome, 0]));
  for (const r of rows) {
    const bucket = mapa.get(r.email) ?? "Nós";
    contagem.set(bucket, (contagem.get(bucket) ?? 0) + 1);
  }
  return LIDERES_TOPO.map((l) => ({ nome: l.nome, inscritos: contagem.get(l.nome) ?? 0 })).sort(
    (a, b) => b.inscritos - a.inscritos,
  );
}

export interface AssiduidadeConsultor {
  email: string;
  nome: string;
  inscricoesFormacoes: number;
  assistiu: number;
  faltou: number;
  pctFaltas: number;
}

/**
 * Assiduidade de cada consultor nas formações (tudo o que não é o webinar
 * público) em que se inscreveu a si próprio — identificado, tal como no
 * resto do painel, por `registrations.email` existir em `equipa_afiliados`.
 * "Faltou" só conta sessões com presenças já fechadas (`presencas_fechadas`)
 * — antes disso `presenca` ainda está `unknown` e não é uma falta real.
 */
export async function listarAssiduidadeFormacoesConsultores(): Promise<AssiduidadeConsultor[]> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    inscricoes_formacoes: string;
    assistiu: string;
    faltou: string;
  }>(
    `select ea.email, ea.nome,
            count(r.id) as inscricoes_formacoes,
            count(r.id) filter (where r.presenca = 'attended') as assistiu,
            count(r.id) filter (
              where w.presencas_fechadas and r.presenca <> 'attended'
            ) as faltou
     from equipa_afiliados ea
     join registrations r on r.email = ea.email
     join webinars w on w.id = r.webinar_id
     where r.cancelada_em is null and w.titulo <> $1
     group by ea.email, ea.nome
     having count(r.id) > 0`,
    [TITULO_WEBINAR_PUBLICO],
  );
  return rows.map((r) => {
    const inscricoesFormacoes = Number(r.inscricoes_formacoes);
    const faltou = Number(r.faltou);
    return {
      email: r.email,
      nome: r.nome,
      inscricoesFormacoes,
      assistiu: Number(r.assistiu),
      faltou,
      pctFaltas: inscricoesFormacoes > 0 ? Math.round((faltou / inscricoesFormacoes) * 100) : 0,
    };
  });
}

export interface AtividadeRecente {
  nome: string;
  webinarTitulo: string;
  criadoEm: Date;
}

async function listarAtividadeRecenteBase(
  limite: number,
  apenasConsultores: boolean,
): Promise<AtividadeRecente[]> {
  const condicaoConsultor = apenasConsultores
    ? "exists (select 1 from equipa_afiliados ea where ea.email = r.email)"
    : "not exists (select 1 from equipa_afiliados ea where ea.email = r.email)";
  const { rows } = await db().query<{ nome: string; titulo: string; criado_em: Date }>(
    `select r.nome, w.titulo, r.criado_em
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.cancelada_em is null and ${condicaoConsultor}
     order by r.criado_em desc
     limit $1`,
    [limite],
  );
  return rows.map((r) => ({ nome: r.nome, webinarTitulo: r.titulo, criadoEm: r.criado_em }));
}

/** Últimas inscrições de leads (não confundir com auto-inscrições de consultores). */
export async function listarAtividadeRecenteLeads(limite: number): Promise<AtividadeRecente[]> {
  return listarAtividadeRecenteBase(limite, false);
}

/** Últimas auto-inscrições de consultores (email deles próprios em equipa_afiliados). */
export async function listarAtividadeRecenteConsultores(limite: number): Promise<AtividadeRecente[]> {
  return listarAtividadeRecenteBase(limite, true);
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
  referencia: string | null;
  referenciaNome: string | null;
  ehConsultor: boolean;
  clicouZoom: boolean;
  estado: EstadoLead | null;
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
    referencia: string | null;
    referencia_nome: string | null;
    eh_consultor: boolean;
    link_zoom_clicado_em: Date | null;
    estado: EstadoLead | null;
  }>(
    `select r.id, r.nome, r.apelido, r.telemovel, r.email, r.link_estado, r.link_tentativas,
            r.link_ultimo_erro, r.presenca, r.presenca_minutos, r.referencia,
            lc.nome as referencia_nome,
            lc_proprio.referencia is not null as eh_consultor,
            r.link_zoom_clicado_em,
            el.estado
     from registrations r
     left join links_consultor lc on lc.referencia = r.referencia
     left join links_consultor lc_proprio on lc_proprio.referencia_email = r.email
     left join estados_lead el on el.lead_email = r.email
     where r.webinar_id = $1 and r.cancelada_em is null
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
    referencia: r.referencia,
    referenciaNome: r.referencia_nome,
    ehConsultor: r.eh_consultor,
    clicouZoom: r.link_zoom_clicado_em !== null,
    estado: r.estado,
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

export interface EmpreendedorAdmin {
  email: string;
  nome: string;
  conversoes: number;
  pessoas: number;
}

/**
 * Quem mais consegue que a equipa toda (a pessoa + toda a descendência)
 * traga leads e as converta — soma pela árvore abaixo, tal como
 * "Top líderes", mas por conversões em vez de leads trazidas. "Conversão"
 * é o estado 'convertido' em estados_lead (definido pelo próprio consultor
 * no seu painel, ou manualmente pelo admin — ver correcao-estado.tsx).
 * Ao contrário de "Top líderes"/"Equipa por líder", não está limitado aos
 * 4 líderes de topo — é para todos os consultores com pelo menos uma
 * conversão na equipa.
 */
export async function listarTopEmpreendedores(limite: number): Promise<EmpreendedorAdmin[]> {
  const { todos } = await construirArvoreEquipa();
  return todos
    .filter((no) => no.conversoesEquipa > 0)
    .sort((a, b) => b.conversoesEquipa - a.conversoesEquipa)
    .slice(0, limite)
    .map((no) => ({
      email: no.email,
      nome: no.nome,
      conversoes: no.conversoesEquipa,
      pessoas: no.equipaTotal + 1,
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

/**
 * Correção manual para inscrições feitas por engano (ex: uma lead numa
 * formação só-para-equipa). Soft-delete via cancelada_em, tal como
 * cancelarFormacao — nunca apaga a linha, só deixa de contar em todo o
 * lado que já filtra por `cancelada_em is null`.
 */
export async function cancelarInscricaoAdmin(registrationId: string): Promise<void> {
  await db().query(
    `update registrations set cancelada_em = now() where id = $1 and cancelada_em is null`,
    [registrationId],
  );
}
