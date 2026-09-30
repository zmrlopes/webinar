"use client";

import React, { useState } from "react";
import { DashboardEstilos } from "./estilos";
import type { DadosMapas } from "./mapas-cliente";

const ORDEM = ["faturacao", "comissoes", "pontos", "consultores"];

function fmt(v: number, unit: "eur" | "num", decimals: number): string {
  if (unit === "eur") {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} M€`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} k€`;
    return `${v.toLocaleString("pt-PT", { maximumFractionDigits: decimals })} €`;
  }
  return v.toLocaleString("pt-PT", { maximumFractionDigits: decimals });
}
function fmtFull(v: number, unit: "eur" | "num", decimals: number): string {
  return unit === "eur"
    ? `${v.toLocaleString("pt-PT", { maximumFractionDigits: decimals })} €`
    : v.toLocaleString("pt-PT", { maximumFractionDigits: decimals });
}

/**
 * Objetivos: objetivo mensal = real do mesmo mês em 2025 × fator. Cada mês fica
 * verde se cumpriu, vermelho se ficou abaixo, neutro se ainda não aconteceu.
 * Portado do artefacto, sobre o mesmo snapshot dos Mapas.
 */
export function ObjetivosCliente({ dados }: { dados: DadosMapas }): React.JSX.Element {
  const [texto, setTexto] = useState("3");
  const mult = (() => {
    const v = parseFloat((texto || "").replace(",", "."));
    return Number.isFinite(v) && v >= 0 ? v : 3;
  })();

  const through = dados.ytd_through_idx;
  const lastIdx = dados.ytd_partial_day ? through - 1 : through; // último mês fechado
  const curIdx = through;

  return (
    <div className="viz-root">
      <DashboardEstilos />
      <div className="section-label">Objetivo do ano</div>
      <div className="section-note">
        Define quanto queres crescer face a 2025 (ex.: 3 = triplicar) e o objetivo é repartido por mês seguindo a mesma
        sazonalidade de 2025 (objetivo do mês = real desse mês em 2025 × fator). Cada mês fica a{" "}
        <b style={{ color: "var(--good)" }}>verde</b> se atingiste o objetivo, ou a <b style={{ color: "var(--bad)" }}>vermelho</b>{" "}
        se ficaste abaixo.
      </div>
      <div className="proj-sim">
        <label htmlFor="dnm-goal">Objetivo de crescimento vs 2025</label>
        <input id="dnm-goal" type="number" step="0.1" min="0" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <span className="proj-sim-hint">3 = triplicar face a 2025, 2 = duplicar, 1.5 = crescer 50%…</span>
        <button type="button" onClick={() => setTexto("3")}>
          Repor 3x
        </button>
      </div>

      {ORDEM.map((key) => {
        const m = dados.metrics[key]!;
        const real2025 = m.monthly_recent["2025"] ?? [];
        const real2026 = m.monthly_recent["2026"] ?? [];
        const target = real2025.map((v) => v * mult);
        let ytdTarget = 0,
          ytdReal = 0;
        for (let i = 0; i <= lastIdx; i++) {
          ytdTarget += target[i] ?? 0;
          ytdReal += real2026[i] ?? 0;
        }
        const ytdPct = ytdTarget > 0 ? (ytdReal / ytdTarget) * 100 : 0;
        const onTrack = ytdReal >= ytdTarget;
        const annualTarget = target.reduce((a, b) => a + b, 0);
        const monthsElapsed = lastIdx + 1;
        const expectedPct = (monthsElapsed / 12) * 100;
        const actualPct = annualTarget > 0 ? (ytdReal / annualTarget) * 100 : 0;
        const paceOk = actualPct >= expectedPct;
        const expectedValue = annualTarget * (monthsElapsed / 12);

        return (
          <div key={key} className="goal-card">
            <div className="goal-head">
              <div>
                <h3>{m.label}</h3>
                <div className="goal-sub">
                  Objetivo anual: {fmtFull(annualTarget, m.unit, m.decimals)} (×{mult} vs 2025:{" "}
                  {fmtFull(real2025.reduce((a, b) => a + b, 0), m.unit, m.decimals)})
                </div>
              </div>
              <div className={`goal-badge ${onTrack ? "good" : "bad"}`}>
                <span className="gv">
                  {onTrack ? "▲" : "▼"} {ytdPct.toFixed(0)}%
                </span>
                <span className="gl">do objetivo cumprido Jan–{dados.months[lastIdx]}</span>
              </div>
            </div>
            <div className="goal-pace">
              <div className="goal-pace-row">
                <span className="gp-label">
                  Ritmo do objetivo anual, a {dados.months[lastIdx]} ({monthsElapsed} de 12 meses)
                </span>
                <span className="gp-values">
                  devia estar em <b className="exp">{fmtFull(expectedValue, m.unit, m.decimals)} ({expectedPct.toFixed(0)}%)</b> ·
                  está em{" "}
                  <b className={paceOk ? "good" : "bad"}>
                    {fmtFull(ytdReal, m.unit, m.decimals)} ({actualPct.toFixed(0)}%)
                  </b>
                </span>
              </div>
              <div className="goal-pace-bar">
                <div className={`goal-pace-fill ${paceOk ? "good" : "bad"}`} style={{ width: `${Math.max(0, Math.min(100, actualPct))}%` }} />
                <div className="goal-pace-marker" style={{ left: `${expectedPct}%` }}>
                  <span className="gp-marker-label">hoje</span>
                </div>
              </div>
            </div>
            <div className="goal-caption">
              Por mês: real ÷ objetivo desse mês (objetivo = real de 2025 no mesmo mês × {mult}). 100% = cumpriu; abaixo
              disso fica vermelho. O mês em curso aparece com <b>*</b> e fica neutro.
            </div>
            <div className="goal-cells">
              {dados.months.map((mo, i) => {
                const tgt = target[i] ?? 0;
                const real = real2026[i] ?? 0;
                const emCurso = i === curIdx && curIdx > lastIdx && dados.ytd_partial_day !== undefined;
                const isPending = i > lastIdx && !emCurso;
                const pct = tgt > 0 ? (real / tgt) * 100 : 0;
                const status = isPending || emCurso ? "pending" : real >= tgt ? "good" : "bad";
                const barPct = Math.max(0, Math.min(100, pct));
                return (
                  <div key={mo} className={`goal-cell ${status}`}>
                    <div className="gc-month">{mo}</div>
                    <div className="gc-real">{isPending ? "—" : fmt(real, m.unit, 0)}</div>
                    <div className="gc-target">obj. {fmt(tgt, m.unit, 0)}</div>
                    <div className="gc-bar">
                      <div className="gc-bar-fill" style={{ width: `${isPending ? 0 : barPct}%` }} />
                    </div>
                    <div className="gc-pct">{isPending ? "por vir" : `${pct.toFixed(0)}%${emCurso ? "*" : ""}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
