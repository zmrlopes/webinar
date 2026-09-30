"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Porta o separador Mapas do artefacto "Negócio iCligo" para dentro do site,
 * tal e qual: cartões, gráficos mês a mês, projeções com simulador, mapa de
 * comissões (com as outras contas editáveis, guardadas neste browser) e o
 * próximo patamar. Os números não vivem aqui — chegam no prop `dados`, lido
 * da base de dados privada (dashboard_config), porque o repositório é público.
 */

type Unidade = "eur" | "num";

interface Metrica {
  label: string;
  unit: Unidade;
  decimals: number;
  monthly_recent: Record<string, number[]>;
  ytd_2026: number;
  ytd_2025: number;
  delta_pct: number | null;
  last_month_2026: number;
  last_month_2025: number;
  projection_values: number[];
}

export interface DadosMapas {
  months: string[];
  years_recent: number[];
  projection_years: number[];
  ytd_through_idx: number;
  ytd_partial_day: number;
  metrics: Record<string, Metrica>;
  com_hist: { a: number; m: (number | null)[]; p: number }[];
  com_outras: Record<string, number[]>;
  pat_escaloes: { n: string; p: number; c: number }[];
  pat_linhas: { u: string; n: string; lvl: string; p: number; a: number; prox?: string; proxP?: number; eu?: boolean }[];
  pat_ate: string;
  pat_meses_2026: number;
}

const ORDEM = ["faturacao", "comissoes", "pontos", "consultores"];
const ICONS: Record<string, string> = {
  faturacao: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
  comissoes: '<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
  pontos: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  consultores:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
};
const YEAR_COLOR: Record<number, string> = { 2024: "var(--year-2024)", 2025: "var(--year-2025)", 2026: "var(--year-2026)" };
const MES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number | null, unit: Unidade, decimals: number): string {
  if (v === null || v === undefined) return "—";
  if (unit === "eur") {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} M€`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} k€`;
    return `${v.toLocaleString("pt-PT", { maximumFractionDigits: decimals })} €`;
  }
  return v.toLocaleString("pt-PT", { maximumFractionDigits: decimals });
}
function fmtFull(v: number | null, unit: Unidade, decimals: number): string {
  if (v === null || v === undefined) return "—";
  return unit === "eur"
    ? `${v.toLocaleString("pt-PT", { maximumFractionDigits: decimals })} €`
    : v.toLocaleString("pt-PT", { maximumFractionDigits: decimals });
}
const r2 = (v: number): number => Math.round(v * 100) / 100;

