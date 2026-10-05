"use client";

import React, { useState } from "react";
import { DashboardEstilos } from "./estilos";

/**
 * Core Rank da iCliGo, tal como é ensinado na formação: num mês, 3.000€ em
 * reservas próprias e 3 novos Travel Partners diretos (entrados nesse mês)
 * que chegam aos 1.000€ em reservas cada um. Os números chegam do
 * dashboard_config ("core_rank"), nunca do código, porque o repositório é
 * público.
 */
export interface DadosCoreRank {
  ate: string;
  meses: string[];
  /** true se o último mês ainda está a decorrer. */
  parcial: boolean;
  meta: { vendas: number; novos: number; novoMin: number };
  consultores: {
    u: string;
    n: string;
    /** Reservas próprias por mês, alinhadas com `meses`. */
    v: number[];
    /** Diretos que entraram no ano: mês de entrada (índice de `meses`) e reservas acumuladas desde então. */
    novos: { u: string; n: string; mes: number; s: number }[];
  }[];
}

const eur = (v: number) => "€" + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const MES_LONGO: Record<string, string> = {
  Jan: "Janeiro",
  Fev: "Fevereiro",
  Mar: "Março",
  Abr: "Abril",
  Mai: "Maio",
  Jun: "Junho",
  Jul: "Julho",
  Ago: "Agosto",
  Set: "Setembro",
  Out: "Outubro",
  Nov: "Novembro",
  Dez: "Dezembro",
};

function Expansivel({ linhas, colSpan, visiveis = 12 }: { linhas: React.ReactNode[]; colSpan: number; visiveis?: number }): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const restantes = linhas.length - visiveis;
  return (
    <>
      {(aberto ? linhas : linhas.slice(0, visiveis)).map((l, i) => (
        <React.Fragment key={i}>{l}</React.Fragment>
      ))}
      {restantes > 0 && (
        <tr>
          <td className="tbl-more-cell" colSpan={colSpan} onClick={() => setAberto(!aberto)}>
            {aberto ? "Ver menos" : `Ver mais ${restantes}`}
          </td>
        </tr>
      )}
    </>
  );
}

function MiniBarra({ valor, meta }: { valor: number; meta: number }): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, (valor / meta) * 100));
  return (
    <div className="inc-corrida-bar" style={{ minWidth: 90 }}>
      <span style={{ width: `${pct.toFixed(1)}%`, background: pct >= 100 ? "var(--good)" : undefined }} />
    </div>
  );
}

