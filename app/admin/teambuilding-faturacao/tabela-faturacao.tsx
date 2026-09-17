"use client";

import { useMemo, useState } from "react";
import type { InscritoFaturacao } from "@/lib/teambuilding";
import {
  TROFEUS_JA_TENHO,
  trofeusFaturacaoEmFalta,
  trofeusPatamarEmFalta,
  type Trofeu,
} from "@/lib/trofeus-lista";

type Valor = string | number | null;

/**
 * Estado de uma pessoa perante um troféu específico:
 * - "sem-resposta": ainda não respondeu ao questionário — não sabemos nada.
 * - "tem": já o declarou como recebido.
 * - "falta": os dados (patamar ou faturação própria) dizem que já o
 *   alcançou, mas não está em "já tenho" — falta entregar-lho, mesmo que
 *   não o tenha pedido no questionário.
 * - "pedido": marcou "quero" no questionário, mas os dados não confirmam
 *   que já o tenha direito (só acontece com troféus de patamar).
 * - "nada": não tem, não foi pedido, e nada indica que falte.
 */
type EstadoTrofeu = "sem-resposta" | "tem" | "falta" | "pedido" | "nada";

function estadoDoTrofeu(t: Trofeu, i: InscritoFaturacao): EstadoTrofeu {
  if (i.trofeusJaTenho === null) return "sem-resposta";
  if (i.trofeusJaTenho.includes(t.chave)) return "tem";

  const emFalta = t.chave.startsWith("patamar-")
    ? trofeusPatamarEmFalta(i.nivel, i.trofeusJaTenho)
    : trofeusFaturacaoEmFalta(i.vendas, i.trofeusJaTenho);
  if (emFalta?.includes(t.chave)) return "falta";

  if ((i.trofeusQuero ?? []).includes(t.chave)) return "pedido";
  return "nada";
}

/** Para ordenar: quem tem mais urgência à frente. Sem resposta fica sempre no fim. */
function pesoEstado(estado: EstadoTrofeu): number | null {
  switch (estado) {
    case "tem":
      return 3;
    case "falta":
      return 2;
    case "pedido":
      return 1;
    case "nada":
      return 0;
    case "sem-resposta":
      return null;
  }
}

function BadgeTrofeu({ estado, trofeu }: { estado: EstadoTrofeu; trofeu: Trofeu }) {
  switch (estado) {
    case "sem-resposta":
      return (
        <span className="ad-sem-dados" title="ainda não respondeu ao questionário">
          —
        </span>
      );
    case "tem":
      return (
        <span className="ad-badge ad-badge-tem" title={`já tem — ${trofeu.rotulo}`}>
          ✓
        </span>
      );
    case "falta":
      return (
        <span className="ad-badge ad-badge-falta" title={`falta entregar — ${trofeu.rotulo}`}>
          !
        </span>
      );
    case "pedido":
      return (
        <span className="ad-badge ad-badge-pedido" title={`pediu, mas ainda não confirmado — ${trofeu.rotulo}`}>
          ○
        </span>
      );
    case "nada":
      return <span className="ad-badge-vazio">·</span>;
  }
}

interface ColunaBase {
  chave: string;
  rotulo: string;
  valor: (i: InscritoFaturacao) => Valor;
}

const COLUNAS_BASE: ColunaBase[] = [
  { chave: "nome", rotulo: "Nome", valor: (i) => i.nome },
  { chave: "email", rotulo: "Email", valor: (i) => i.email },
  { chave: "nivel", rotulo: "Patamar", valor: (i) => i.nivel },
  { chave: "vendas", rotulo: "Faturação própria", valor: (i) => i.vendas },
  { chave: "adultos", rotulo: "Adultos", valor: (i) => i.adultos },
  { chave: "criancasMais10", rotulo: "Crianças pagantes (+10)", valor: (i) => i.criancasMais10 },
  { chave: "criancasMenos10", rotulo: "Crianças não pagantes (-10)", valor: (i) => i.criancasMenos10 },
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
  const [colunaOrdenada, setColunaOrdenada] = useState<string>("vendas");
  const [direcao, setDirecao] = useState<"asc" | "desc">("desc");

  function alternarOrdenacao(chave: string): void {
    if (colunaOrdenada === chave) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setColunaOrdenada(chave);
      setDirecao("asc");
    }
  }

  function valorDaColuna(chave: string, i: InscritoFaturacao): Valor {
    const base = COLUNAS_BASE.find((c) => c.chave === chave);
    if (base) return base.valor(i);
    const trofeu = TROFEUS_JA_TENHO.find((t) => t.chave === chave);
    return trofeu ? pesoEstado(estadoDoTrofeu(trofeu, i)) : null;
  }

  const ordenados = useMemo(() => {
    const sinal = direcao === "asc" ? 1 : -1;
    return [...inscritos].sort(
      (a, b) => sinal * comparar(valorDaColuna(colunaOrdenada, a), valorDaColuna(colunaOrdenada, b)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscritos, colunaOrdenada, direcao]);

  function Cabecalho({ chave, rotulo }: { chave: string; rotulo: string }) {
    return (
      <th>
        <button type="button" className="ad-th-ordenar" onClick={() => alternarOrdenacao(chave)}>
          {rotulo}{" "}
          <span
            style={{
              display: "inline-block",
              fontSize: "0.95rem",
              color: colunaOrdenada === chave ? "#4b5320" : "#c9c7bd",
            }}
          >
            {colunaOrdenada === chave ? (direcao === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="ad-tabela-wrap">
      <table className="ad-tabela">
        <thead>
          <tr>
            {COLUNAS_BASE.map((c) => (
              <Cabecalho key={c.chave} chave={c.chave} rotulo={c.rotulo} />
            ))}
            {TROFEUS_JA_TENHO.map((t) => (
              <Cabecalho key={t.chave} chave={t.chave} rotulo={t.curto} />
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
              <td>{i.adultos}</td>
              <td>{i.criancasMais10}</td>
              <td>{i.criancasMenos10}</td>
              {TROFEUS_JA_TENHO.map((t) => (
                <td key={t.chave} style={{ textAlign: "center" }}>
                  <BadgeTrofeu estado={estadoDoTrofeu(t, i)} trofeu={t} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
