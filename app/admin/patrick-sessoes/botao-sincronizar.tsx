"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Resultado {
  novas: number;
  atualizadas: number;
  canceladas: number;
}

export function BotaoSincronizar() {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "a-correr" | "feito" | "erro">("pronto");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function sincronizar(): Promise<void> {
    setEstado("a-correr");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/sincronizar-sessoes", { method: "POST" });
      const dados = (await resposta.json()) as Resultado & { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setResultado(dados);
      setEstado("feito");
      router.refresh();
    } catch {
      setErro("Falha de rede — tenta outra vez.");
      setEstado("erro");
    }
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        disabled={estado === "a-correr"}
        onClick={sincronizar}
        style={{
          padding: "0.5rem 1.1rem",
          fontSize: "0.9rem",
          background: "#4b5320",
          color: "#ffffff",
          border: "none",
          borderRadius: "0.3rem",
          cursor: estado === "a-correr" ? "default" : "pointer",
        }}
      >
        {estado === "a-correr" ? "A sincronizar…" : "Sincronizar agora"}
      </button>
      <p style={{ color: "#6b6a63", fontSize: "0.8rem", marginTop: "0.4rem" }}>
        O normal corre sozinho de hora a hora — usa isto só para não esperar. Se trouxer sessão nova, a equipa
        toda recebe logo o email de aviso.
      </p>

      {estado === "feito" && resultado && (
        <p style={{ color: "#000000" }}>
          Novas: {resultado.novas} · Atualizadas: {resultado.atualizadas} · Canceladas: {resultado.canceladas}
        </p>
      )}
      {estado === "erro" && <p style={{ color: "#c0392b" }}>{erro}</p>}
    </div>
  );
}
