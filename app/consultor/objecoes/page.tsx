"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";

type Estado = "a-carregar" | "pronto" | "a-gerar" | "sem-conta";

export default function ObjecoesPagina() {
  const [email, setEmail] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [objecao, setObjecao] = useState("");
  const [respostas, setRespostas] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const guardado = lerEmailGuardado();
    if (!guardado) {
      setEstado("sem-conta");
      return;
    }
    setEmail(guardado);
    setEstado("pronto");
  }, []);

  async function gerar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (!email || !objecao.trim()) return;
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
    <div className="vqo-pagina">
      <style>{`
        .vqo-pagina {
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqo-caixa { max-width: 640px; margin: 0 auto; }
        .vqo-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .vqo-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .vqo-voltar:hover { text-decoration: underline; }
        .vqo-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .vqo-pagina textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #ffffff;
          color: #000000;
          font-size: 1rem;
          font-family: inherit;
          min-height: 6rem;
          resize: vertical;
        }
        .vqo-pagina button {
          margin-top: 1rem;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
        .vqo-pagina button:disabled { opacity: 0.5; cursor: default; }
        .vqo-erro { color: #b3261e; margin-top: 0.75rem; }
        .vqo-resposta {
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          margin-top: 1rem;
        }
        .vqo-resposta-numero {
          display: inline-block;
          background: #4b5320;
          color: #ffffff;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          text-align: center;
          line-height: 1.5rem;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .vqo-resposta p { margin: 0; white-space: pre-wrap; }
      `}</style>
      <div className="vqo-caixa">
        <Link href="/consultor" className="vqo-voltar">
          ← O teu backoffice
        </Link>
        <h1>Ultrapassar objeções</h1>

        {estado === "sem-conta" && (
          <p className="vqo-mudo">
            Não conseguimos identificar-te. Volta ao{" "}
            <Link href="/consultor" className="vqo-voltar">
              teu backoffice
            </Link>{" "}
            e entra outra vez com o teu email.
          </p>
        )}

        {(estado === "pronto" || estado === "a-gerar" || estado === "a-carregar") && (
          <>
            <p className="vqo-mudo">
              Escreve a objeção que a lead te colocou — recebes 2 a 3 hipóteses de resposta.
            </p>
            <form onSubmit={gerar}>
              <textarea
                value={objecao}
                onChange={(e) => setObjecao(e.target.value)}
                placeholder="ex: Diz que não tem dinheiro para investir agora..."
                disabled={estado === "a-carregar"}
              />
              <button type="submit" disabled={!objecao.trim() || estado !== "pronto"}>
                {estado === "a-gerar" ? "A pensar…" : "Gerar respostas"}
              </button>
              {erro && <p className="vqo-erro">{erro}</p>}
            </form>

            {respostas.map((r, i) => (
              <div className="vqo-resposta" key={i}>
                <span className="vqo-resposta-numero">{i + 1}</span>
                <p>{r}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
