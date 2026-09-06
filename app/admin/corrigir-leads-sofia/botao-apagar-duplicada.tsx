"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoApagarDuplicada() {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "a-correr" | "feito" | "erro">("pronto");
  const [linhas, setLinhas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function apagar(): Promise<void> {
    if (!window.confirm('Cancelar as inscrições de "fatima.paulos.martins@gmail.com" e remover o estado de lead?')) {
      return;
    }
    setEstado("a-correr");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/corrigir-leads-sofia/apagar-duplicada", { method: "POST" });
      const dados = (await resposta.json()) as { linhas?: string[]; erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setLinhas(dados.linhas ?? []);
      setEstado("feito");
      router.refresh();
    } catch {
      setErro("Falha de rede — tenta outra vez.");
      setEstado("erro");
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={estado === "a-correr" || estado === "feito"}
        onClick={apagar}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          background: "#ffffff",
          color: "#c0392b",
          border: "1px solid #c0392b",
          borderRadius: "0.3rem",
        }}
      >
        {estado === "a-correr" ? "A apagar…" : estado === "feito" ? "Feito" : "Apagar fatima.paulos.martins@gmail.com (duplicada)"}
      </button>

      {estado === "feito" && (
        <ul style={{ marginTop: "0.75rem", paddingLeft: "1.2rem", color: "#000000" }}>
          {linhas.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      )}

      {estado === "erro" && <p style={{ marginTop: "0.75rem", color: "#c0392b" }}>{erro}</p>}
    </div>
  );
}
