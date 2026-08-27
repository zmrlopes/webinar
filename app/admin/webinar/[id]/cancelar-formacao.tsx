"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelarFormacao({ webinarId, titulo }: { webinarId: string; titulo: string }) {
  const router = useRouter();
  const [aCancelar, setACancelar] = useState(false);

  async function cancelar(): Promise<void> {
    if (!window.confirm(`Cancelar a formação "${titulo}"? Não aparece mais no painel do consultor.`)) {
      return;
    }
    setACancelar(true);
    try {
      await fetch(`/api/admin/formacoes/${webinarId}/cancelar`, { method: "POST" });
      router.push("/admin");
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
        background: "#ffffff",
        color: "#c0392b",
        border: "1px solid #c0392b",
        fontSize: "0.85rem",
        padding: "0.4rem 0.9rem",
      }}
    >
      {aCancelar ? "A cancelar…" : "Cancelar formação"}
    </button>
  );
}
