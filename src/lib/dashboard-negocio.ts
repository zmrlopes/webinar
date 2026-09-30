import { db } from "./db";

/**
 * Dados do Dashboard Negócio (painel admin) lidos ao vivo da base de dados,
 * a partir de equipa_afiliados — nunca escritos no código, porque o
 * repositório é público e estes números têm nomes e faturação de pessoas.
 * A tabela é preenchida pela importação do CSV da equipa (ver
 * app/admin/equipa/importar e src/lib/equipa-import.ts).
 */

/** Patamares por ordem crescente. Quem está num patamar já ganhou o dele e os de baixo. */
const ORDEM_NIVEIS = ["JUNIOR", "SENIOR", "MASTER", "COORDENADOR", "DIRETOR"];

function normalizarNivel(nivel: string | null): string | null {
  if (!nivel) return null;
  const n = nivel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
  return ORDEM_NIVEIS.includes(n) ? n : null;
}

export interface LinhaTrofeus {
  nome: string;
  nivel: string | null;
  vendas: number;
  /** Troféus de patamar já ganhos (Júnior … o seu), por chave. */
  patamares: string[];
  /** Troféus de faturação já atingidos: 100, 250 ou 500 (milhares). */
  faturacao: number[];
}

export interface Trofeus {
  atualizadoEm: string | null;
  linhas: LinhaTrofeus[];
  /** Quantos consultores têm cada troféu, para saber quantos encomendar. */
  contagem: Record<string, number>;
}

export const NIVEIS_TROFEUS = ORDEM_NIVEIS;
export const FATURACAO_TROFEUS = [100_000, 250_000, 500_000];

// ---------------------------------------------------------------------------
// Mapas — histórico mensal (negocio_mensal) e próximo patamar (equipa_afiliados)
// ---------------------------------------------------------------------------

export const METRICAS = ["faturacao", "comissoes", "pontos", "consultores"] as const;
export type Metrica = (typeof METRICAS)[number];

export const ROTULO_METRICA: Record<Metrica, string> = {
  faturacao: "Faturação",
  comissoes: "Comissões",
  pontos: "Pontos",
  consultores: "Consultores",
};

/** true = mostra-se em euros; false = número simples (pontos, consultores). */
export const METRICA_EUROS: Record<Metrica, boolean> = {
  faturacao: true,
  comissoes: true,
  pontos: false,
  consultores: false,
};

export interface SerieMetrica {
  metrica: Metrica;
  /** Valores por mês (0..11) de cada ano, só os anos com dados. */
  porAno: Record<number, number[]>;
  ytdAtual: number;
  ytdAnterior: number;
  deltaPct: number | null;
}

export interface NegocioMensal {
  anos: number[];
  anoAtual: number | null;
  /** Índice (0..11) do último mês com dados no ano atual. */
  mesAtualIdx: number;
  series: SerieMetrica[];
  temDados: boolean;
}

/**
 * Lê negocio_mensal e organiza por métrica/ano, calculando o acumulado do ano
 * (até ao último mês com dados) e a variação face ao mesmo período do ano
 * anterior — a base dos cartões, gráficos e projeções do separador Mapas.
 */
