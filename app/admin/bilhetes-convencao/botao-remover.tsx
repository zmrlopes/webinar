"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ESTILO: React.CSSProperties = {
  margin: 0,
  padding: "0.25rem 0.75rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  background: "transparent",
  color: "#a33",
  border: "1px solid #a33",
  borderRadius: "999px",
  whiteSpace: "nowrap",
};

export function BotaoRemover({ id, nome, email }: { id: number; nome: string; email: string }) {
  const router = useRouter();
  const [aApagar, setAApagar] = useState(false);

  async function remover(): Promise<void> {
    if (!window.confirm(`Remover o pedido de ${nome}${email ? ` (${email})` : ""}? Não dá para desfazer.`)) return;
    setAApagar(true);
    const resposta = await fetch("/api/admin/bilhetes-convencao/apagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    if (!resposta?.ok) {
      const corpo = (await resposta?.json().catch(() => null)) as { erro?: string } | null;
      window.alert(`Não foi possível remover: ${corpo?.erro ?? "sem ligação"}.`);
      setAApagar(false);
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" onClick={remover} disabled={aApagar} style={ESTILO}>
      {aApagar ? "A remover…" : "Remover"}
    </button>
  );
}
