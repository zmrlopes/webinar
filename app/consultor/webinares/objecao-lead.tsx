"use client";

import { useState } from "react";
import type { TestemunhoObjecao } from "@/lib/objecoes";

type Estado = "pronto" | "a-gerar";

interface Props {
  email: string;
  /** Sem lead (campo geral das Leads), nada fica guardado. */
  leadEmail?: string;
  objecaoInicial?: string | null;
  respostasIniciais?: string[] | null;
  testemunhoInicial?: TestemunhoObjecao | null;
}

/**
 * Caixa compacta por lead — gera hipóteses de resposta ali mesmo, sem sair
 * da tabela. O que aqui fica escrito é guardado por lead (ver
 * guardarObjecaoLead em src/lib/objecoes.ts) para reaparecer quando o
 * consultor voltar à tabela depois de responder à lead por fora.
 */
export function ObjecaoLead({ email, leadEmail, objecaoInicial, respostasIniciais, testemunhoInicial }: Props) {
  const [objecao, setObjecao] = useState(objecaoInicial ?? "");
  const [estado, setEstado] = useState<Estado>("pronto");
  const [respostas, setRespostas] = useState<string[]>(respostasIniciais ?? []);
  const [testemunho, setTestemunho] = useState<TestemunhoObjecao | null>(testemunhoInicial ?? null);
  const [copiado, setCopiado] = useState(false);
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
      setTestemunho(corpo.testemunho ?? null);
      setCopiado(false);
      setAbertas(true);
      setEstado("pronto");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("pronto");
    }
  }

  return (
    <div className="vqw-objecao">
      <style>{`
        .vqw-objecao { display: flex; flex-direction: column; gap: 0.4rem; }
        .vqw-objecao textarea {
          box-sizing: border-box;
          width: 100%;
          min-height: 4.5rem;
          resize: vertical;
          padding: 0.4rem 0.55rem;
          border-radius: 6px;
          border: 1px solid #cfcdc3;
          font-size: 0.9rem;
          font-family: inherit;
        }
        .vqw-objecao-botoes { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .vqw-objecao button {
          background: #4b5320;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 0.3rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .vqw-objecao button:disabled { opacity: 0.5; cursor: default; }
        .vqw-objecao-toggle {
          background: transparent !important;
          color: #4b5320 !important;
          border: 1px solid #4b5320 !important;
        }
        .vqw-objecao-erro { color: #b3261e; font-size: 0.8rem; margin: 0; }
        .vqw-objecao-resposta {
          background: #ffffff;
          border: 1px solid #eae7de;
          border-radius: 6px;
          padding: 0.4rem 0.55rem;
          font-size: 0.8rem;
          margin: 0;
        }
        .vqw-objecao-testemunho {
          display: flex;
          gap: 0.55rem;
          align-items: flex-start;
          background: #ffffff;
          border: 1px solid #4b5320;
          border-radius: 6px;
          padding: 0.5rem 0.55rem;
          font-size: 0.8rem;
        }
        .vqw-objecao-testemunho img { flex: none; border-radius: 4px; object-fit: cover; }
        .vqw-objecao-testemunho > div { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
        .vqw-objecao-testemunho p { margin: 0; }
        .vqw-objecao-etiqueta { color: #4b5320; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .vqw-objecao-testemunho a {
          background: #4b5320;
          color: #ffffff;
          border-radius: 6px;
          padding: 0.3rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
      <textarea
        value={objecao}
        onChange={(e) => setObjecao(e.target.value)}
        placeholder={leadEmail ? "Qual é a dúvida dela?" : "Ex.: não tenho dinheiro para investir agora"}
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
          <p className="vqw-objecao-resposta" key={i} style={{ whiteSpace: "pre-line" }}>
            <strong>{i + 1}.</strong> {r}
          </p>
        ))}
      {abertas && testemunho && (
        <div className="vqw-objecao-testemunho">
          <img src={`https://i.ytimg.com/vi/${testemunho.id}/mqdefault.jpg`} alt="" width="96" height="54" loading="lazy" />
          <div>
            <span className="vqw-objecao-etiqueta">Testemunho para o follow-up</span>
            <strong>{testemunho.titulo}</strong>
            {testemunho.comoUsar && <p>{testemunho.comoUsar}</p>}
            <div className="vqw-objecao-botoes">
              <a href={`https://www.youtube.com/watch?v=${testemunho.id}`} target="_blank" rel="noopener noreferrer">
                Ver vídeo{testemunho.duracao && ` (${testemunho.duracao})`} ↗
              </a>
              <button
                type="button"
                className="vqw-objecao-toggle"
                onClick={() => {
                  navigator.clipboard.writeText(`https://youtu.be/${testemunho.id}`).then(() => setCopiado(true), () => {});
                }}
              >
                {copiado ? "Link copiado" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