export async function obterNegocioMensal(): Promise<NegocioMensal> {
  const { rows } = await db().query<{ metrica: string; ano: number; mes: number; valor: string }>(
    `select metrica, ano, mes, valor from negocio_mensal order by ano, mes`,
  );

  if (rows.length === 0) {
    return { anos: [], anoAtual: null, mesAtualIdx: -1, series: [], temDados: false };
  }

  const anos = [...new Set(rows.map((r) => r.ano))].sort((a, b) => a - b);
  const anoAtual = anos[anos.length - 1] ?? null;

  // Estrutura métrica -> ano -> [12]
  const mapa = new Map<string, Map<number, number[]>>();
  for (const m of METRICAS) mapa.set(m, new Map());
  for (const r of rows) {
    const porAno = mapa.get(r.metrica);
    if (!porAno) continue;
    if (!porAno.has(r.ano)) porAno.set(r.ano, Array(12).fill(0));
    const arr = porAno.get(r.ano);
    if (arr) arr[r.mes - 1] = Number(r.valor);
  }

  // Último mês com dados no ano atual (o maior índice não-zero entre as métricas).
  let mesAtualIdx = -1;
  if (anoAtual !== null) {
    for (const m of METRICAS) {
      const arr = mapa.get(m)?.get(anoAtual);
      if (!arr) continue;
      for (let i = 11; i >= 0; i--) {
        if (arr[i] !== 0) {
          mesAtualIdx = Math.max(mesAtualIdx, i);
          break;
        }
      }
    }
  }
  const through = mesAtualIdx < 0 ? 11 : mesAtualIdx;
  const anoAnterior = anoAtual !== null ? anoAtual - 1 : null;

  const series: SerieMetrica[] = METRICAS.map((metrica) => {
    const porAnoMap = mapa.get(metrica) ?? new Map<number, number[]>();
    const porAno: Record<number, number[]> = {};
    for (const [ano, arr] of porAnoMap) porAno[ano] = arr;

    const soma = (arr: number[] | undefined) =>
      arr ? arr.slice(0, through + 1).reduce((a, b) => a + b, 0) : 0;
    const ytdAtual = anoAtual !== null ? soma(porAnoMap.get(anoAtual)) : 0;
    const ytdAnterior = anoAnterior !== null ? soma(porAnoMap.get(anoAnterior)) : 0;
    const deltaPct = ytdAnterior > 0 ? ((ytdAtual - ytdAnterior) / ytdAnterior) * 100 : null;

    return { metrica, porAno, ytdAtual, ytdAnterior, deltaPct };
  });

  return { anos, anoAtual, mesAtualIdx: through, series, temDados: true };
}

/** Grava (upsert) o histórico mensal — usado pela rota de importação. */
export async function gravarNegocioMensal(
  linhas: { metrica: string; ano: number; mes: number; valor: number }[],
): Promise<number> {
  let gravadas = 0;
  for (const l of linhas) {
    if (!METRICAS.includes(l.metrica as Metrica)) continue;
    if (!Number.isInteger(l.ano) || l.mes < 1 || l.mes > 12) continue;
    if (!Number.isFinite(l.valor)) continue;
    await db().query(
      `insert into negocio_mensal (metrica, ano, mes, valor, atualizado_em)
       values ($1, $2, $3, $4, now())
       on conflict (metrica, ano, mes)
       do update set valor = excluded.valor, atualizado_em = now()`,
      [l.metrica, l.ano, l.mes, l.valor],
    );
    gravadas++;
  }
  return gravadas;
}

/**
 * Configuração/snapshot do dashboard (jsonb por chave), em dashboard_config.
 * Guarda os totais próprios do Zé para o separador Mapas — fora do código,
 * porque o repositório é público.
 */
export async function lerConfig<T = unknown>(chave: string): Promise<T | null> {
  const { rows } = await db().query<{ valor: T }>(
    `select valor from dashboard_config where chave = $1`,
    [chave],
  );
  return rows[0]?.valor ?? null;
}

