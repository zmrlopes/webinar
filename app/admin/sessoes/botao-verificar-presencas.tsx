"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Resultado {
  sessoesProcessadas: number;
  presencasAtualizadas: number;
}

export function BotaoVerificarPresencas() {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "a-correr" | "feito" | "erro">("pronto");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function verificar(): Promise<void> {
    setEstado("a-correr");
    try {
      const resposta = await fetch("/api/admin/verificar-presencas", { method: "POST" });
      const dados = (await resposta.json()) as Resultado;
      if (!resposta.ok) {
        setEstado("erro");
        return;
      }
      setResultado(dados);
      setEstado("feito");
      router.refresh();
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={estado === "a-correr"}
        onClick={verificar}
        className="ad-cartao-seta"
        style={{
          background: "none",
          border: "1px solid #4b5320",
          borderRadius: "999px",
          padding: "0.3rem 0.9rem",
          fontSize: "0.8rem",
          cursor: estado === "a-correr" ? "default" : "pointer",
        }}
      >
        {estado === "a-correr" ? "A verificar…" : "Verificar presenças agora"}
      </button>
      {estado === "feito" && resultado && (
        <span className="ad-mudo">
          {resultado.sessoesProcessadas} sessão(ões) verificada(s), {resultado.presencasAtualizadas}{" "}
          presença(s) atualizada(s).
        </span>
      )}
      {estado === "erro" && <span className="ad-mudo">Falha ao verificar — tenta outra vez.</span>}
    </div>
  );
}
