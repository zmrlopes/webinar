"use client";

import { useState } from "react";

type Estado = "pronto" | "a-gerar";

/** Caixa compacta por lead — gera hipóteses de resposta ali mesmo, sem sair da tabela. */
export function ObjecaoLead({ email }: { email: string }) {
  const [objecao, setObjecao] = useState("");
  const [estado, setEstado] = useState<Estado>("pronto");
  const [respostas, setRespostas] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  async function gerar(): Promise<void> {
    if (!objecao.trim()) return;
    setEstado("a-gerar");
    setErro("");
    setRespostas([]);
    try {
      const resposta = await fetch("/api/consultor/objecoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, objecao }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível gerar respostas");
        setEstado("pronto");
        return;
      }
      setRespostas(Array.isArray(corpo.respostas) ? corpo.respostas : []);
      setEstado("pronto");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("pronto");
    }
  }

  return (
    <div className="vqw-objecao">
      <textarea
        value={objecao}
        onChange={(e) => setObjecao(e.target.value)}
        placeholder="Qual é a dúvida dela?"
        disabled={estado === "a-gerar"}
      />
      <button type="button" disabled={!objecao.trim() || estado === "a-gerar"} onClick={gerar}>
        {estado === "a-gerar" ? "A pensar…" : "Gerar respostas"}
      </button>
      {erro && <p className="vqw-objecao-erro">{erro}</p>}
      {respostas.map((r, i) => (
        <p className="vqw-objecao-resposta" key={i}>
          <strong>{i + 1}.</strong> {r}
        </p>
      ))}
    </div>
  );
}
