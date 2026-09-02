"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelarInscricao({ registrationId, nome }: { registrationId: string; nome: string }) {
  const router = useRouter();
  const [aCancelar, setACancelar] = useState(false);

  async function cancelar(): Promise<void> {
    if (!window.confirm(`Cancelar a inscrição de "${nome}"? Deixa de contar em todo o lado.`)) {
      return;
    }
    setACancelar(true);
    try {
      await fetch(`/api/admin/inscricoes/${registrationId}/cancelar`, { method: "POST" });
      router.refresh();
    } finally {
      setACancelar(false);
    }
  }

  return (
    <button
      type="button"
      disabled={aCancelar}
      onClick={cancelar}
      style={{
        marginTop: 0,
        padding: "0.2rem 0.6rem",
        fontSize: "0.8rem",
        background: "#ffffff",
        color: "#c0392b",
        border: "1px solid #c0392b",
      }}
    >
      {aCancelar ? "A cancelar…" : "Cancelar inscrição"}
    </button>
  );
}
