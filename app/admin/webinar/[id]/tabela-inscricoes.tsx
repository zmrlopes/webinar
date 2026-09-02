"use client";

import { useMemo, useState } from "react";
import type { InscricaoAdmin } from "@/lib/admin";
import { CancelarInscricao } from "./cancelar-inscricao";
import { CorrecaoEstado } from "./correcao-estado";
import { CorrecaoPresenca } from "./correcao-presenca";

type Valor = string | number | boolean | null;

interface Coluna {
  chave: string;
  rotulo: string;
  valor: (i: InscricaoAdmin) => Valor;
}

const COLUNAS_BASE: Coluna[] = [
  { chave: "nome", rotulo: "Nome", valor: (i) => i.nome },
  { chave: "apelido", rotulo: "Apelido", valor: (i) => i.apelido },
  { chave: "telemovel", rotulo: "Telemóvel", valor: (i) => i.telemovel },
  { chave: "email", rotulo: "Email", valor: (i) => i.email },
];

const COLUNA_CONVIDADO_POR: Coluna = {
  chave: "convidadoPor",
  rotulo: "Convidado por",
  valor: (i) => i.referenciaNome ?? i.referencia,
};

const COLUNA_ESTADO: Coluna = { chave: "estado", rotulo: "Estado", valor: (i) => i.estado };

const COLUNAS_FINAIS: Coluna[] = [
  { chave: "link", rotulo: "Link", valor: (i) => i.linkEstado },
  { chave: "clicouZoom", rotulo: "Clicou no Zoom", valor: (i) => i.clicouZoom },
  { chave: "erroLink", rotulo: "Erro do link", valor: (i) => i.linkUltimoErro },
  { chave: "presenca", rotulo: "Presença", valor: (i) => i.presenca },
  { chave: "minutos", rotulo: "Minutos", valor: (i) => i.presencaMinutos },
];

/** null/undefined ficam sempre no fim, independentemente da direção. */
function comparar(a: Valor, b: Valor): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-PT");
}

export function TabelaInscricoes({
  inscricoes,
  mostrarConvidadoPor,
}: {
  inscricoes: InscricaoAdmin[];
  mostrarConvidadoPor: boolean;
}) {
  const [colunaOrdenada, setColunaOrdenada] = useState<string | null>(null);
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");
  const [pesquisa, setPesquisa] = useState("");

  const colunas = mostrarConvidadoPor
    ? [...COLUNAS_BASE, COLUNA_CONVIDADO_POR, ...COLUNAS_FINAIS, COLUNA_ESTADO]
    : [...COLUNAS_BASE, ...COLUNAS_FINAIS];

  function alternarOrdenacao(chave: string): void {
    if (colunaOrdenada === chave) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setColunaOrdenada(chave);
      setDirecao("asc");
    }
  }

  const inscricoesFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    if (!termo) return inscricoes;
    return inscricoes.filter((i) => `${i.nome} ${i.apelido} ${i.email}`.toLowerCase().includes(termo));
  }, [inscricoes, pesquisa]);

  const inscricoesOrdenadas = useMemo(() => {
    if (!colunaOrdenada) return inscricoesFiltradas;
    const coluna = colunas.find((c) => c.chave === colunaOrdenada);
    if (!coluna) return inscricoesFiltradas;
    const sinal = direcao === "asc" ? 1 : -1;
    return [...inscricoesFiltradas].sort((a, b) => sinal * comparar(coluna.valor(a), coluna.valor(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscricoesFiltradas, colunaOrdenada, direcao]);

  return (
    <div>
      <input
        type="text"
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
        placeholder="Pesquisar por nome ou email…"
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "0.9rem",
          width: "100%",
          maxWidth: 320,
          boxSizing: "border-box",
        }}
      />
      {pesquisa.trim() !== "" && (
        <p className="ad-legenda" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          {inscricoesFiltradas.length} de {inscricoes.length}
        </p>
      )}
      <div className="ad-tabela-wrap">
      <table className="ad-tabela">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave}>
                <button type="button" className="ad-th-ordenar" onClick={() => alternarOrdenacao(c.chave)}>
                  {c.rotulo}
                  {colunaOrdenada === c.chave && <span> {direcao === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
            ))}
            <th>Corrigir</th>
          </tr>
        </thead>
        <tbody>
          {inscricoesOrdenadas.map((i) => (
            <tr key={i.id}>
              <td>{i.nome}</td>
              <td>{i.apelido}</td>
              <td>{i.telemovel ?? "—"}</td>
              <td>{i.email}</td>
              {mostrarConvidadoPor && (
                <td>
                  {i.referencia ? (
                    <>
                      <div>{i.referenciaNome ?? i.referencia}</div>
                      {i.referenciaNome && (
                        <div className="ad-legenda" style={{ margin: 0 }}>
                          {i.referencia}
                        </div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              )}
              <td>
                <span className="ad-etiqueta">{i.linkEstado}</span>
              </td>
              <td>{i.clicouZoom ? "Sim" : "—"}</td>
              <td style={{ maxWidth: 260, fontSize: "0.85rem" }}>
                {i.linkUltimoErro ? `(${i.linkTentativas}x) ${i.linkUltimoErro}` : "—"}
              </td>
              <td>{i.presenca}</td>
              <td>{i.presencaMinutos ?? "—"}</td>
              {mostrarConvidadoPor && <td>{i.estado ?? "—"}</td>}
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <CorrecaoPresenca registrationId={i.id} presencaAtual={i.presenca} />
                  {mostrarConvidadoPor && <CorrecaoEstado leadEmail={i.email} estadoAtual={i.estado} />}
                  <CancelarInscricao registrationId={i.id} nome={`${i.nome} ${i.apelido}`.trim()} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
