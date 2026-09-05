"use client";

import { useState } from "react";

export function BotaoCorrigir() {
  const [estado, setEstado] = useState<"pronto" | "a-correr" | "feito" | "erro">("pronto");
  const [linhas, setLinhas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function corrigir(): Promise<void> {
    setEstado("a-correr");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/corrigir-leads-sofia", { method: "POST" });
      const dados = (await resposta.json()) as { linhas?: string[]; erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setLinhas(dados.linhas ?? []);
      setEstado("feito");
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
        onClick={corrigir}
        style={{
          padding: "0.6rem 1.2rem",
          fontSize: "0.95rem",
          background: "#4b5320",
          color: "#ffffff",
          border: "none",
          borderRadius: "0.3rem",
          cursor: estado === "pronto" ? "pointer" : "default",
        }}
      >
        {estado === "a-correr" ? "A corrigir…" : estado === "feito" ? "Feito" : "Corrigir agora"}
      </button>

      {estado === "feito" && (
        <ul style={{ marginTop: "1rem", paddingLeft: "1.2rem", color: "#000000" }}>
          {linhas.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      )}

      {estado === "erro" && (
        <p style={{ marginTop: "1rem", color: "#c0392b" }}>{erro}</p>
      )}
    </div>
  );
}
