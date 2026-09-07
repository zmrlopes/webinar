"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Resultado {
  enviados: number;
  falhas: { email: string; erro: string }[];
}

export function BotaoNotificar({ total }: { total: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "a-enviar" | "feito" | "erro">("pronto");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function notificar(): Promise<void> {
    if (!window.confirm(`Enviar o lembrete a ${total} pessoa(s) que ainda não responderam?`)) return;
    setEstado("a-enviar");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/teambuilding-notificar", { method: "POST" });
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

  if (total === 0) return null;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <button
        type="button"
        disabled={estado === "a-enviar"}
        onClick={notificar}
        style={{
          padding: "0.5rem 1.1rem",
          fontSize: "0.85rem",
          background: "#4b5320",
          color: "#ffffff",
          border: "none",
          borderRadius: "0.3rem",
          cursor: estado === "a-enviar" ? "default" : "pointer",
        }}
      >
        {estado === "a-enviar" ? "A enviar…" : `Enviar lembrete a quem falta responder (${total})`}
      </button>

      {estado === "feito" && resultado && (
        <p style={{ marginTop: "0.5rem", color: "#000000" }}>
          Enviado(s): {resultado.enviados}
          {resultado.falhas.length > 0 && (
            <> · Falhou(aram): {resultado.falhas.map((f) => f.email).join(", ")}</>
          )}
        </p>
      )}
      {estado === "erro" && <p style={{ marginTop: "0.5rem", color: "#c0392b" }}>{erro}</p>}
    </div>
  );
}
