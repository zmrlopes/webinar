"use client";

import React, { useState } from "react";
import { DashboardEstilos } from "./estilos";

/**
 * Core Rank da iCliGo, contado por trimestre (90 dias — até 4 por ano): no
 * trimestre, 3.000€ em reservas próprias e 3 novos Travel Partners diretos
 * (entrados nesse trimestre) que chegam aos 1.000€ em reservas cada um. Os
 * números chegam mês a mês do dashboard_config ("core_rank") e são juntados
 * aqui em trimestres; nunca vivem no código, porque o repositório é público.
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
    /** Reservas próprias por mês, alinhadas com `meses` (Jan = 0). */
    v: number[];
    /** Diretos que entraram no ano: mês de entrada (índice de `meses`) e reservas acumuladas desde então. */
    novos: { u: string; n: string; mes: number; s: number }[];
  }[];
}

type Consultor = DadosCoreRank["consultores"][number];

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const eur = (v: number) => "€" + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

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
  const { vendas: metaV, novos: metaN, novoMin } = dados.meta;

  // Trimestres com pelo menos um mês de dados: T1 = Jan–Mar, T2 = Abr–Jun, …
  const nTri = Math.ceil(dados.meses.length / 3);
  const trimestres = Array.from({ length: nTri }, (_, t) => {
    const meses = [3 * t, 3 * t + 1, 3 * t + 2].filter((i) => i < dados.meses.length);
    const completo = meses.length === 3 && !(dados.parcial && meses.includes(dados.meses.length - 1));
    return { t, meses, nome: `${t + 1}.º trimestre`, intervalo: `${MESES_CURTOS[3 * t]}–${MESES_CURTOS[3 * t + 2]}`, completo };
  });
  const [tri, setTri] = useState(nTri - 1);

  const estado = (c: Consultor, t: number) => {
    const ms = trimestres[t]!.meses;
    const v = ms.reduce((s, i) => s + (c.v[i] ?? 0), 0);
    const entraram = c.novos.filter((x) => ms.includes(x.mes));
    const ativados = entraram.filter((x) => x.s >= novoMin);
    const okV = v >= metaV;
    const okN = ativados.length >= metaN;
    return { v, entraram, ativados, okV, okN, core: okV && okN };
  };

  // Totais do ano
  let totalCore = 0;
  const pessoasCore = new Set<string>();
  for (const c of dados.consultores)
    trimestres.forEach((_, t) => {
      if (estado(c, t).core) {
        totalCore++;
        pessoasCore.add(c.u);
      }
    });

  const atual = trimestres[tri]!;
  const emCurso = !atual.completo;

  const doTri = dados.consultores
    .map((c) => ({ c, e: estado(c, tri) }))
    .filter(({ e }) => e.v > 0 || e.entraram.length > 0)
    .map((x) => ({
      ...x,
      // Quem já trouxe gente nova sobe na lista, mesmo antes de essa gente chegar aos 1.000€.
      prog: Math.min(1, x.e.v / metaV) + Math.min(1, x.e.ativados.length / metaN) + Math.min(1, x.e.entraram.length / metaN) * 0.5,
    }))
    .sort((a, b) => b.prog - a.prog || b.e.v - a.e.v);
  const nCore = doTri.filter((x) => x.e.core).length;
  const nV = doTri.filter((x) => x.e.okV).length;
  const novosTri = doTri.flatMap(({ c, e }) => e.entraram.map((x) => ({ ...x, up: c })));
  novosTri.sort((a, b) => b.mes - a.mes || b.s - a.s);

  const linhasTri = doTri.map(({ c, e }) => {
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

  const linhasNovos = novosTri.map((x) => (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="ev-name">{x.n}</span>
        <span className="ev-user">@{x.u}</span>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="ev-name">{x.up.n}</span>
        <span className="ev-user">@{x.up.u}</span>
      </td>
      <td>{dados.meses[x.mes]}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MiniBarra valor={x.s} meta={novoMin} />
          <span className="ev-num" style={{ minWidth: 60, color: x.s >= novoMin ? "var(--good)" : undefined }}>
            {eur(x.s)}
          </span>
        </div>
      </td>
    </tr>
  ));

  // Grelha do ano: só quem tocou num dos dois critérios pelo menos uma vez
  const grelha = dados.consultores
    .map((c) => ({ c, es: trimestres.map((_, t) => estado(c, t)) }))
    .filter(({ es }) => es.some((e) => e.okV || e.okN))
    .sort(
      (a, b) =>
        b.es.filter((e) => e.core).length - a.es.filter((e) => e.core).length ||
        b.es.filter((e) => e.okV).length - a.es.filter((e) => e.okV).length,
    );

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
        {es.filter((e) => e.core).length}/4
      </td>
    </tr>
  ));

  return (
    <div className="viz-root">
      <DashboardEstilos />
      <div className="section-label">Core Rank — 4 por ano</div>
      <div className="section-note">
        Conta-se por <b>trimestre (90 dias)</b>, por isso cada consultor pode fazer até <b>4 Core Ranks no ano</b>. Em cada trimestre:{" "}
        <b>{eur(metaV)} em reservas próprias</b> e <b>{metaN} novos Travel Partners diretos</b>, entrados nesse trimestre, que chegam aos{" "}
        <b>{eur(novoMin)} em reservas</b> cada um (contadas desde que entraram até hoje). Dados até {dados.ate}.
      </div>

      <div className="proj-sim" style={{ flexWrap: "wrap" }}>
        {trimestres.map((q) => (
          <button
            key={q.t}
            type="button"
            onClick={() => setTri(q.t)}
            style={q.t === tri ? { background: "var(--brand-700)", color: "#fff", borderColor: "var(--brand-700)" } : undefined}
          >
            T{q.t + 1} · {q.intervalo}
          </button>
        ))}
      </div>

      <div className="events-summary">
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--good)" }}>
            {nCore}
          </div>
          <div className="es-label">
            atingiram o Core Rank no {atual.nome}
            {emCurso ? " (a decorrer)" : ""}
          </div>
        </div>
        <div className="es-stat">
          <div className="es-value">{nV}</div>
          <div className="es-label">já fizeram os {eur(metaV)} em reservas</div>
        </div>
        <div className="es-stat">
          <div className="es-value">{novosTri.length}</div>
          <div className="es-label">
            novos Travel Partners entraram ({novosTri.filter((x) => x.s >= novoMin).length} já com {eur(novoMin)})
          </div>
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
          A corrida no {atual.nome}{" "}
          <span className="events-card-date">
            {atual.intervalo}
            {emCurso ? ` · até ${dados.ate}` : ""} · passa o rato nos novos TP para ver quem são
          </span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>Consultor</th>
                <th>Reservas no trimestre</th>
                <th style={{ textAlign: "right" }}>Novos TP ativados</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhasTri.length ? (
                <Expansivel linhas={linhasTri} colSpan={4} />
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    Ninguém com reservas ou novos TP neste trimestre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="events-card">
        <h3>
          Novos Travel Partners no {atual.nome} <span className="events-card-date">quem entrou, quem o trouxe e quanto já reservou</span>
        </h3>
        <div className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>Novo TP</th>
                <th>Trazido por</th>
                <th>Entrou</th>
                <th>Reservas até hoje (meta {eur(novoMin)})</th>
              </tr>
            </thead>
            <tbody>
              {linhasNovos.length ? (
                <Expansivel linhas={linhasNovos} colSpan={4} />
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    Ainda não entrou ninguém neste trimestre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        O ano, trimestre a trimestre
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
                {trimestres.map((q) => (
                  <th key={q.t} style={{ textAlign: "center" }} title={q.intervalo}>
                    T{q.t + 1}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>★ no ano</th>
              </tr>
            </thead>
            <tbody>
              <Expansivel linhas={linhasGrelha} colSpan={trimestres.length + 2} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
