"use client";

import { useState } from "react";

const ESTILO_BOTAO: React.CSSProperties = {
  padding: "0.5rem 1.1rem",
  fontSize: "0.85rem",
  fontWeight: 700,
  borderRadius: "0.3rem",
  cursor: "pointer",
  background: "transparent",
  color: "#4b5320",
  border: "1px solid #4b5320",
  textDecoration: "none",
  display: "inline-block",
};

const ESTILO_BOTAO_PRINCIPAL: React.CSSProperties = {
  ...ESTILO_BOTAO,
  background: "#4b5320",
  color: "#ffffff",
  border: "none",
};

/**
 * Levar as respostas todas daqui para fora num gesto só. O Excel é o
 * principal — Tabela nativa a sério (filtros, cabeçalho fixo, linhas
 * alternadas), gerada no servidor (gerarExcelRespostasHotel), porque um
 * CSV aberto no Excel vem sempre como uma grelha genérica sem nada disso.
 * O CSV e o copiar ficam como alternativa, para quem quiser colar o texto
 * nalgum lado em vez de abrir um ficheiro.
 */
export function Exportar({ csv, total }: { csv: string; total: number }) {
  const [copiado, setCopiado] = useState(false);

  function descarregarCsv(): void {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const ancora = document.createElement("a");
    ancora.href = url;
    ancora.download = "quartos-hotel-teambuilding.csv";
    ancora.click();
    URL.revokeObjectURL(url);
  }

  async function copiar(): Promise<void> {
    await navigator.clipboard.writeText(csv);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (total === 0) return null;

  return (
    <div style={{ margin: "0 0 1.5rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <a href="/api/admin/hotel-exportar-excel" style={ESTILO_BOTAO_PRINCIPAL}>
        Descarregar em Excel (.xlsx)
      </a>
      <button type="button" onClick={descarregarCsv} style={ESTILO_BOTAO}>
        Descarregar tudo (.csv)
      </button>
      <button type="button" onClick={copiar} style={ESTILO_BOTAO}>
        {copiado ? "Copiado!" : "Copiar tudo"}
      </button>
      <p className="ad-legenda" style={{ flexBasis: "100%", margin: "0.5rem 0 0" }}>
        As {total} resposta(s) em tabela — o Excel já vem com filtros e cabeçalho fixo prontos; o CSV
        serve para enviar ao hotel ou colar numa conversa.
      </p>
    </div>
  );
}
