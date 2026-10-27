import { ehContaPropria, gravarConfig, lerConfig } from "./dashboard-negocio";
import { lerBruto, type Periodo } from "./dashboard-sincronizar";
import { calcularAno, juntarAnos, type AnoReservas, type ArvoreReservas, type DadosReservasMedias } from "./reservas-medias";
import { importarLinhasEquipa, type LinhaEquipa } from "./equipa-import";
import { CAMPANHA_BF, periodoBF, type FaturacaoBF } from "./blackfriday";
import { CHAVE_FATURACAO_BF, configuracaoBF } from "./blackfriday-servidor";
import type { DadosCoreRank } from "../../app/admin/dashboard-negocio/core-rank-cliente";
import type { DadosIncentivos } from "../../app/admin/dashboard-negocio/incentivos-cliente";
import type { DadosLinhaDireta } from "../../app/admin/dashboard-negocio/linha-direta-cliente";
import type { DadosMapas } from "../../app/admin/dashboard-negocio/mapas-cliente";

/**
 * O passo final do botão «Atualizar dashboard»: a partir das respostas do
 * MyOffice guardadas em dashboard_bruto, recalcula os separadores Mapas,
 * Linha direta, Incentivos (só a corrida anual — os prémios mensais têm
 * decisões manuais) e Core-rank, e importa a equipa. São as mesmas regras
 * da atualização feita à mão até aqui; o snapshot anterior de cada separador
 * fica guardado em dashboard_config como «anterior_<chave>».
 */

interface Afiliado {
  user: { username: string; name: string; email: string; level: number; creationDate: string };
  upline?: { username?: string; email?: string } | null;
  stats: { sales: number; points: number };
  subscriptionInfo?: { subscriptionStatus?: string } | null;
}
interface Movimento { state: string; commissions: number }
interface Stats { sales: number; points: number; subscriptions: number }

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const NIVEIS_CSV = ["JUNIOR", "JUNIOR", "SENIOR", "MASTER", "COORDENADOR", "DIRETOR", "BRONZE", "PRATA", "OURO"];
const NIVEIS_NOME = ["Júnior", "Júnior", "Sénior", "Master", "Coordenador", "Diretor", "Bronze", "Prata", "Ouro"];

const r2 = (v: number) => Math.round(v * 100) / 100;
const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
const chaveU = (u: string | undefined | null) => (u ?? "").trim().toLowerCase();
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

export interface Resultado {
  hoje: string;
  avisos: string[];
  /** O que muda, em números simples, para se confirmar antes de gravar. */
  resumo: Record<string, unknown>;
  gravado: boolean;
}

type Bruto = Record<string, { corpo: unknown }>;

function paginas(bruto: Bruto, nome: string): unknown[] {
  return Object.keys(bruto)
    .filter((k) => k.startsWith(`${nome}:p`))
    .sort((a, b) => Number(a.split(":p")[1]) - Number(b.split(":p")[1]))
    .map((k) => bruto[k]!.corpo);
}

function afiliados(bruto: Bruto, nome: string): Map<string, Afiliado> {
  const mapa = new Map<string, Afiliado>();
  for (const corpo of paginas(bruto, nome)) {
    const c = corpo as { list?: { content?: Afiliado[] }; content?: Afiliado[] };
    for (const a of c.list?.content ?? c.content ?? []) {
      if (a?.user?.username) mapa.set(chaveU(a.user.username), a);
    }
  }
  return mapa;
}

function totais(bruto: Bruto, nome: string): Stats | null {
  const p0 = paginas(bruto, nome)[0] as { stats?: Stats } | undefined;
  return p0?.stats ?? null;
}

function comissoes(bruto: Bruto, nome: string): number | null {
  const ps = paginas(bruto, nome);
  if (!ps.length) return null;
  const movs = ps.flatMap((c) => ((c as { content?: Movimento[] }).content ?? []));
  return r2(soma(movs.filter((m) => m.state === "confirmed" && m.commissions > 0).map((m) => m.commissions)));
}