export async function gravarConfig(chave: string, valor: unknown): Promise<void> {
  await db().query(
    `insert into dashboard_config (chave, valor, atualizado_em)
     values ($1, $2, now())
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
    [chave, JSON.stringify(valor)],
  );
}

/** Escada oficial do plano de carreira (patamar -> pontos mínimos). */
export const ESCADA_PATAMARES: { nome: string; pontos: number }[] = [
  { nome: "Júnior", pontos: 0 },
  { nome: "Sénior", pontos: 15 },
  { nome: "Master", pontos: 75 },
  { nome: "Coordenador", pontos: 250 },
  { nome: "Diretor", pontos: 1000 },
  { nome: "Bronze", pontos: 3500 },
  { nome: "Prata", pontos: 10000 },
  { nome: "Ouro", pontos: 30000 },
];

export interface LinhaPatamar {
  nome: string;
  nivel: string | null;
  pontos: number;
  patamarAtual: string;
  proximoPatamar: string | null;
  faltam: number | null;
}

/**
 * Contas que são do próprio Zé (a Gabriela e a Sara), a deixar de fora das
 * listas de consultores — senão apareciam como se fossem gente da equipa.
 * Comparado por nome sem acentos nem maiúsculas.
 */
const CONTAS_PROPRIAS = ["gabriela miranda", "sara miranda"];

function ehContaPropria(nome: string): boolean {
  const n = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  return CONTAS_PROPRIAS.includes(n);
}

/**
 * Os consultores ativos com mais pontos e quanto falta a cada um para o
 * patamar seguinte, pela escada oficial. Os pontos são acumulados de sempre.
 */
export async function obterProximoPatamar(limite = 10): Promise<{ linhas: LinhaPatamar[]; atualizadoEm: string | null }> {
  const { rows } = await db().query<{ nome: string; nivel: string | null; pontos: string | null; atualizado_em: string }>(
    `select nome, nivel, pontos, atualizado_em
       from equipa_afiliados
      where estado = 'ACTIVE' and pontos is not null
      order by pontos desc
      limit $1`,
    [limite + CONTAS_PROPRIAS.length],
  );

  const linhas: LinhaPatamar[] = rows
    .filter((r) => !ehContaPropria(r.nome))
    .slice(0, limite)
    .map((r) => {
    const pontos = Number(r.pontos) || 0;
    let idx = 0;
    for (let i = 0; i < ESCADA_PATAMARES.length; i++) {
      if (pontos >= (ESCADA_PATAMARES[i]?.pontos ?? 0)) idx = i;
    }
    const atual = ESCADA_PATAMARES[idx];
    const proximo = ESCADA_PATAMARES[idx + 1] ?? null;
    return {
      nome: r.nome,
      nivel: r.nivel,
      pontos,
      patamarAtual: atual?.nome ?? "Júnior",
      proximoPatamar: proximo?.nome ?? null,
      faltam: proximo ? Math.max(0, proximo.pontos - pontos) : null,
    };
  });

  return { linhas, atualizadoEm: rows[0]?.atualizado_em ?? null };
}

/**
 * Cada consultor ativo com os troféus a que tem direito pelo patamar e pela
 * faturação própria — a mesma regra do separador Troféus do artefacto: o
 * patamar dá direito ao troféu do nível e a todos abaixo, a faturação a
 * cada escalão que já passou. Ordenados por faturação, do maior para o
 * menor. Fica de fora o próprio Zé (a conta principal e as contas Gabriela
 * e Sara, que são dele).
 */
export async function obterTrofeus(): Promise<Trofeus> {
  const { rows } = await db().query<{
    nome: string;
    nivel: string | null;
    vendas: string | null;
    atualizado_em: string;
  }>(
    `select nome, nivel, vendas, atualizado_em
       from equipa_afiliados
      where estado = 'ACTIVE'
      order by coalesce(vendas, 0) desc, nome asc`,
  );

  const linhas: LinhaTrofeus[] = rows.map((r) => {
    const nivel = normalizarNivel(r.nivel);
    const vendas = Math.round(Number(r.vendas) || 0);
    const patamares = nivel ? ORDEM_NIVEIS.slice(0, ORDEM_NIVEIS.indexOf(nivel) + 1) : [];
    const faturacao = FATURACAO_TROFEUS.filter((m) => vendas >= m).map((m) => m / 1000);
    return { nome: r.nome, nivel, vendas, patamares, faturacao };
  });

  // Só quem tem pelo menos um troféu (e sem as contas próprias do Zé).
  const comTrofeu = linhas.filter(
    (l) => (l.patamares.length > 0 || l.faturacao.length > 0) && !ehContaPropria(l.nome),
  );

  // Contagem para saber quantos encomendar, já sem as contas próprias.
  const contagem: Record<string, number> = {};
  const inc = (chave: string) => {
    contagem[chave] = (contagem[chave] ?? 0) + 1;
  };
  for (const l of comTrofeu) {
    l.patamares.forEach((p) => inc(`nivel:${p}`));
    l.faturacao.forEach((f) => inc(`fat:${f}`));
  }

  return {
    atualizadoEm: rows[0]?.atualizado_em ?? null,
    linhas: comTrofeu,
    contagem,
  };
}
