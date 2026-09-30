"use client";

import React, { useState } from "react";
import { DashboardEstilos } from "./estilos";

export interface DadosIncentivos {
  escaloes: Record<string, [number, number]>;
  junior: number;
  ate: string;
  meses: string[];
  linhas: { m: number; t: string; u: string; n: string; v: number; p: number; c: string; pr: string }[];
  metaFat: number;
  metaDir: number;
  anualFat: { u: string; n: string; s: number }[];
  anualDir: { u: string; n: string; a: number; d: number }[];
}

const eur = (v: number) => "€" + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const COR: Record<string, string> = {
  T: "var(--good)",
  G: "var(--brand-700)",
  "G*": "var(--brand-700)",
  A: "var(--text-secondary)",
  "A?": "var(--bad)",
  H: "var(--good)",
};
const CURTO: Record<string, string> = {
  "Almoço na terra dele": "Almoço com o upline",
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

function Barra({ nome, valor, meta, txt }: { nome: string; valor: number; meta: number; txt: string }): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, (valor / meta) * 100));
  return (
    <div className="inc-corrida">
      <div className="inc-corrida-top">
        <b>{nome}</b>
        <span>{txt}</span>
      </div>
      <div className="inc-corrida-bar">
        <span style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
    </div>
  );
}

/** Incentivos Tropa de Elite. Portado do artefacto. */
export function IncentivosCliente({ dados }: { dados: DadosIncentivos }): React.JSX.Element {
  const lider = dados.anualFat[0]!;
  const segundo = dados.anualFat[1]!;
  const topDir = dados.anualDir[0]!;
  const totalPremios = dados.linhas.filter((l) => l.c !== "A?").length;

  // por pessoa
  const porPessoa = new Map<string, { u: string; n: string; pr: typeof dados.linhas }>();
  for (const l of dados.linhas) {
    if (!porPessoa.has(l.u)) porPessoa.set(l.u, { u: l.u, n: l.n, pr: [] });
    porPessoa.get(l.u)!.pr.push(l);
  }
  const pessoas = [...porPessoa.values()];
  pessoas.forEach((p) => p.pr.sort((a, b) => a.m - b.m));
  pessoas.sort((a, b) => b.pr.length - a.pr.length || a.n.localeCompare(b.n, "pt"));

  const pRows = pessoas.map((p) => (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className="ev-name">{p.n}</span>
        <span className="ev-user">@{p.u}</span>
      </td>
      <td>
        {p.pr.map((l, i) => {
          const falta = l.c === "A?";
          return (
            <span key={i} className={`inc-premio${falta ? " falta" : ""}`}>
              <span className="ip-mes">{dados.meses[l.m]?.slice(0, 3)}</span>
              <span className="ip-nome">{CURTO[l.pr] || l.pr}</span>
              {falta && <span style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--bad)" }}>por entregar</span>}
            </span>
          );
        })}
      </td>
      <td className="ev-num">{p.pr.length}</td>
    </tr>
  ));

  const mesesComPremio = [...new Set(dados.linhas.map((l) => l.m))].sort((a, b) => b - a);

  return (
    <div className="viz-root">
      <DashboardEstilos />
      <div className="section-label">Incentivos Tropa de Elite</div>
      <div className="events-summary">
        <div className="es-stat">
          <div className="es-value">{totalPremios}</div>
          <div className="es-label">prémios atribuídos este ano, de Janeiro a Setembro</div>
        </div>
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--brand-700)" }}>
            {eur(dados.metaFat - lider.s)}
          </div>
          <div className="es-label">
            é o que falta à <b>{lider.n}</b> para o prémio dos {eur(dados.metaFat)}
          </div>
        </div>
        <div className="es-stat">
          <div className="es-value" style={{ color: "var(--brand-700)" }}>
            {eur(dados.metaFat - segundo.s)}
          </div>
          <div className="es-label">
            é o que falta à <b>{segundo.n}</b>, logo atrás
          </div>
        </div>
        <div className="es-stat">
          <div className="es-value">
            {topDir.a}
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>/{dados.metaDir}</span>
          </div>
          <div className="es-label">
            melhor marca nos diretos ativados (<b>{topDir.n}</b>) · ninguém chegou às Maldivas
          </div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        A corrida aos prémios anuais
      </div>
      <div className="events-card">
        <div className="inc-corridas">
          <div>
            <h3 style={{ marginBottom: 12 }}>
              {eur(dados.metaFat)} de faturação <span className="events-card-date">viagem, PC, telemóvel ou o Congresso de Janeiro</span>
            </h3>
            {dados.anualFat.map((x) => (
              <Barra key={x.u} nome={x.n} valor={x.s} meta={dados.metaFat} txt={`${eur(x.s)} · faltam ${eur(Math.max(0, dados.metaFat - x.s))}`} />
            ))}
          </div>
          <div>
            <h3 style={{ marginBottom: 12 }}>
              {dados.metaDir} diretos ativados <span className="events-card-date">viagem às Maldivas</span>
            </h3>
            {dados.anualDir.map((x) => (
              <Barra
                key={x.u}
                nome={x.n}
                valor={x.a}
                meta={dados.metaDir}
                txt={`${x.a} ativados de ${x.d} que entraram em 2026 · faltam ${Math.max(0, dados.metaDir - x.a)}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        O que cada um tem a receber
      </div>
      <div className="events-card">
        <h3>Prémios por consultor</h3>
        <div className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>Consultor</th>
                <th>Prémios</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <Expansivel linhas={pRows} colSpan={3} />
            </tbody>
            <tfoot>
              <tr>
                <td>{pessoas.length} consultores</td>
                <td />
                <td className="ev-num">{dados.linhas.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        Vencedores, mês a mês
      </div>
      {mesesComPremio.map((m) => {
        const esc = dados.escaloes[String(m)] ?? [0, 0];
        const linhasM = dados.linhas.filter((l) => l.m === m);
        const fat = linhasM.filter((l) => l.t === "F");
        const eq = linhasM.filter((l) => l.t === "E");
        return (
          <div key={m} className="events-card">
            <h3>
              {dados.meses[m]}
              <span className="events-card-date">
                tablet a partir de {eur(esc[0])} · gift a partir de {eur(esc[1])} · almoço júnior a partir de {eur(dados.junior)}
              </span>
            </h3>
            <div className="events-table-wrap">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Consultor</th>
                    <th style={{ textAlign: "right" }}>Faturação</th>
                    <th style={{ textAlign: "right" }}>Pontos</th>
                    <th>Prémio</th>
                  </tr>
                </thead>
                <tbody>
                  {fat.map((l, i) => (
                    <tr key={`f${i}`}>
                      <td>
                        <span className="ev-name">{l.n}</span>
                        <span className="ev-user">@{l.u}</span>
                      </td>
                      <td className="ev-num">{eur(l.v)}</td>
                      <td className="ev-num" style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                        {l.p.toFixed(1)}
                        {l.p <= 15 && <b style={{ color: "var(--brand-700)" }}> jr</b>}
                      </td>
                      <td style={{ color: COR[l.c], fontWeight: 600 }}>
                        {l.pr}
                        {l.c === "G*" && (
                          <span title="Não foi o escalão automático — decisão tua" style={{ color: "var(--text-muted)" }}>
                            {" "}
                            *
                          </span>
                        )}
                        {l.c === "A?" && <span style={{ color: "var(--bad)" }}> — não entregue</span>}
                      </td>
                    </tr>
                  ))}
                  {eq.map((l, i) => (
                    <tr key={`e${i}`}>
                      <td>
                        <span className="ev-name">{l.n}</span>
                        <span className="ev-user">@{l.u}</span>
                      </td>
                      <td className="ev-num" colSpan={2} style={{ textAlign: "right" }}>
                        {l.v} diretos ativados de {l.p}
                      </td>
                      <td style={{ color: COR[l.c], fontWeight: 600 }}>{l.pr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