function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} de ${MESES_LONGOS[m - 1]} de ${a}`;
}

export async function calcularDashboard(gravar: boolean): Promise<Resultado> {
  const bruto = (await lerBruto()) as Bruto;
  const plano = bruto["plano"]?.corpo as { hoje: string; periodos: Periodo[] } | undefined;
  if (!plano) throw new Error("não há dados recolhidos — carrega primeiro no favorito no MyOffice");
  const { hoje } = plano;
  const [ano, mes, dia] = hoje.split("-").map(Number) as [number, number, number];
  const idx = mes - 1;
  const avisos: string[] = [];
  const resumo: Record<string, unknown> = {};

  const equipa = afiliados(bruto, "equipa");
  const doAno = afiliados(bruto, `equipa-ano-${ano}`);
  const meses = plano.periodos.filter((p) => p.chave.startsWith("mes-"));
  const porMes = new Map(meses.map((p) => [Number(p.chave.slice(-2)) - 1, afiliados(bruto, `equipa-${p.chave}`)]));
  const completo = (nome: string, n: number) => {
    const esperado = (paginas(bruto, nome)[0] as { list?: { totalElements?: number } } | undefined)?.list?.totalElements;
    if (esperado !== undefined && n < esperado) avisos.push(`${nome}: chegaram ${n} de ${esperado} pessoas`);
    return esperado === undefined || n >= esperado;
  };
  const equipaCompleta = completo("equipa", equipa.size) && completo(`equipa-ano-${ano}`, doAno.size)
    && meses.every((p) => completo(`equipa-${p.chave}`, porMes.get(Number(p.chave.slice(-2)) - 1)!.size));

  // ---------------------------------------------------------------- Mapas
  const mapas = await lerConfig<DadosMapas>("mapas");
  let novoMapas: DadosMapas | null = null;
  if (!mapas) avisos.push("Mapas: ainda não há snapshot");
  else if (mapas.years_recent[mapas.years_recent.length - 1] !== ano || !("ytd_2026" in (mapas.metrics.pontos ?? {})) || ano !== 2026) {
    avisos.push(`Mapas: é preciso fazer a passagem para ${ano} com o Claude`);
  } else {
    const anterior = `parcial-${ano - 1}-${String(mes).padStart(2, "0")}`;
    const valores: Record<string, { mes: Map<number, number>; parcial: number } | null> = {};
    let fatOk = true;
    // Faturação = vendas da equipa no período (o novo MyOffice já não tem o
    // Metabase dos Indicadores); o mês de controlo mostra a diferença.
    const fat = new Map<number, number>(), pts = new Map<number, number>(), cons = new Map<number, number>(), com = new Map<number, number>();
    for (const p of meses) {
      const i = Number(p.chave.slice(-2)) - 1;
      const t = totais(bruto, `equipa-${p.chave}`);
      const c = comissoes(bruto, `movimentos-${p.chave}`);
      if (!t || c === null) { avisos.push(`Mapas: faltam os dados de ${MESES[i]}`); fatOk = false; continue; }
      fat.set(i, r2(t.sales)); pts.set(i, r2(t.points)); cons.set(i, t.subscriptions); com.set(i, c);
    }
    const controlo = plano.periodos.find((p) => p.chave.startsWith("controlo-"));
    if (controlo) {
      const i = Number(controlo.chave.slice(-2)) - 1;
      const t = totais(bruto, `equipa-${controlo.chave}`);
      const c = comissoes(bruto, `movimentos-${controlo.chave}`);
      const no = (k: string) => mapas.metrics[k]?.monthly_recent[String(ano)]?.[i];
      resumo.controlo = {
        mes: MESES[i],
        faturacao: `dashboard ${no("faturacao")} · MyOffice ${t ? r2(t.sales) : "—"}`,
        pontos: `dashboard ${no("pontos")} · MyOffice ${t ? r2(t.points) : "—"}`,
        consultores: `dashboard ${no("consultores")} · MyOffice ${t?.subscriptions ?? "—"}`,
        comissoes: `dashboard ${no("comissoes")} · MyOffice ${c ?? "—"}`,
      };
    }
    const tp = totais(bruto, `equipa-${anterior}`);
    const cp = comissoes(bruto, `movimentos-${anterior}`);
    if (!tp || cp === null) { avisos.push("Mapas: faltam os dados do mesmo período do ano passado"); fatOk = false; }
    if (fatOk && tp && cp !== null) {
      valores.faturacao = { mes: fat, parcial: r2(tp.sales) };
      valores.pontos = { mes: pts, parcial: r2(tp.points) };
      valores.consultores = { mes: cons, parcial: tp.subscriptions };
      valores.comissoes = { mes: com, parcial: cp };
      const novo: DadosMapas = structuredClone(mapas);
      const deltas: number[] = [];
      for (const [chave, m] of Object.entries(novo.metrics)) {
        const v = valores[chave];
        if (!v) continue;
        const atual = (m.monthly_recent[String(ano)] ??= Array(12).fill(0));
        const passado = m.monthly_recent[String(ano - 1)] ?? Array(12).fill(0);
        for (const [i, valor] of v.mes) atual[i] = valor;
        for (let i = idx + 1; i < 12; i++) atual[i] = 0;
        m.last_month_2026 = atual[idx]!;
        m.last_month_2025 = v.parcial;
        m.ytd_2026 = r2(soma(atual.slice(0, idx + 1)));
        m.ytd_2025 = r2(soma(passado.slice(0, idx)) + v.parcial);
        m.delta_pct = m.ytd_2025 > 0 ? r2((m.ytd_2026 / m.ytd_2025 - 1) * 100) : null;
        if (m.delta_pct !== null) deltas.push(m.delta_pct);
      }
      const fator = r2(1 + soma(deltas) / deltas.length / 100);
      for (const m of Object.values(novo.metrics)) {
        m.projection_values = novo.projection_years.map((_, i) => r2(m.ytd_2026 * fator ** i));
      }
      novo.ytd_through_idx = idx;
      novo.ytd_partial_day = dia;
      novo.pat_meses_2026 = idx + dia / ultimoDia(ano, mes);
      novo.pat_ate = dataPorExtenso(hoje);
      // Próximo patamar: os pontos de carreira sobem tanto quanto os pontos do ano.
      if (equipaCompleta) {
        for (const l of novo.pat_linhas) {
          const a = l.eu ? novo.metrics.pontos!.ytd_2026 : doAno.get(chaveU(l.u)) ? r2(doAno.get(chaveU(l.u))!.stats.points) : null;
          if (a === null) { avisos.push(`Próximo patamar: ${l.u} não veio do MyOffice`); continue; }
          l.p = r2(l.p + a - l.a);
          l.a = a;
          const nivel = l.eu ? undefined : NIVEIS_NOME[equipa.get(chaveU(l.u))?.user.level ?? -1];
          if (nivel) l.lvl = nivel;
        }
      }
      novoMapas = novo;
      resumo.mapas = Object.fromEntries(Object.entries(novo.metrics).map(([k, m]) => [k, {
        mes: `${mapas.metrics[k]?.last_month_2026} → ${m.last_month_2026}`,
        ano: `${mapas.metrics[k]?.ytd_2026} → ${m.ytd_2026}`,
        variacao: `${mapas.metrics[k]?.delta_pct}% → ${m.delta_pct}%`,
      }]));
      resumo.fator = `${r2(1 + soma(Object.values(mapas.metrics).map((m) => m.delta_pct ?? 0)) / 4 / 100)} → ${fator}`;
    }
  }

  if (!equipaCompleta) avisos.push("A lista da equipa chegou incompleta: Linha direta, Incentivos, Core-rank e equipa não foram atualizados");

  // Quem está «por cima» de cada grupo da Linha direta (v, s) deduz-se das
  // linhas que já lá estão. São contas próprias: nunca entram como diretos
  // nem como consultores (senão os pontos contavam a dobrar).
  const linha = await lerConfig<DadosLinhaDireta>("linha_direta");
  const raizes = new Map<string, string>();
  for (const l of linha?.linhas ?? []) {
    const up = chaveU(equipa.get(chaveU(l.u))?.upline?.username);
    if (up) raizes.set(up, l.c);
  }
  const propria = (a: Afiliado) => raizes.has(chaveU(a.user.username)) || ehContaPropria(a.user.name);

  // ---------------------------------------------------------- Linha direta
  let novaLinha: DadosLinhaDireta | null = null;
  if (linha && equipaCompleta && novoMapas) {
    const novo: DadosLinhaDireta = structuredClone(linha);
    for (const [u, a] of equipa) {
      const c = raizes.get(chaveU(a.upline?.username));
      if (!c || propria(a) || novo.linhas.some((l) => chaveU(l.u) === u)) continue;
      const temPontos = [...porMes.values()].some((m) => (m.get(u)?.stats.points ?? 0) > 0);
      if (temPontos) novo.linhas.push({ u: a.user.username, n: a.user.name, c, m: [] });
    }
    novo.meses = MESES.slice(0, idx + 1);
    novo.geral = Array.from({ length: idx + 1 }, (_, i) => novoMapas!.metrics.pontos!.monthly_recent[String(ano)]![i]!);
    for (const l of novo.linhas) {
      l.m = Array.from({ length: idx + 1 }, (_, i) => l.m[i] ?? 0);
      for (const [i, m] of porMes) l.m[i] = r2(m.get(chaveU(l.u))?.stats.points ?? 0);
      const h = novo.hist.find((x) => chaveU(x.u) === chaveU(l.u));
      if (h) h.v[4] = r2(soma(l.m));
      else novo.hist.push({ u: l.u, n: l.n, v: [0, 0, 0, 0, r2(soma(l.m))] });
    }
    const anoAtual = novo.anos.find((a) => a.ano === ano);
    if (anoAtual) {
      anoAtual.geral = novoMapas.metrics.pontos!.ytd_2026;
      anoAtual.eq = r2(soma(novo.linhas.map((l) => soma(l.m))));
      anoAtual.pessoais = r2(anoAtual.geral - anoAtual.eq);
      anoAtual.parcial = true;
      anoAtual.diretos = [...equipa.values()].filter((a) => raizes.has(chaveU(a.upline?.username)) && !propria(a)).length;
    }
    novo.ate = dataPorExtenso(hoje);
    novaLinha = novo;
    const antes = linha.anos.find((a) => a.ano === ano);
    resumo.linhaDireta = {
      linhas: `${linha.linhas.length} → ${novo.linhas.length}`,
      equipa: `${antes?.eq} → ${anoAtual?.eq}`,
      pessoais: `${antes?.pessoais} → ${anoAtual?.pessoais}`,
      diretos: `${antes?.diretos} → ${anoAtual?.diretos}`,
    };
  }

  // ------------------------------------------------------------ Incentivos
  const incentivos = await lerConfig<DadosIncentivos>("incentivos");
  let novosIncentivos: DadosIncentivos | null = null;
  if (incentivos && equipaCompleta) {
    const novo: DadosIncentivos = structuredClone(incentivos);
    const nFat = Math.max(incentivos.anualFat.length, 12);
    novo.anualFat = [...doAno.values()]
      .filter((a) => a.stats.sales > 0)
      .sort((a, b) => b.stats.sales - a.stats.sales)
      .slice(0, nFat)
      .map((a) => ({ u: a.user.username, n: a.user.name, s: r2(a.stats.sales) }));
    const recrutas = new Map<string, { d: number; a: number; n: string; u: string }>();
    for (const a of equipa.values()) {
      if (!a.user.creationDate?.startsWith(String(ano))) continue;
      const up = chaveU(a.upline?.username);
      const quem = equipa.get(up);
      if (!quem) continue;
      const r = recrutas.get(up) ?? { d: 0, a: 0, n: quem.user.name, u: quem.user.username };
      r.d++;
      if (a.stats.sales >= 1000 && a.subscriptionInfo?.subscriptionStatus !== "CANCELED") r.a++;
      recrutas.set(up, r);
    }
    const nDir = Math.max(incentivos.anualDir.length, 11);
    novo.anualDir = [...recrutas.values()]
      .filter((r) => r.a > 0)
      .sort((x, y) => y.a - x.a || y.d - x.d)
      .slice(0, nDir)
      .map(({ u, n, a, d }) => ({ u, n, a, d }));
    novo.ate = dataPorExtenso(hoje);
    novosIncentivos = novo;
    const nomes = (l: { u: string }[]) => l.map((x) => chaveU(x.u)).join(",");
    resumo.incentivos = {
      corridaFaturacaoIgual: nomes(novo.anualFat.slice(0, incentivos.anualFat.length)) === nomes(incentivos.anualFat),
      corridaDiretosIgual: nomes(novo.anualDir.slice(0, incentivos.anualDir.length)) === nomes(incentivos.anualDir),
      lider: `${incentivos.anualFat[0]?.s} → ${novo.anualFat[0]?.s}`,
    };
  }

  // ------------------------------------------------------------- Core-rank
  const core = await lerConfig<DadosCoreRank>("core_rank");
  let novoCore: DadosCoreRank | null = null;
  if (core && equipaCompleta) {
    const novo: DadosCoreRank = structuredClone(core);
    const existentes = new Set(novo.consultores.map((c) => chaveU(c.u)));
    for (const [u, a] of equipa) {
      if (existentes.has(u) || propria(a)) continue;
      const vendeu = [...porMes.values()].some((m) => (m.get(u)?.stats.sales ?? 0) > 0);
      if (vendeu) novo.consultores.push({ u: a.user.username, n: a.user.name, v: [], novos: [] });
    }
    for (const c of novo.consultores) {
      c.v = Array.from({ length: idx + 1 }, (_, i) => c.v[i] ?? 0);
      for (const [i, m] of porMes) c.v[i] = r2(m.get(chaveU(c.u))?.stats.sales ?? 0);
      c.novos = [...equipa.values()]
        .filter((a) => chaveU(a.upline?.username) === chaveU(c.u) && a.user.creationDate?.startsWith(String(ano)))
        .map((a) => ({ u: a.user.username, n: a.user.name, mes: Number(a.user.creationDate.slice(5, 7)) - 1, s: r2(a.stats.sales) }));
    }
    novo.meses = MESES.slice(0, idx + 1);
    novo.parcial = dia < ultimoDia(ano, mes);
    novo.ate = dataPorExtenso(hoje);
    novoCore = novo;
    resumo.coreRank = { consultores: `${core.consultores.length} → ${novo.consultores.length}` };
  }

  // ------------------------------------------------------ Reservas médias
  // Independente da lista da equipa: cada ano que chegou do Analisador de
  // Organização substitui o que estava guardado; os outros mantêm-se.
  const reservas = await lerConfig<DadosReservasMedias>("reservas_medias");
  const anosRecebidos: AnoReservas[] = [];
  for (const chave of Object.keys(bruto).filter((k) => /^reservas-\d{4}$/.test(k))) {
    const arvore = bruto[chave]!.corpo as ArvoreReservas;
    if (!arvore?.raiz || !Array.isArray(arvore.nos)) continue;
    anosRecebidos.push(calcularAno(Number(chave.slice(-4)), arvore, hoje));
  }
  const novasReservas = anosRecebidos.length ? juntarAnos(reservas, anosRecebidos, hoje) : null;
  if (novasReservas) {
    resumo.reservasMedias = Object.fromEntries(anosRecebidos.map((a) => [a.ano, `${a.media} € · ${a.reservas} reservas · consultor ${a.mediaConsultor} €`]));
  }

  // ---------------------------------------------------------------- Equipa
  const linhasEquipa: LinhaEquipa[] = [...equipa.values()]
    .filter((a) => a.user.email)
    .map((a) => ({
      email: a.user.email.trim().toLowerCase(),
      nome: a.user.name.trim(),
      uplineEmail: a.upline?.email ? a.upline.email.trim().toLowerCase() : null,
      nivel: NIVEIS_CSV[a.user.level] ?? null,
      estado: a.subscriptionInfo?.subscriptionStatus ?? "ACTIVE",
      vendas: a.stats.sales,
      pontos: a.stats.points,
      dataRegisto: a.user.creationDate ? new Date(a.user.creationDate) : null,
    }));
  resumo.equipa = linhasEquipa.length;

  // Black Friday usa o total geral da equipa devolvido pelo MyOffice no
  // período próprio. Não soma comprovativos nem faturação pessoal dos TPs.
  const configBF = await configuracaoBF();
  const intervaloBF = periodoBF(configBF, hoje);
  const pedidoBF = plano.periodos.find(p => p.chave === `blackfriday-${CAMPANHA_BF}`);
  const totalBF = totais(bruto, `equipa-blackfriday-${CAMPANHA_BF}`);
  const falhasRecolha = bruto["falhas"]?.corpo;
  const falhouBF = Array.isArray(falhasRecolha) && falhasRecolha.some(f => typeof f === "string" && f.startsWith(`Equipa blackfriday-${CAMPANHA_BF}:`));
  let novaFaturacaoBF: FaturacaoBF | null = null;
  if (pedidoBF && !falhouBF && pedidoBF.inicio === intervaloBF.inicio && pedidoBF.fim === intervaloBF.fim
    && totalBF && Number.isFinite(totalBF.sales) && totalBF.sales >= 0) {
    novaFaturacaoBF = {valor: r2(totalBF.sales), atualizadoEm: new Date().toISOString(),
      inicio: pedidoBF.inicio, fim: pedidoBF.fim, periodo: configBF.periodoFaturacao};
    resumo.blackfriday = novaFaturacaoBF;
  } else if (pedidoBF) avisos.push("Black Friday: não foi possível atualizar o total. Mantém-se o último valor confirmado; volta a atualizar os dados.");

  if (gravar) {
    const gravacoes: [string, unknown, unknown][] = [
      ["mapas", mapas, novoMapas],
      ["linha_direta", linha, novaLinha],
      ["incentivos", incentivos, novosIncentivos],
      ["core_rank", core, novoCore],
      ["reservas_medias", reservas, novasReservas],
    ];
    for (const [chave, antes, depois] of gravacoes) {
      if (!depois) continue;
      await gravarConfig(`anterior_${chave}`, antes);
      await gravarConfig(chave, depois);
    }
    if (equipaCompleta && linhasEquipa.length) await importarLinhasEquipa(linhasEquipa);
    if (novaFaturacaoBF) await gravarConfig(CHAVE_FATURACAO_BF, novaFaturacaoBF);
  }

  return { hoje, avisos, resumo, gravado: gravar };
}