export function CoreRankCliente({ dados }: { dados: DadosCoreRank }): React.JSX.Element {
  const ultimo = dados.meses.length - 1;
  const [mes, setMes] = useState(ultimo);
  const { vendas: metaV, novos: metaN, novoMin } = dados.meta;

  const estado = (c: DadosCoreRank["consultores"][number], i: number) => {
    const v = c.v[i] ?? 0;
    const entraram = c.novos.filter((x) => x.mes === i);
    const ativados = entraram.filter((x) => x.s >= novoMin);
    const okV = v >= metaV;
    const okN = ativados.length >= metaN;
    return { v, entraram, ativados, okV, okN, core: okV && okN };
  };

  // Totais do ano
  let totalCore = 0;
  const pessoasCore = new Set<string>();
  for (const c of dados.consultores)
    dados.meses.forEach((_, i) => {
      if (estado(c, i).core) {
        totalCore++;
        pessoasCore.add(c.u);
      }
    });

  const doMes = dados.consultores
    .map((c) => ({ c, e: estado(c, mes) }))
    .filter(({ e }) => e.v > 0 || e.entraram.length > 0)
    .map((x) => ({ ...x, prog: Math.min(1, x.e.v / metaV) + Math.min(1, x.e.ativados.length / metaN) }))
    .sort((a, b) => b.prog - a.prog || b.e.v - a.e.v);
  const nCore = doMes.filter((x) => x.e.core).length;
  const nV = doMes.filter((x) => x.e.okV).length;
  const nN = doMes.filter((x) => x.e.okN).length;
  const emCurso = dados.parcial && mes === ultimo;
  const nomeMes = MES_LONGO[dados.meses[mes] ?? ""] ?? dados.meses[mes];

  const linhasMes = doMes.map(({ c, e }) => {
    const faltaV = Math.max(0, metaV - e.v);
    const faltaN = Math.max(0, metaN - e.ativados.length);
    const falta = e.core
      ? null
      : [faltaV > 0 ? `${eur(faltaV)} em reservas` : null, faltaN > 0 ? `${faltaN} TP ativado${faltaN > 1 ? "s" : ""}` : null]
          .filter(Boolean)
          .join(" + ");
    return (
      <tr>
        <td style={{ whiteSpace: "nowrap" }}>
          <span className="ev-name">{c.n}</span>
          <span className="ev-user">@{c.u}</span>
        </td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MiniBarra valor={e.v} meta={metaV} />
            <span className="ev-num" style={{ minWidth: 70, color: e.okV ? "var(--good)" : undefined }}>
              {eur(e.v)}
            </span>
          </div>
        </td>
        <td className="ev-num" style={{ color: e.okN ? "var(--good)" : undefined }} title={e.entraram.map((x) => `${x.n}: ${eur(x.s)}`).join("\n")}>
          {e.ativados.length}/{metaN}
          <span style={{ fontWeight: 500, color: "var(--text-muted)" }}> · {e.entraram.length} entraram</span>
        </td>
        <td style={{ fontWeight: 600, color: e.core ? "var(--good)" : "var(--text-secondary)" }}>
          {e.core ? "★ Core Rank" : `falta ${falta}`}
        </td>
      </tr>
    );
  });

  // Grelha do ano: só quem tocou num dos dois critérios pelo menos uma vez
  const grelha = dados.consultores
    .map((c) => ({ c, es: dados.meses.map((_, i) => estado(c, i)) }))
    .filter(({ es }) => es.some((e) => e.okV || e.okN))
    .sort((a, b) => b.es.filter((e) => e.core).length - a.es.filter((e) => e.core).length || b.es.filter((e) => e.okV).length - a.es.filter((e) => e.okV).length);

  const linhasGrelha = grelha.map(({ c, es }) => (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="ev-name">{c.n}</span>
        <span className="ev-user">@{c.u}</span>
      </td>
      {es.map((e, i) => (
        <td key={i} className="ev-num" style={{ textAlign: "center", color: e.core ? "var(--good)" : "var(--text-muted)", fontWeight: e.core ? 700 : 500 }}>
          {e.core ? "★" : e.okV ? "3k" : e.okN ? "3TP" : "—"}
        </td>
      ))}
      <td className="ev-num" style={{ color: "var(--brand-700)" }}>
        {es.filter((e) => e.core).length}
      </td>
    </tr>
  ));

  return (
    <div className="viz-root">
      <DashboardEstilos />
      <div className="section-label">Core Rank</div>
      <div className="section-note">
        O primeiro marco de um Travel Partner: <b>num mês, {eur(metaV)} em reservas próprias</b> e <b>{metaN} novos Travel Partners diretos</b>,
        entrados nesse mês, que chegam aos <b>{eur(novoMin)} em reservas</b> cada um (contadas desde que entraram até hoje). Dados até {dados.ate}.
      </div>

      <div className="proj-sim" style={{ flexWrap: "wrap" }}>
        {dados.meses.map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMes(i)}
            style={i === mes ? { background: "var(--brand-700)", color: "#fff", borderColor: "var(--brand-700)" } : undefined}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="events-summary">
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--good)" }}>
            {nCore}
          </div>
          <div className="es-label">
            atingiram o Core Rank em {nomeMes}
            {emCurso ? " (mês a decorrer)" : ""}
          </div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nV}</div>
          <div className="es-label">fizeram os {eur(metaV)} em reservas</div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nN}</div>
          <div className="es-label">têm {metaN} novos TP ativados</div>
        </div>
        <div className="es-stat">
          <div className="es-value">{totalCore}</div>
          <div className="es-label">
            Core Ranks no ano, por {pessoasCore.size} consultor{pessoasCore.size === 1 ? "" : "es"}
          </div>
        </div>
      </div>

      <div className="events-card">
        <h3>
          A corrida em {nomeMes}{" "}
          <span className="events-card-date">
            {emCurso ? `até ${dados.ate} · ` : ""}passa o rato nos novos TP para ver quem são
          </span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>Consultor</th>
                <th>Reservas do mês</th>
                <th style={{ textAlign: "right" }}>Novos TP ativados</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhasMes.length ? (
                <Expansivel linhas={linhasMes} colSpan={4} />
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    Ninguém com reservas ou novos TP neste mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        O ano, mês a mês
      </div>
      <div className="events-card">
        <h3>
          Quem chegou lá <span className="events-card-date">★ Core Rank · 3k = só as reservas · 3TP = só os novos TP</span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table stick0">
            <thead>
              <tr>
                <th>Consultor</th>
                {dados.meses.map((m) => (
                  <th key={m} style={{ textAlign: "center" }}>
                    {m}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>★</th>
              </tr>
            </thead>
            <tbody>
              <Expansivel linhas={linhasGrelha} colSpan={dados.meses.length + 2} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
