"use client";

import { useMemo, useState } from "react";
import type { InscritoFaturacao } from "@/lib/teambuilding";
import { TROFEUS_JA_TENHO, trofeusPatamarEmFalta } from "@/lib/trofeus-lista";

type Valor = string | number | null;
type Chave =
  | "nome"
  | "email"
  | "nivel"
  | "vendas"
  | "adultos"
  | "criancasMais10"
  | "criancasMenos10"
  | "trofeusQuero"
  | "trofeusJaTenho"
  | "trofeusEmFalta";

/**
 * Ordenar troféus é ordenar pela quantidade. Quem ainda não respondeu fica
 * a null de propósito — assim vai sempre para o fim, em vez de se misturar
 * com quem respondeu e não quer nenhum.
 */
function quantos(escolhas: string[] | null): number | null {
  return escolhas === null ? null : escolhas.length;
}

function CelulaTrofeus({ escolhas }: { escolhas: string[] | null }) {
  if (escolhas === null) return <span className="ad-sem-dados">não respondeu</span>;
  if (escolhas.length === 0) return <span className="ad-sem-dados">nenhum</span>;
  return (
    <>
      {escolhas.map((c) => (
        <span className="ad-pilula" key={c}>
          {TROFEUS_JA_TENHO.find((t) => t.chave === c)?.curto ?? c}
        </span>
      ))}
    </>
  );
}

/**
 * Cruza o patamar (do CSV da equipa) com o que a pessoa já declarou ter
 * recebido — mostra os troféus de patamar que faltam entregar, mesmo que
 * não tenham sido pedidos no questionário. Três estados: patamar
 * desconhecido ou pessoa ainda sem resposta ("—", não dá para saber),
 * nada em falta ("em dia", a verde) e a lista do que falta (a laranja, para
 * chamar a atenção).
 */
function CelulaEmFalta({ nivel, jaTenho }: { nivel: string | null; jaTenho: string[] | null }) {
  const emFalta = trofeusPatamarEmFalta(nivel, jaTenho);
  if (emFalta === null) return <span className="ad-sem-dados">—</span>;
  if (emFalta.length === 0) return <span className="ad-pilula ad-pilula-ok">em dia</span>;
  return (
    <>
      {emFalta.map((c) => (
        <span className="ad-pilula ad-pilula-alerta" key={c}>
          {TROFEUS_JA_TENHO.find((t) => t.chave === c)?.curto ?? c}
        </span>
      ))}
    </>
  );
}

const COLUNAS: { chave: Chave; rotulo: string; valor: (i: InscritoFaturacao) => Valor }[] = [
  { chave: "nome", rotulo: "Nome", valor: (i) => i.nome },
  { chave: "email", rotulo: "Email", valor: (i) => i.email },
  { chave: "nivel", rotulo: "Patamar", valor: (i) => i.nivel },
  { chave: "vendas", rotulo: "Faturação própria", valor: (i) => i.vendas },
  { chave: "adultos", rotulo: "Adultos", valor: (i) => i.adultos },
  { chave: "criancasMais10", rotulo: "Crianças pagantes (+10)", valor: (i) => i.criancasMais10 },
  { chave: "criancasMenos10", rotulo: "Crianças não pagantes (-10)", valor: (i) => i.criancasMenos10 },
  { chave: "trofeusQuero", rotulo: "Troféus que quer", valor: (i) => quantos(i.trofeusQuero) },
  { chave: "trofeusJaTenho", rotulo: "Troféus que já tem", valor: (i) => quantos(i.trofeusJaTenho) },
  {
    chave: "trofeusEmFalta",
    rotulo: "Falta entregar",
    valor: (i) => quantos(trofeusPatamarEmFalta(i.nivel, i.trofeusJaTenho)),
  },
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
                  {c.rotulo}{" "}
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.95rem",
                      color: colunaOrdenada === c.chave ? "#4b5320" : "#c9c7bd",
                    }}
                  >
                    {colunaOrdenada === c.chave ? (direcao === "asc" ? "↑" : "↓") : "↕"}
                  </span>
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
              <td>{i.adultos}</td>
              <td>{i.criancasMais10}</td>
              <td>{i.criancasMenos10}</td>
              <td>
                <CelulaTrofeus escolhas={i.trofeusQuero} />
              </td>
              <td>
                <CelulaTrofeus escolhas={i.trofeusJaTenho} />
              </td>
              <td>
                <CelulaEmFalta nivel={i.nivel} jaTenho={i.trofeusJaTenho} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
