"use client";

import React, { useState } from "react";
import { DashboardEstilos } from "./estilos";

export interface DadosLinhaDireta {
  meses: string[];
  geral: number[];
  ate: string;
  linhas: { u: string; n: string; c: string; m: number[] }[];
  anos: { ano: number; diretos: number; geral: number; eq: number; pessoais: number; parcial?: boolean }[];
  hist: { u: string; n: string; v: number[] }[];
}

const nf = (v: number, d: number) => v.toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d });

function Expansivel({ linhas, colSpan, visiveis = 10 }: { linhas: React.ReactNode[]; colSpan: number; visiveis?: number }): React.JSX.Element {
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

/** Linha direta — pontos por consultor, mês a mês. Portado da folha V2 do artefacto. */
export function LinhaDiretaCliente({ dados }: { dados: DadosLinhaDireta }): React.JSX.Element {
  const geralTot = dados.geral.reduce((a, b) => a + b, 0);
  const linhas = dados.linhas
    .map((l) => {
      const tot = Math.round(l.m.reduce((a, b) => a + b, 0) * 100) / 100;
      return { ...l, tot, pct: geralTot ? (tot / geralTot) * 100 : 0 };
    })
    .sort((a, b) => b.tot - a.tot);
  const produtores = linhas.filter((l) => l.tot > 0);
  const eqTot = Math.round(linhas.reduce((a, l) => a + l.tot, 0) * 100) / 100;
  const topo = produtores[0];
  const mesesTot = dados.meses.map((_, i) => linhas.reduce((a, l) => a + (l.m[i] ?? 0), 0));

  const cel = (v: number, k: number) =>
    v > 0 ? (
      <td key={k} className="ev-num">
        {nf(v, 2)}
      </td>
    ) : (
      <td key={k} className="ev-num" style={{ color: "var(--text-muted)", fontWeight: 500 }}>
        —
      </td>
    );

  const linhasMensais = linhas.map((l) => (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="ev-name">{l.u}</span>
        {l.n && <span className="ev-user">{l.n}</span>}
        {l.c === "s" && (
          <span className="v2-tag" title="Direto da conta Sara Miranda">
            S
          </span>
        )}
      </td>
      {l.m.map((v, i) => cel(v, i))}
      <td className="ev-num" style={{ color: "var(--brand-700)" }}>
        {nf(l.tot, 2)}
      </td>
      <td className="ev-num">{l.tot > 0 ? nf(l.pct, 2) + "%" : "—"}</td>
    </tr>
  ));

  const maxG = Math.max(...dados.anos.map((a) => a.geral));
  const anosOrd = dados.anos.map((a) => a.ano);

  const histRows = dados.hist.map((h) => {
    const ult = h.v[4] ?? 0,
      pen = h.v[3] ?? 0;
    const seta =
      ult > 0 && pen > 0 ? (
        ult > pen ? (
          <span style={{ color: "var(--good)" }}>▲</span>
        ) : ult < pen ? (
          <span style={{ color: "var(--bad)" }}>▼</span>
        ) : null
      ) : ult > 0 && pen === 0 ? (
        <span style={{ color: "var(--good)" }}>novo</span>
      ) : ult === 0 && pen > 0 ? (
        <span style={{ color: "var(--bad)" }}>parou</span>
      ) : null;
    return (
      <tr>
        <td style={{ whiteSpace: "nowrap" }}>
          <span className="ev-name">{h.u}</span>
          {h.n && <span className="ev-user">{h.n}</span>}
        </td>
        {h.v.map((v, i) =>
          v > 0 ? (
            <td key={i} className="ev-num" style={i === 4 ? { color: "var(--brand-700)" } : undefined}>
              {nf(v, 1)}
            </td>
          ) : (
            <td key={i} className="ev-num" style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              —
            </td>
          ),
        )}
        <td className="ev-num" style={{ fontWeight: 600 }}>
          {seta}
        </td>
      </tr>
    );
  });

  return (
    <div className="viz-root">
      <DashboardEstilos />
      <div className="section-label">Linha direta — pontos por consultor, mês a mês</div>
      <div className="events-summary">
        <div className="es-stat">
          <div className="es-value">{linhas.length}</div>
          <div className="es-label">consultores diretos nas 3 contas</div>
        </div>
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--brand-700)" }}>
            {produtores.length}
          </div>
          <div className="es-label">
            produziram pontos este ano · <b>{linhas.length - produtores.length} estão a zero</b>
          </div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nf(eqTot, 2)}</div>
          <div className="es-label">pontos da linha direta · {nf(geralTot ? (eqTot / geralTot) * 100 : 0, 1)}% do negócio</div>
        </div>
        {topo && (
          <div className="es-stat">
            <div className="es-value">{nf(topo.pct, 1)}%</div>
            <div className="es-label">
              é quanto o <b>{topo.u}</b> vale sozinho
            </div>
          </div>
        )}
      </div>

      <div className="events-card">
        <h3>
          Pontos por mês <span className="events-card-date">2026 · desliza para o lado; o último mês vai até {dados.ate}</span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table stick0">
            <thead>
              <tr>
                <th>Consultor</th>
                {dados.meses.map((m) => (
                  <th key={m} style={{ textAlign: "right" }}>
                    {m}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }} title="Peso nos pontos totais do negócio">
                  % neg.
                </th>
              </tr>
            </thead>
            <tbody>
              <Expansivel linhas={linhasMensais} colSpan={dados.meses.length + 3} />
            </tbody>
            <tfoot>
              <tr>
                <td>Linha direta</td>
                {mesesTot.map((v, i) => (
                  <td key={i} className="ev-num">
                    {nf(v, 2)}
                  </td>
                ))}
                <td className="ev-num">{nf(eqTot, 2)}</td>
                <td className="ev-num">{nf(geralTot ? (eqTot / geralTot) * 100 : 0, 1)}%</td>
              </tr>
              <tr>
                <td>Negócio todo</td>
                {dados.geral.map((v, i) => (
                  <td key={i} className="ev-num">
                    {nf(v, 2)}
                  </td>
                ))}
                <td className="ev-num">{nf(geralTot, 2)}</td>
                <td className="ev-num">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 26 }}>
        Evolução da linha direta, ano a ano
      </div>
      <div className="v2-anos">
        {dados.anos.map((a) => {
          const pesoEq = a.geral ? (a.eq / a.geral) * 100 : 0;
          return (
            <div key={a.ano} className="v2-ano">
              <div className="v2-ano-top">
                <b>{a.ano}</b>
                {a.parcial && <span className="v2-ano-parcial">até {dados.meses[dados.meses.length - 1]}</span>}
              </div>
              <div className="v2-ano-barra">
                <span style={{ width: `${((a.geral / maxG) * 100).toFixed(1)}%` }} />
              </div>
              <div className="v2-ano-val">
                {nf(a.geral, 0)} <span>pontos</span>
              </div>
              <div className="v2-ano-sub">
                {a.diretos} diretos · {nf(pesoEq, 0)}% vem deles
              </div>
              <div className="v2-ano-sub">pessoais: {nf(a.pessoais, 1)}</div>
            </div>
          );
        })}
      </div>

      <div className="events-card">
        <h3>
          Cada consultor, em todos os anos <span className="events-card-date">2022–2026 · quem cresceu, quem parou</span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table stick0">
            <thead>
              <tr>
                <th>Consultor</th>
                {anosOrd.map((a) => (
                  <th key={a} style={{ textAlign: "right" }}>
                    {a}
                    {a === 2026 ? "*" : ""}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>26 vs 25</th>
              </tr>
            </thead>
            <tbody>
              <Expansivel linhas={histRows} colSpan={anosOrd.length + 2} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
