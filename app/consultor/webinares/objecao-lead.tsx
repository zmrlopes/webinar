"use client";

import { useState } from "react";

type Estado = "pronto" | "a-gerar";

interface Props {
  email: string;
  leadEmail: string;
  objecaoInicial: string | null;
  respostasIniciais: string[] | null;
}

/**
 * Caixa compacta por lead — gera hipóteses de resposta ali mesmo, sem sair
 * da tabela. O que aqui fica escrito é guardado por lead (ver
 * guardarObjecaoLead em src/lib/objecoes.ts) para reaparecer quando o
 * consultor voltar à tabela depois de responder à lead por fora.
 */
export function ObjecaoLead({ email, leadEmail, objecaoInicial, respostasIniciais }: Props) {
  const [objecao, setObjecao] = useState(objecaoInicial ?? "");
  const [estado, setEstado] = useState<Estado>("pronto");
  const [respostas, setRespostas] = useState<string[]>(respostasIniciais ?? []);
  const [erro, setErro] = useState("");
  const [abertas, setAbertas] = useState(false);

  async function gerar(): Promise<void> {
    if (!objecao.trim()) return;
    setEstado("a-gerar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/objecoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, objecao, leadEmail }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível gerar respostas");
        setEstado("pronto");
        return;
      }
      setRespostas(Array.isArray(corpo.respostas) ? corpo.respostas : []);
      setAbertas(true);
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
      <div className="vqw-objecao-botoes">
        <button type="button" disabled={!objecao.trim() || estado === "a-gerar"} onClick={gerar}>
          {estado === "a-gerar" ? "A pensar…" : "Gerar respostas"}
        </button>
        {respostas.length > 0 && (
          <button type="button" className="vqw-objecao-toggle" onClick={() => setAbertas(!abertas)}>
            {abertas ? "Esconder respostas" : `Ver respostas (${respostas.length})`}
          </button>
        )}
      </div>
      {erro && <p className="vqw-objecao-erro">{erro}</p>}
      {abertas &&
        respostas.map((r, i) => (
          <p className="vqw-objecao-resposta" key={i}>
            <strong>{i + 1}.</strong> {r}
          </p>
        ))}
    </div>
  );
}
