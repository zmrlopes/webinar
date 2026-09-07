"use client";

import { useMemo, useState } from "react";
import type { InscritoFaturacao } from "@/lib/teambuilding";

type Valor = string | number | null;
type Chave = "nome" | "email" | "nivel" | "vendas";

const COLUNAS: { chave: Chave; rotulo: string; valor: (i: InscritoFaturacao) => Valor }[] = [
  { chave: "nome", rotulo: "Nome", valor: (i) => i.nome },
  { chave: "email", rotulo: "Email", valor: (i) => i.email },
  { chave: "nivel", rotulo: "Patamar", valor: (i) => i.nivel },
  { chave: "vendas", rotulo: "Faturação própria", valor: (i) => i.vendas },
];

/** null/undefined ficam sempre no fim, independentemente da direção. */
function comparar(a: Valor, b: Valor): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-PT");
}

export function TabelaFaturacao({ inscritos }: { inscritos: InscritoFaturacao[] }) {
  const [colunaOrdenada, setColunaOrdenada] = useState<Chave>("vendas");
  const [direcao, setDirecao] = useState<"asc" | "desc">("desc");

  function alternarOrdenacao(chave: Chave): void {
    if (colunaOrdenada === chave) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setColunaOrdenada(chave);
      setDirecao("asc");
    }
  }

  const ordenados = useMemo(() => {
    const coluna = COLUNAS.find((c) => c.chave === colunaOrdenada);
    if (!coluna) return inscritos;
    const sinal = direcao === "asc" ? 1 : -1;
    return [...inscritos].sort((a, b) => sinal * comparar(coluna.valor(a), coluna.valor(b)));
  }, [inscritos, colunaOrdenada, direcao]);

  return (
    <div className="ad-tabela-wrap">
      <table className="ad-tabela">
        <thead>
          <tr>
            {COLUNAS.map((c) => (
              <th key={c.chave}>
                <button type="button" className="ad-th-ordenar" onClick={() => alternarOrdenacao(c.chave)}>
                  {c.rotulo} {colunaOrdenada === c.chave ? (direcao === "asc" ? "▲" : "▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((i) => (
            <tr key={i.email}>
              <td>{i.nome}</td>
              <td>{i.email}</td>
              <td>{i.nivel ?? <span className="ad-sem-dados">sem dados</span>}</td>
              <td>
                {i.vendas !== null ? (
                  `${i.vendas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}€`
                ) : (
                  <span className="ad-sem-dados">sem dados</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
