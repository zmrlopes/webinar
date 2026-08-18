"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Presenca = "unknown" | "attended" | "absent";

export function CorrecaoPresenca({
  registrationId,
  presencaAtual,
}: {
  registrationId: string;
  presencaAtual: Presenca;
}) {
  const router = useRouter();
  const [aGravar, setAGravar] = useState(false);

  async function corrigir(presenca: Presenca): Promise<void> {
    setAGravar(true);
    try {
      await fetch("/api/admin/presenca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, presenca, minutos: null }),
      });
      router.refresh();
    } finally {
      setAGravar(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {(["attended", "absent", "unknown"] as const).map((opcao) => (
        <button
          key={opcao}
          type="button"
          disabled={aGravar || opcao === presencaAtual}
          onClick={() => corrigir(opcao)}
          style={{
            marginTop: 0,
            padding: "0.2rem 0.6rem",
            fontSize: "0.8rem",
            background: opcao === presencaAtual ? "#ddd" : undefined,
            color: opcao === presencaAtual ? "#333" : undefined,
          }}
        >
          {opcao === "attended" ? "esteve presente" : opcao === "absent" ? "faltou" : "unknown"}
        </button>
      ))}
    </div>
  );
}
