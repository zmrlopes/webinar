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
};

/**
 * Levar as respostas todas daqui para fora num gesto só — descarregar o
 * ficheiro ou copiar o texto. O CSV vem pronto do servidor
 * (csvRespostasHotel); aqui só se entrega.
 */
export function Exportar({ csv, total }: { csv: string; total: number }) {
  const [copiado, setCopiado] = useState(false);

  function descarregar(): void {
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
      <button type="button" onClick={descarregar} style={ESTILO_BOTAO}>
        Descarregar tudo (.csv)
      </button>
      <button type="button" onClick={copiar} style={ESTILO_BOTAO}>
        {copiado ? "Copiado!" : "Copiar tudo"}
      </button>
      <p className="ad-legenda" style={{ flexBasis: "100%", margin: "0.5rem 0 0" }}>
        As {total} resposta(s) em tabela, prontas a abrir no Excel, a enviar ao hotel, ou a colar numa
        conversa para alguém as analisar.
      </p>
    </div>
  );
}
