"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoLigar({ id, nome, email }: { id: number; nome: string; email: string }) {
  const router = useRouter();
  const [aGravar, setAGravar] = useState(false);

  async function ligar(): Promise<void> {
    if (!window.confirm(`Ligar o pedido de ${nome} ao email ${email}? O email do pedido passa a ser este.`)) return;
    setAGravar(true);
    const resposta = await fetch("/api/admin/bilhetes-convencao/ligar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email }),
    }).catch(() => null);
    if (!resposta?.ok) {
      const corpo = (await resposta?.json().catch(() => null)) as { erro?: string } | null;
      window.alert(`Não foi possível ligar: ${corpo?.erro ?? "sem ligação"}.`);
      setAGravar(false);
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" onClick={ligar} disabled={aGravar} className="bc-botao">
      {aGravar ? "A ligar…" : "Ligar a este consultor"}
    </button>
  );
}
