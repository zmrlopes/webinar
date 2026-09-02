"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Estado = "follow_up" | "convertido" | "desistiu";

const ROTULOS: Record<Estado, string> = {
  follow_up: "follow up",
  convertido: "convertido",
  desistiu: "desistiu",
};

export function CorrecaoEstado({
  leadEmail,
  estadoAtual,
}: {
  leadEmail: string;
  estadoAtual: Estado | null;
}) {
  const router = useRouter();
  const [aGravar, setAGravar] = useState(false);

  async function corrigir(estado: Estado): Promise<void> {
    setAGravar(true);
    try {
      await fetch("/api/admin/estado-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadEmail, estado }),
      });
      router.refresh();
    } finally {
      setAGravar(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {(["follow_up", "convertido", "desistiu"] as const).map((opcao) => (
        <button
          key={opcao}
          type="button"
          disabled={aGravar || opcao === estadoAtual}
          onClick={() => corrigir(opcao)}
          style={{
            marginTop: 0,
            padding: "0.2rem 0.6rem",
            fontSize: "0.8rem",
            background: opcao === estadoAtual ? "#ddd" : undefined,
            color: opcao === estadoAtual ? "#333" : undefined,
          }}
        >
          {ROTULOS[opcao]}
        </button>
      ))}
    </div>
  );
}
