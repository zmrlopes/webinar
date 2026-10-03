"use client";

import { useState } from "react";

/** Um toque copia a fórmula; depois é só colar na célula A1 da Google Sheet. */
export function CopiarFormula({ formula }: { formula: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(formula);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="bc-formula">
      <button type="button" onClick={copiar} className="bc-botao">
        {copiado ? "Copiado ✓" : "Copiar fórmula para o Google Sheets"}
      </button>
      <code>{formula}</code>
    </div>
  );
}