export function MapasCliente({ dados }: { dados: DadosMapas }): React.JSX.Element {
  const LS = "icligo.comissoes.outras.v2";
  const [comMan, setComMan] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const carregou = useRef(false);

  useEffect(() => {
    try {
      setComMan(JSON.parse(localStorage.getItem(LS) || "{}") || {});
    } catch {
      setComMan({});
    }
    carregou.current = true;
  }, []);
  useEffect(() => {
    if (!carregou.current) return;
    try {
      localStorage.setItem(LS, JSON.stringify(comMan));
    } catch {
      /* browser sem storage — segue sem guardar */
    }
  }, [comMan]);

  const meses = dados.months;
  const through = dados.ytd_through_idx;
  const mesAtual = meses[through] ?? "";
  const ateDia = dados.ytd_partial_day ? ` (até dia ${dados.ytd_partial_day})` : "";
  const periodoCurto = `Jan–${mesAtual} 26`;
  const periodoLongo = `Jan–${mesAtual} 2026`;

  const defaultFator = useMemo(() => {
    const avg = ORDEM.reduce((s, k) => s + (dados.metrics[k]?.delta_pct ?? 0), 0) / ORDEM.length;
    return Math.round((1 + avg / 100) * 100) / 100;
  }, [dados]);
  const [fatorTexto, setFatorTexto] = useState<string>("");
  useEffect(() => {
    setFatorTexto(String(defaultFator));
  }, [defaultFator]);
  const fator = (() => {
    const v = parseFloat((fatorTexto || "").replace(",", "."));
    return Number.isFinite(v) && v >= 0 ? v : defaultFator;
  })();
  const fatorPorOmissao = fator === defaultFator;

  const comValor = (ano: string, i: number): number => {
    const k = `${ano}:${i}`;
    if (k in comMan) return comMan[k] ?? 0;
    return dados.com_outras[ano]?.[i] ?? 0;
  };

  // Comissões ajustadas com as outras contas (base do artefacto + correções).
  const metricas = useMemo(() => {
    const m: Record<string, Metrica> = {};
    for (const k of ORDEM) m[k] = { ...dados.metrics[k]! };
    const c = m.comissoes!;
    const base = dados.metrics.comissoes!;
    const adj = (ano: string) => (base.monthly_recent[ano] ?? []).map((v, i) => r2(v + comValor(ano, i)));
    c.monthly_recent = { ...base.monthly_recent, "2025": adj("2025"), "2026": adj("2026") };
    const r26 = c.monthly_recent["2026"]!;
    const r25 = c.monthly_recent["2025"]!;
    const parcial25 = r2(base.last_month_2025 + comValor("2025", 8));
    const ytd26 = r2(r26.slice(0, 9).reduce((a, b) => a + b, 0));
    const ytd25 = r2(r25.slice(0, 8).reduce((a, b) => a + b, 0) + parcial25);
    c.ytd_2026 = ytd26;
    c.ytd_2025 = ytd25;
    c.delta_pct = ytd25 ? Math.round((ytd26 / ytd25 - 1) * 10000) / 100 : null;
    c.last_month_2026 = r26[8] ?? 0;
    c.last_month_2025 = parcial25;
    c.projection_values = [...base.projection_values];
    c.projection_values[0] = ytd26;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, comMan]);

  const proj = (key: string, f: number): number[] => {
    const base = metricas[key]!.projection_values[0] ?? 0;
    const n = dados.projection_years.length;
    const vals = [base];
    for (let i = 1; i < n; i++) vals.push(base * Math.pow(f, i));
    return vals;
  };

  function mover(e: React.MouseEvent, html: string): void {
    setTooltip({ x: e.clientX, y: e.clientY, html });
  }

  return (
    <div className="viz-root">
      <MapasEstilos />
      {tooltip && (
        <div className="dnm-tooltip" style={{ left: tooltip.x, top: tooltip.y - 10 }} dangerouslySetInnerHTML={{ __html: tooltip.html }} />
      )}

      <div className="section-label">Visão geral</div>
      <div className="kpi-grid">
        {ORDEM.map((key) => {
          const m = metricas[key]!;
          const up = m.delta_pct !== null && m.delta_pct >= 0;
          return (
            <div key={key} className="kpi-card">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[key] ?? "" }} />
              </div>
              <div className="kpi-label">
                {m.label} · acumulado {periodoCurto}
              </div>
              <div className="kpi-value">{fmt(m.ytd_2026, m.unit, m.decimals)}</div>
              <div className={`kpi-delta ${up ? "up" : ""}`}>
                {m.delta_pct === null ? "—" : `${up ? "▲" : "▼"} ${Math.abs(m.delta_pct)}% vs período homólogo 2025`}
              </div>
              <div className="kpi-sub">
                {mesAtual}
                {ateDia}: {fmt(m.last_month_2026, m.unit, m.decimals)} (vs {fmt(m.last_month_2025, m.unit, m.decimals)} nos mesmos
                dias de 2025)
              </div>
            </div>
          );
        })}
      </div>

      <div className="legend-row">
        <div className="grp">
          {dados.years_recent.map((y) => (
            <span key={y} className="legend-item">
              <span className="legend-swatch" style={{ background: YEAR_COLOR[y] }} />
              {y}
              {y === dados.years_recent[dados.years_recent.length - 1] ? " (atual)" : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="section-note" style={{ marginTop: "-6px" }}>
        <b>{mesAtual} está a meio.</b> A barra do mês em curso mostra só o que já entrou, por isso é normal parecer mais
        baixa — não é uma queda. O acumulado dos cartões vai de <b>Janeiro a {mesAtual}</b> e é comparado com <b>exatamente
        os mesmos dias de 2025</b>.
      </div>

      {ORDEM.map((key) => {
        const m = metricas[key]!;
        const up = m.delta_pct !== null && m.delta_pct >= 0;
        return (
          <div key={key} className="metric-card">
            <div className="metric-head">
              <div>
                <h2>{m.label}</h2>
                <div className="metric-sub">
                  Acumulado {periodoLongo}: {fmtFull(m.ytd_2026, m.unit, m.decimals)} · exatamente o mesmo período em 2025:{" "}
                  {fmtFull(m.ytd_2025, m.unit, m.decimals)}
                </div>
              </div>
              <div className={`growth-chip ${up ? "" : "down"}`}>
                <span className="gv">
                  {m.delta_pct === null ? "—" : `${up ? "▲" : "▼"} ${Math.abs(m.delta_pct)}%`}
                </span>
                <span className="gl">YTD vs 2025</span>
              </div>
            </div>
            <div className="chart-title">Por mês — {dados.years_recent.join(" / ")}</div>
            <GraficoBarras dados={dados} m={m} onHover={mover} onLeave={() => setTooltip(null)} />
          </div>
        );
      })}

      <div className="section-label" style={{ marginTop: 8 }}>
        Projeções — 5 anos ({dados.projection_years[1]}–{dados.projection_years[dados.projection_years.length - 1]})
      </div>
      <div className="section-note">
        Por omissão o fator é a <b>média do crescimento das 4 métricas em 2026</b> (vs o mesmo período de 2025). Muda o
        número para simular outro cenário — os gráficos e o mapa de comissões acompanham.
      </div>
      <div className="proj-section">
        <div className="proj-sim">
          <label htmlFor="dnm-fator">Fator de crescimento anual</label>
          <input
            id="dnm-fator"
            type="number"
            step="0.1"
            min="0"
            value={fatorTexto}
            onChange={(e) => setFatorTexto(e.target.value)}
          />
          <span className="proj-sim-hint">1 = mantém, 2 = duplica, 3 = triplica… por omissão é a média atual</span>
          <button type="button" onClick={() => setFatorTexto(String(defaultFator))}>
            Repor média atual
          </button>
        </div>
        <div className="legend-row">
          <div className="grp">
            <span className="legend-item">
              <span className="legend-line" />
              {dados.projection_years[0]} (real, parcial)
            </span>
            <span className="legend-item">
              <span className="legend-line dashed" />
              projeção {dados.projection_years[1]}–{dados.projection_years[dados.projection_years.length - 1]}
            </span>
          </div>
        </div>
        <div className="proj-grid">
          {ORDEM.map((key) => {
            const m = metricas[key]!;
            const vals = proj(key, fator);
            const pct = (fator - 1) * 100;
            return (
              <div key={key} className="proj-card">
                <h3>{m.label}</h3>
                <GraficoProjecao dados={dados} m={m} vals={vals} onHover={mover} onLeave={() => setTooltip(null)} />
                <div className="proj-end">
                  {dados.projection_years[dados.projection_years.length - 1]} (projeção):{" "}
                  <b>{fmtFull(vals[vals.length - 1] ?? 0, m.unit, m.decimals)}</b>
                </div>
                <div className={`proj-rate ${fatorPorOmissao ? "" : "sim"}`}>
                  {fatorPorOmissao
                    ? `≈ ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%/ano — média do crescimento atual (2026 vs 2025)`
                    : `cenário simulado: ×${fator} ao ano (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%/ano)`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 26 }}>
        Próximo patamar — quando lá chegas
      </div>
      <ProximoPatamar dados={dados} />

      <div className="section-label" style={{ marginTop: 26 }}>
        Mapa de comissões
      </div>
      <MapaComissoes dados={dados} metricas={metricas} fator={fator} comValor={comValor} />

      <div className="section-label" style={{ marginTop: 26 }}>
        Comissões das outras contas
      </div>
      <OutrasContas dados={dados} comValor={comValor} comMan={comMan} setComMan={setComMan} />
    </div>
  );
}

function GraficoBarras({
  dados,
  m,
  onHover,
  onLeave,
}: {
  dados: DadosMapas;
  m: Metrica;
  onHover: (e: React.MouseEvent, html: string) => void;
  onLeave: () => void;
}): React.JSX.Element {
  const W = 940,
    H = 230,
    padL = 46,
    padR = 8,
    padT = 22,
    padB = 24;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const years = dados.years_recent;
  let maxV = 0;
  years.forEach((y) => (m.monthly_recent[y] ?? []).forEach((v) => (v > maxV ? (maxV = v) : null)));
  maxV = maxV * 1.18 || 1;
  const groupW = plotW / dados.months.length;
  const barGap = 3;
  const barW = (groupW - barGap * (years.length + 1)) / years.length;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.label} por mês`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const yv = (maxV * i) / 4;
        const y = padT + plotH - (yv / maxV) * plotH;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} className="gridline" />
            <text x={padL - 6} y={y + 3} className="axis-label" textAnchor="end">
              {fmt(yv, m.unit, 0)}
            </text>
          </g>
        );
      })}
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} className="baseline" />
      {dados.months.map((mo, mi) => {
        const gx = padL + mi * groupW;
        return (
          <g key={mo}>
            {years.map((y, yi) => {
              const v = (m.monthly_recent[y] ?? [])[mi] ?? 0;
              const bh = (v / maxV) * plotH;
              const bx = gx + barGap + yi * (barW + barGap);
              const by = padT + plotH - bh;
              return (
                <g key={y}>
                  <rect
                    x={bx}
                    y={v > 0 ? by : padT + plotH - 1.5}
                    width={barW}
                    height={v > 0 ? Math.max(bh, 1.5) : 1.5}
                    rx={2}
                    fill={YEAR_COLOR[y]}
                    stroke="rgba(75,83,32,0.30)"
                    strokeWidth={1}
                    opacity={v > 0 ? 1 : 0.25}
                    onMouseMove={(e) => onHover(e, `<b>${mo} ${y}</b><br>${m.label}: ${fmtFull(v, m.unit, m.decimals)}`)}
                    onMouseLeave={onLeave}
                  />
                  {v > 0 && (
                    <text x={bx + barW / 2} y={by - 3} className="bar-value-label" textAnchor="middle">
                      {fmt(v, m.unit, m.unit === "eur" ? 0 : m.decimals)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={gx + groupW / 2} y={H - 6} className="axis-label" textAnchor="middle">
              {mo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GraficoProjecao({
  dados,
  m,
  vals,
  onHover,
  onLeave,
}: {
  dados: DadosMapas;
  m: Metrica;
  vals: number[];
  onHover: (e: React.MouseEvent, html: string) => void;
  onLeave: () => void;
}): React.JSX.Element {
  const W = 300,
    H = 150,
    padL = 50,
    padR = 10,
    padT = 12,
    padB = 22;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const maxV = Math.max(...vals) * 1.08 || 1;
  const years = dados.projection_years;
  const xStep = plotW / (years.length - 1);
  const pts = vals.map((v, i) => [padL + i * xStep, padT + plotH - (v / maxV) * plotH] as const);
  const pathFor = (i0: number, i1: number) =>
    pts.slice(i0, i1 + 1).map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.label} projeção`}>
      {Array.from({ length: 4 }).map((_, i) => {
        const yv = (maxV * i) / 3;
        const y = padT + plotH - (yv / maxV) * plotH;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} className="gridline" />
            <text x={padL - 6} y={y + 3} className="axis-label" textAnchor="end">
              {fmt(yv, m.unit, 0)}
            </text>
          </g>
        );
      })}
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} className="baseline" />
      <path d={pathFor(0, vals.length - 1)} fill="none" stroke="var(--brand-700)" strokeWidth={2} strokeDasharray="4 3" opacity={0.55} />
      <path d={pathFor(0, 0)} fill="none" stroke="var(--brand-700)" strokeWidth={2} />
      {pts.map((p, i) => {
        const isReal = i === 0;
        return (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={isReal ? 3.5 : 3}
            fill={isReal ? "var(--brand-700)" : "var(--surface-1)"}
            stroke="var(--brand-700)"
            strokeWidth={isReal ? 0 : 1.5}
            opacity={isReal ? 1 : 0.75}
            style={{ cursor: "pointer" }}
            onMouseMove={(e) =>
              onHover(e, `<b>${years[i]}</b> (${isReal ? "real, parcial" : "projeção"})<br>${m.label}: ${fmtFull(vals[i] ?? 0, m.unit, m.decimals)}`)
            }
            onMouseLeave={onLeave}
          />
        );
      })}
      {years.map((y, i) => (
        <text key={y} x={pts[i]![0]} y={H - 4} className="axis-label" textAnchor="middle">
          {"'" + String(y).slice(2)}
        </text>
      ))}
    </svg>
  );
}

