"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoEstadoInscricoes({ abertas }: { abertas: boolean }) {
  const router = useRouter();
  const [aAlterar, setAAlterar] = useState(false);

  async function alternar(): Promise<void> {
    const proximoEstado = !abertas;
    const acao = proximoEstado ? "reabrir" : "encerrar";
    if (!window.confirm(`Tens a certeza que queres ${acao} as inscrições para este evento?`)) return;
    setAAlterar(true);
    try {
      await fetch("/api/admin/eventos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abertas: proximoEstado }),
      });
      router.refresh();
    } finally {
      setAAlterar(false);
    }
  }

  return (
    <button
      type="button"
      disabled={aAlterar}
      onClick={alternar}
      style={{
        display: "inline-block",
        background: abertas ? "#ffffff" : "linear-gradient(135deg, #5d6b2a, #4b5320)",
        color: abertas ? "#c0392b" : "#ffffff",
        border: abertas ? "1px solid #c0392b" : "none",
        borderRadius: "8px",
        padding: "0.5rem 1rem",
        fontSize: "0.85rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: aAlterar ? "default" : "pointer",
      }}
    >
      {aAlterar ? "A alterar…" : abertas ? "Encerrar inscrições" : "Reabrir inscrições"}
    </button>
  );
}
