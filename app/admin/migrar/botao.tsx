"use client";

import { useState } from "react";

interface Resultado {
  ficheiro: string;
  aplicada: boolean;
}

export function BotaoMigrar() {
  const [estado, setEstado] = useState<"pronto" | "a-correr" | "feito" | "erro">("pronto");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function migrar(): Promise<void> {
    setEstado("a-correr");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/migrar", { method: "POST" });
      const dados = (await resposta.json()) as { resultados?: Resultado[]; erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setResultados(dados.resultados ?? []);
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
        disabled={estado === "a-correr"}
        onClick={migrar}
        style={{
          padding: "0.6rem 1.2rem",
          fontSize: "0.95rem",
          background: "#4b5320",
          color: "#ffffff",
          border: "none",
          borderRadius: "0.3rem",
          cursor: estado === "a-correr" ? "default" : "pointer",
        }}
      >
        {estado === "a-correr" ? "A aplicar…" : "Aplicar migrações pendentes"}
      </button>

      {estado === "feito" && (
        <ul style={{ marginTop: "1rem", paddingLeft: "1.2rem", color: "#000000" }}>
          {resultados.length === 0 ? (
            <li>Sem ficheiros de migração encontrados.</li>
          ) : (
            resultados.map((r) => (
              <li key={r.ficheiro}>
                {r.aplicada ? "✔ aplicada agora: " : "— já estava aplicada: "}
                {r.ficheiro}
              </li>
            ))
          )}
        </ul>
      )}

      {estado === "erro" && <p style={{ marginTop: "1rem", color: "#c0392b" }}>{erro}</p>}
    </div>
  );
}