function ProximoPatamar({ dados }: { dados: DadosMapas }): React.JSX.Element {
  const nf = (v: number, d: number) => v.toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = dados.pat_escaloes;

  function calc(l: DadosMapas["pat_linhas"][number]) {
    let iAtual = 0;
    for (let i = 0; i < esc.length; i++) if (l.p >= esc[i]!.p) iAtual = i;
    const porNome = esc.map((e) => e.n).indexOf(l.lvl);
    if (porNome >= 0) iAtual = porNome;
    const prox = l.prox ? { n: l.prox, p: l.proxP ?? 0 } : esc[iAtual + 1] ?? null;
    const base = esc[iAtual] && esc[iAtual]!.p <= l.p ? esc[iAtual]!.p : 0;
    const ritmo = dados.pat_meses_2026 > 0 ? l.a / dados.pat_meses_2026 : 0;
    const falta = prox ? Math.max(0, prox.p - l.p) : 0;
    const meses = prox && ritmo > 0 ? falta / ritmo : null;
    let quando: string | null = null;
    if (meses !== null) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + Math.ceil(meses));
      quando = `${MES_LONGO[d.getMonth()]} de ${d.getFullYear()}`;
    }
    const pct = prox ? Math.max(0, Math.min(100, ((l.p - base) / (prox.p - base)) * 100)) : 100;
    return { atual: l.lvl || esc[iAtual]!.n, prox, falta, ritmo, quando, pct };
  }

  const eu = dados.pat_linhas.find((l) => l.eu);
  const outros = dados.pat_linhas.filter((l) => !l.eu);

  return (
    <div>
      {eu &&
        (() => {
          const c = calc(eu);
          return (
            <div className="pat-hero">
              <div className="pat-hero-top">
                <div>
                  <h3>
                    {eu.n} · <span className="pat-tag">{c.atual}</span>
                  </h3>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 3 }}>
                    {c.prox ? (
                      <>
                        Faltam <b style={{ color: "var(--brand-700)" }}>{nf(c.falta, 1)} pontos</b> para <b>{c.prox.n}</b>
                      </>
                    ) : (
                      "Não há patamar acima deste"
                    )}
                  </div>
                </div>
                {c.prox ? (
                  c.quando ? (
                    <div className="pat-quando">
                      {c.quando}
                      <span>ao ritmo de {nf(c.ritmo, 1)} pontos por mês</span>
                    </div>
                  ) : (
                    <div className="pat-quando pat-sem">sem ritmo para projetar</div>
                  )
                ) : (
                  <div className="pat-quando pat-topo">já estás no topo da carreira</div>
                )}
              </div>
              <div className="pat-barra">
                <span style={{ width: `${c.pct.toFixed(1)}%` }} />
              </div>
              <div className="pat-legenda">
                <span>
                  <b>{nf(eu.p, 1)}</b> pontos acumulados
                </span>
                {c.prox && (
                  <span>
                    <b>{nf(c.prox.p, 0)}</b> para {c.prox.n}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

      <div className="events-card">
        <h3>
          Os consultores ativos com mais pontos <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-muted)" }}>quanto falta a cada um e quando lá chega, ao ritmo de 2026</span>
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table className="events-table">
            <thead>
              <tr>
                <th>Consultor</th>
                <th>Patamar</th>
                <th style={{ textAlign: "right" }}>Pontos</th>
                <th>Próximo</th>
                <th style={{ textAlign: "right" }}>Faltam</th>
                <th style={{ textAlign: "right" }} title="Média mensal de 2026">
                  Ritmo/mês
                </th>
                <th>Previsão</th>
              </tr>
            </thead>
            <tbody>
              {outros.map((l) => {
                const c = calc(l);
                return (
                  <tr key={l.u}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="ev-name">{l.n}</span>
                      <span className="ev-user">@{l.u}</span>
                    </td>
                    <td>
                      <span className="pat-tag">{c.atual}</span>
                    </td>
                    <td className="ev-num">{nf(l.p, 1)}</td>
                    <td>{c.prox ? c.prox.n : "—"}</td>
                    <td className="ev-num">{c.prox ? nf(c.falta, 1) : "—"}</td>
                    <td className="ev-num" style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                      {c.ritmo > 0 ? nf(c.ritmo, 1) : "—"}
                    </td>
                    <td style={{ fontWeight: 600, color: c.prox && c.quando ? "var(--brand-700)" : "inherit" }}>
                      {!c.prox ? <span className="pat-topo">no topo</span> : c.quando ? c.quando : <span className="pat-sem">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "10px 0 0" }}>
          Escada oficial do plano de carreira. O ritmo é a média mensal de 2026; a previsão é quando, a esse ritmo, os
          pontos em falta ficam feitos. É uma projeção em linha reta, não uma promessa.
        </p>
      </div>
    </div>
  );
}

function MapaComissoes({
  dados,
  metricas,
  fator,
  comValor,
}: {
  dados: DadosMapas;
  metricas: Record<string, Metrica>;
  fator: number;
  comValor: (ano: string, i: number) => number;
}): React.JSX.Element {
  const meses = dados.months;
  const IRS = 0.25;
  const nf = (v: number | null) => (v === null || v === undefined ? "—" : v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
  const nx = (v: number | null) => (v === null || !isFinite(v) ? "—" : v.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const pct = (v: number | null) => (v === null || !isFinite(v) ? "—" : Math.round(v * 100) + "%");

  const euroPonto = (ano: string): number | null => {
    const c = metricas.comissoes!.monthly_recent[ano];
    const p = dados.metrics.pontos!.monthly_recent[ano];
    if (!c || !p) return null;
    const tc = c.reduce((a, b) => a + b, 0),
      tp = p.reduce((a, b) => a + b, 0);
    return tp ? tc / tp : null;
  };

  type Ano = { a: number; m: (number | null)[]; p: number | null; curso?: boolean; proj?: boolean; pts?: number };
  const viva = (ano: string) => (dados.metrics.comissoes!.monthly_recent[ano] ?? []).map((v, i) => r2(v + comValor(ano, i)));
  const reais: Ano[] = [
    ...dados.com_hist.map((h) => ({ a: h.a, m: h.m as (number | null)[], p: h.p as number | null })),
    { a: 2025, m: viva("2025"), p: euroPonto("2025") },
    { a: 2026, m: viva("2026"), p: euroPonto("2026"), curso: true },
  ];

  const p25 = dados.metrics.pontos!.monthly_recent["2025"] ?? [];
  const t25 = p25.reduce((a, b) => a + b, 0);
  const peso = t25 ? p25.map((v) => v / t25) : p25.map(() => 1 / 12);
  const pontosProj = (() => {
    const base = metricas.pontos!.projection_values[0] ?? 0;
    const n = dados.projection_years.length;
    const vals = [base];
    for (let i = 1; i < n; i++) vals.push(base * Math.pow(fator, i));
    return vals;
  })();
  const futuros: Ano[] = [];
  let epAnterior = euroPonto("2026");
  dados.projection_years.slice(1).forEach((ano, k) => {
    const ptsAno = pontosProj[k + 1] ?? 0;
    const mm = peso.map((w) => r2(ptsAno * w * (epAnterior ?? 0)));
    futuros.push({ a: ano, m: mm, p: epAnterior, pts: ptsAno, proj: true });
    const totalAno = mm.reduce((a, b) => a + (b ?? 0), 0);
    epAnterior = ptsAno ? totalAno / ptsAno : epAnterior;
  });
  const anos: Ano[] = reais.concat(futuros);

  const total = (a: Ano) => a.m.reduce<number>((s, v) => s + (v || 0), 0);
  const cheios = (a: Ano) => a.m.filter((v) => v !== null).length;
  const media = (a: Ano) => (cheios(a) ? total(a) / cheios(a) : 0);
  const liq = (v: number) => v * (1 - IRS);
  const ref = anos.filter((a) => a.a >= 2020 && a.a <= 2025);
  const mediaMes = meses.map((_, i) => ref.reduce<number>((s, a) => s + (a.m[i] || 0), 0) / (ref.length || 1));
  const mediaAnual = anos.filter((a) => a.a >= 2019 && a.a <= 2024).reduce((s, a) => s + total(a), 0) / 6;
  const cres = (a: Ano, i: number): number | null => {
    const k = anos.indexOf(a);
    if (k <= 0) return null;
    const ant = anos[k - 1]!.m[i];
    if (!ant) return null;
    return (a.m[i] || 0) / ant;
  };
  const cresTot = (a: Ano): number | null => {
    const k = anos.indexOf(a);
    if (k <= 0) return null;
    const ant = total(anos[k - 1]!);
    return ant ? (total(a) - ant) / ant : null;
  };
  let acB = 0,
    acL = 0;
  const ac = anos.map((a) => {
    acB += total(a);
    acL += liq(total(a));
    return { b: acB, l: acL };
  });

  const a26 = anos.find((a) => a.a === 2026)!;
  const a25 = anos.find((a) => a.a === 2025)!;
  const feitos = a26.m.slice(0, 9).reduce<number>((s, v) => s + (v || 0), 0);
  const mesmo25 = a25.m.slice(0, 8).reduce<number>((s, v) => s + (v || 0), 0) + metricas.comissoes!.last_month_2025;

  const linhaTot = (nome: string, fn: (a: Ano) => number | null, forte?: boolean) => (
    <tr key={nome} className={forte ? "cm-forte" : undefined}>
      <td className="cm-y">{nome}</td>
      <td />
      {anos.map((a, i) => (
        <React.Fragment key={i}>
          <td className={`ev-num ${a.proj ? "cm-proj" : ""}`}>{nf(fn(a))}</td>
          <td className="cm-c" />
        </React.Fragment>
      ))}
    </tr>
  );

  return (
    <>
      <div className="events-summary">
        <div className="es-stat">
          <div className="es-value">{nf(feitos)}</div>
          <div className="es-label">bruto em 2026, até {dados.ytd_partial_day} de Setembro</div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nf(liq(feitos))}</div>
          <div className="es-label">líquido, depois dos 25%</div>
        </div>
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--good)" }}>
            +{Math.round((feitos / mesmo25 - 1) * 100)}%
          </div>
          <div className="es-label">face aos mesmos dias de 2025 ({nf(mesmo25)})</div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nf(total(a25))}</div>
          <div className="es-label">foi o ano de 2025 inteiro</div>
        </div>
      </div>
      <div className="events-card">
        <h3>
          Comissões, mês a mês e ano a ano <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-muted)" }}>desliza para o lado para ver todos os anos</span>
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table className="events-table" id="comTabela">
            <thead>
              <tr>
                <th className="cm-y">Mês</th>
                <th className="cm-y">Média mensal</th>
                {anos.map((a, i) => (
                  <React.Fragment key={i}>
                    <th style={{ textAlign: "right" }} className={a.proj ? "cm-proj" : ""}>
                      {a.a}
                      {a.curso && <span className="cm-tag">a decorrer</span>}
                      <div className="cm-ep">
                        {a.p ? `${nx(a.p)} €/pt` : ""}
                        {a.pts ? ` · ${Math.round(a.pts).toLocaleString("pt-PT")} pt` : ""}
                      </div>
                    </th>
                    <th className="cm-c">cres</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map((mes, i) => (
                <tr key={mes}>
                  <td className="cm-y">
                    <b>{mes}</b>
                  </td>
                  <td className="ev-num" style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                    {nf(mediaMes[i] ?? 0)}
                  </td>
                  {anos.map((a, k) => {
                    const v = a.m[i];
                    const c = cres(a, i);
                    return (
                      <React.Fragment key={k}>
                        <td className={`ev-num ${a.proj ? "cm-proj" : ""}`}>{v == null ? "—" : nf(v)}</td>
                        <td className="cm-c">{c === null ? "" : nx(c)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              <tr className="cm-sep">
                <td className="cm-y">
                  <b>Anual</b>
                </td>
                <td className="ev-num" style={{ fontWeight: 700 }}>
                  {nf(mediaAnual)}
                </td>
                {anos.map((_, i) => (
                  <React.Fragment key={i}>
                    <td />
                    <td className="cm-c" />
                  </React.Fragment>
                ))}
              </tr>
              {linhaTot("Total anual bruto", total, true)}
              {linhaTot("Total anual líquido", (a) => liq(total(a)))}
              {linhaTot("Acumulado bruto", (a) => ac[anos.indexOf(a)]!.b)}
              {linhaTot("Acumulado líquido", (a) => ac[anos.indexOf(a)]!.l)}
              {linhaTot("Média mensal bruta", media)}
              {linhaTot("Média mensal líquida", (a) => liq(media(a)))}
              <tr>
                <td className="cm-y">% cres. anual</td>
                <td />
                {anos.map((a, i) => {
                  const c = cresTot(a);
                  return (
                    <React.Fragment key={i}>
                      <td className={`ev-num ${a.proj ? "cm-proj" : ""}`} style={{ color: c === null ? "inherit" : c >= 0 ? "var(--good)" : "var(--bad)" }}>
                        {pct(c)}
                      </td>
                      <td className="cm-c" />
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function OutrasContas({
  dados,
  comValor,
  comMan,
  setComMan,
}: {
  dados: DadosMapas;
  comValor: (ano: string, i: number) => number;
  comMan: Record<string, number>;
  setComMan: (v: Record<string, number>) => void;
}): React.JSX.Element {
  const meses = dados.months;
  const anos = ["2025", "2026"];
  const nf = (v: number) => v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const base = (ano: string, i: number) => dados.metrics.comissoes!.monthly_recent[ano]?.[i] ?? 0;
  const tot = (ano: string) => meses.reduce((s, _, i) => s + comValor(ano, i), 0);

  function editar(ano: string, i: number, texto: string): void {
    const k = `${ano}:${i}`;
    const novo = { ...comMan };
    const v = parseFloat(texto.replace(",", "."));
    const original = dados.com_outras[ano]?.[i] ?? 0;
    if (!Number.isFinite(v)) {
      delete novo[k];
    } else if (v === original) {
      delete novo[k];
    } else {
      novo[k] = v;
    }
    setComMan(novo);
  }

  const nCorr = Object.keys(comMan).length;

  return (
    <div className="events-card">
      <div className="dnm-bar">
        <span>
          O que ganhaste fora da conta principal — contas da <b>Gabriela</b> e da <b>Sara</b>, somadas.
        </span>
        {nCorr > 0 && (
          <span>
            <b>{nCorr}</b> valor{nCorr === 1 ? "" : "es"} corrigido{nCorr === 1 ? "" : "s"} neste browser
          </span>
        )}
        <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(comMan, null, 1))}>
          Copiar as minhas correções
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="events-table" id="comOutras">
          <thead>
            <tr>
              <th>Mês</th>
              {anos.map((a) => (
                <th key={a} style={{ textAlign: "right" }}>
                  Outras contas {a.slice(2)}
                </th>
              ))}
              {anos.map((a) => (
                <th key={a} style={{ textAlign: "right" }}>
                  Total {a.slice(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meses.map((m, i) => (
              <tr key={m}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <b>{m}</b>
                </td>
                {anos.map((a) => (
                  <td key={a} style={{ textAlign: "right" }}>
                    <input
                      className="com-in"
                      type="number"
                      step="0.01"
                      min="0"
                      value={comValor(a, i) || ""}
                      placeholder="0"
                      onChange={(e) => editar(a, i, e.target.value)}
                    />
                  </td>
                ))}
                {anos.map((a) => (
                  <td key={a} className="ev-num" style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                    {nf(base(a, i) + comValor(a, i))} €
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              {anos.map((a) => (
                <td key={a} className="ev-num">
                  {nf(tot(a))} €
                </td>
              ))}
              {anos.map((a) => (
                <td key={a} className="ev-num">
                  {nf((dados.metrics.comissoes!.monthly_recent[a] ?? []).reduce((s, v) => s + v, 0) + tot(a))} €
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "10px 0 0" }}>
        Só tenho sessão na conta principal, por isso estas duas não se leem sozinhas. Os valores vieram da tua folha; se
        algum estiver errado, corrige no campo e tudo em cima atualiza. A correção fica guardada neste browser.
      </p>
    </div>
  );
}

function MapasEstilos(): React.JSX.Element {
  return (
    <style>{`
      .viz-root {
        --brand-900:#4b5320; --brand-700:#5a6728; --brand-tint-bg:#eef1e4; --brand-tint-fg:#4b5320;
        --good-tint-bg:#e4f3e4; --good:#0ca30c; --bad-tint-bg:#fbe7e4; --bad:#c0392b;
        --surface-1:#ffffff; --surface-2:#f7f8f2; --page-plane:#ffffff;
        --text-primary:#111111; --text-secondary:#6b6f61; --text-muted:#8a8d80;
        --grid:#eeeeee; --axis:#dcded4; --border:rgba(75,83,32,0.22); --border-soft:rgba(75,83,32,0.14);
        --shadow:0 6px 18px rgba(75,83,32,0.14),0 1px 3px rgba(11,11,11,0.06);
        --year-2024:#bfc7a0; --year-2025:#8e9963; --year-2026:#4b5320; --swatch-ring:rgba(75,83,32,0.35);
        --tooltip-bg:#2b2f18; --tooltip-text:#ffffff;
        color:var(--text-primary); font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      }
      .viz-root * { box-sizing:border-box; }
      .section-label { font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; }
      .section-note { font-size:12.5px; color:var(--text-muted); line-height:1.5; margin:-4px 0 16px; max-width:720px; }
      .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:30px; }
      @media (max-width:780px){ .kpi-grid { grid-template-columns:repeat(2,1fr); } }
      .kpi-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:16px 18px; box-shadow:var(--shadow); }
      .kpi-icon { width:34px; height:34px; border-radius:9px; background:var(--brand-tint-bg); display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
      .kpi-icon svg { width:17px; height:17px; stroke:var(--brand-tint-fg); fill:none; stroke-width:2; }
      .kpi-label { font-size:12px; color:var(--text-secondary); margin-bottom:4px; }
      .kpi-value { font-size:25px; font-weight:700; letter-spacing:-0.015em; }
      .kpi-delta { font-size:12.5px; margin-top:5px; color:var(--text-secondary); }
      .kpi-delta.up { color:var(--good); font-weight:600; }
      .kpi-sub { font-size:11.5px; color:var(--text-muted); margin-top:9px; }
      .legend-row { display:flex; align-items:center; gap:20px; flex-wrap:wrap; font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:18px; }
      .legend-row .grp { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
      .legend-item { display:flex; align-items:center; gap:7px; }
      .legend-swatch { width:13px; height:13px; border-radius:4px; display:inline-block; box-shadow:0 0 0 1px var(--swatch-ring) inset,0 1px 2px rgba(11,11,11,0.15); }
      .legend-line { width:18px; height:0; border-top:2.5px solid var(--brand-700); display:inline-block; }
      .legend-line.dashed { border-top-style:dashed; opacity:.65; }
      .metric-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:18px 20px 14px; margin-bottom:18px; box-shadow:var(--shadow); }
      .metric-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .metric-card h2 { font-size:15.5px; font-weight:700; margin:0 0 2px; }
      .metric-sub { font-size:12px; color:var(--text-muted); margin-bottom:14px; }
      .growth-chip { display:flex; align-items:baseline; gap:6px; background:var(--good-tint-bg); border-radius:10px; padding:6px 12px; white-space:nowrap; }
      .growth-chip .gv { font-size:15px; font-weight:700; color:var(--good); }
      .growth-chip .gl { font-size:11px; color:var(--text-secondary); }
      .growth-chip.down .gv { color:var(--text-secondary); }
      .growth-chip.down { background:var(--brand-tint-bg); }
      .chart-title { font-size:11.5px; color:var(--text-secondary); font-weight:600; margin-bottom:6px; text-transform:uppercase; letter-spacing:.03em; }
      svg.chart { display:block; width:100%; height:auto; overflow:visible; }
      .axis-label { font-size:10px; fill:var(--text-muted); }
      .bar-value-label { font-size:6.6px; font-weight:700; fill:var(--text-secondary); }
      .gridline { stroke:var(--grid); stroke-width:1; }
      .baseline { stroke:var(--axis); stroke-width:1; }
      .proj-section { background:var(--surface-2); border:1px solid var(--border-soft); border-radius:16px; padding:22px 22px 8px; margin-top:8px; }
      .proj-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
      @media (max-width:780px){ .proj-grid { grid-template-columns:1fr; } }
      .proj-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:16px 18px 10px; box-shadow:var(--shadow); }
      .proj-card h3 { font-size:13.5px; font-weight:700; margin:0 0 8px; }
      .proj-end { font-size:12px; color:var(--text-secondary); }
      .proj-end b { color:var(--text-primary); font-weight:700; }
      .proj-rate { font-size:11.5px; color:var(--text-muted); margin-top:2px; margin-bottom:8px; }
      .proj-rate.sim { color:var(--brand-700); font-weight:600; }
      .proj-sim { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:16px; }
      .proj-sim label { font-size:12.5px; font-weight:700; color:var(--text-primary); }
      .proj-sim input[type="number"] { width:90px; font-size:13.5px; font-family:inherit; padding:6px 9px; border:1px solid var(--border); border-radius:8px; background:var(--surface-1); color:var(--text-primary); }
      .proj-sim input:focus { outline:2px solid var(--brand-700); outline-offset:1px; }
      .proj-sim-hint { font-size:11.5px; color:var(--text-muted); }
      .proj-sim button { font-family:inherit; font-size:12px; font-weight:600; background:var(--brand-tint-bg); color:var(--brand-tint-fg); border:1px solid var(--border); border-radius:8px; padding:6px 12px; cursor:pointer; }
      .proj-sim button:hover { background:var(--border-soft); }
      .pat-hero { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:16px 20px; box-shadow:var(--shadow); margin-bottom:14px; }
      .pat-hero-top { display:flex; align-items:baseline; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:10px; }
      .pat-hero h3 { font-size:14.5px; font-weight:700; margin:0; }
      .pat-quando { font-size:20px; font-weight:700; color:var(--brand-700); }
      .pat-quando span { font-size:11.5px; font-weight:500; color:var(--text-secondary); margin-left:6px; }
      .pat-barra { position:relative; height:12px; border-radius:6px; background:var(--grid); overflow:hidden; margin:4px 0 7px; }
      .pat-barra span { display:block; height:100%; border-radius:6px; background:var(--brand-700); }
      .pat-legenda { display:flex; justify-content:space-between; gap:10px; font-size:11.5px; color:var(--text-muted); }
      .pat-legenda b { color:var(--text-primary); }
      .pat-tag { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.02em; color:var(--brand-900); background:var(--brand-tint-bg); border:1px solid var(--border-soft); border-radius:5px; padding:1px 6px; }
      .pat-topo { color:var(--good); font-weight:700; }
      .pat-sem { color:var(--text-muted); }
      .events-summary { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
      .es-stat { background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:12px 18px; box-shadow:var(--shadow); }
      .es-value { font-size:20px; font-weight:700; }
      .es-label { font-size:11.5px; color:var(--text-secondary); margin-top:2px; }
      .events-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:18px 20px; box-shadow:var(--shadow); margin-bottom:14px; }
      .events-card h3 { font-size:14.5px; font-weight:700; margin:0 0 14px; }
      table.events-table { width:100%; border-collapse:collapse; font-size:13px; }
      table.events-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--text-secondary); font-weight:700; padding:0 10px 8px; border-bottom:1px solid var(--border); }
      table.events-table td { padding:9px 10px; border-bottom:1px solid var(--grid); }
      table.events-table tbody tr:hover { background:var(--brand-tint-bg); }
      table.events-table .ev-name { font-weight:600; color:var(--text-primary); }
      table.events-table .ev-user { font-size:11px; color:var(--text-muted); margin-left:4px; }
      table.events-table td.ev-num { text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
      #comTabela th, #comTabela td { padding:6px 8px; font-size:12px; white-space:nowrap; }
      #comTabela th.cm-y, #comTabela td.cm-y { position:sticky; left:0; z-index:1; background:var(--surface-1); box-shadow:1px 0 0 var(--grid); text-align:left; }
      #comTabela tbody tr:hover td.cm-y { background:var(--brand-tint-bg); }
      #comTabela th.cm-c, #comTabela td.cm-c { text-align:right; font-size:10px; color:var(--text-muted); font-weight:500; padding-left:2px; padding-right:6px; background:var(--surface-2); }
      #comTabela .cm-proj { color:var(--text-muted); font-weight:500; }
      #comTabela .cm-ep { font-size:9.5px; font-weight:500; color:var(--text-muted); text-transform:none; letter-spacing:0; }
      #comTabela .cm-tag { font-size:9px; font-weight:700; color:var(--brand-700); margin-left:5px; }
      #comTabela tr.cm-sep td { border-top:2px solid var(--border); }
      #comTabela tr.cm-forte td { font-weight:700; }
      #comOutras input.com-in { width:86px; font-family:inherit; font-size:12.5px; text-align:right; padding:4px 7px; border:1px solid var(--border); border-radius:7px; background:var(--surface-1); color:var(--text-primary); font-variant-numeric:tabular-nums; }
      #comOutras input.com-in:focus { outline:2px solid var(--brand-700); outline-offset:1px; }
      #comOutras td { padding-top:5px; padding-bottom:5px; }
      .dnm-bar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:11.5px; color:var(--text-muted); margin-bottom:12px; }
      .dnm-bar button { font-family:inherit; font-size:11.5px; font-weight:600; background:var(--brand-tint-bg); color:var(--brand-tint-fg); border:1px solid var(--border); border-radius:8px; padding:5px 11px; cursor:pointer; }
      .dnm-bar b { color:var(--text-primary); }
      .dnm-tooltip { position:fixed; pointer-events:none; background:var(--tooltip-bg); color:var(--tooltip-text); font-size:12px; padding:6px 10px; border-radius:8px; white-space:nowrap; transform:translate(-50%,-100%); z-index:100; }
    `}</style>
  );
}
