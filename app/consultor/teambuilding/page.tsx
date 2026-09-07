"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";

type Estado = "a-carregar" | "pronto" | "a-enviar" | "enviado" | "erro" | "sem-conta";

export default function TeambuildingFormularioPagina() {
  const [email, setEmail] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [expectativa, setExpectativa] = useState("");
  const [formacoesDesejadas, setFormacoesDesejadas] = useState("");
  const [duvidas, setDuvidas] = useState("");
  const [outros, setOutros] = useState("");

  useEffect(() => {
    const guardado = lerEmailGuardado();
    if (!guardado) {
      setEstado("sem-conta");
      return;
    }
    setEmail(guardado);
    setEstado("pronto");
  }, []);

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (!email) return;
    setEstado("a-enviar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/teambuilding-resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, expectativa, formacoesDesejadas, duvidas, outros }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível enviar");
        setEstado("pronto");
        return;
      }
      setEstado("enviado");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("pronto");
    }
  }

  return (
    <div className="vqt-pagina">
      <style>{`
        .vqt-pagina {
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqt-caixa { max-width: 640px; margin: 0 auto; }
        .vqt-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .vqt-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .vqt-voltar:hover { text-decoration: underline; }
        .vqt-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .vqt-pagina label { display: block; font-weight: 600; margin: 1.1rem 0 0.35rem; }
        .vqt-pagina textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #ffffff;
          color: #000000;
          font-size: 1rem;
          font-family: inherit;
          min-height: 5rem;
          resize: vertical;
        }
        .vqt-opcional { color: #6b6a63; font-weight: 400; }
        .vqt-pagina button {
          margin-top: 1.5rem;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
        .vqt-pagina button:disabled { opacity: 0.5; cursor: default; }
        .vqt-erro { color: #b3261e; margin-top: 0.75rem; }
      `}</style>
      <div className="vqt-caixa">
        <Link href="/consultor" className="vqt-voltar">
          ← O teu backoffice
        </Link>
        <h1>Teambuilding — 14 de novembro</h1>

        {estado === "a-carregar" && <p className="vqt-mudo">A carregar...</p>}

        {estado === "sem-conta" && (
          <p className="vqt-mudo">
            Não conseguimos identificar-te. Volta ao{" "}
            <Link href="/consultor" className="vqt-voltar">
              teu backoffice
            </Link>{" "}
            e entra outra vez com o teu email.
          </p>
        )}

        {estado === "enviado" && (
          <p className="vqt-mudo">✅ Obrigado! A tua resposta ficou registada.</p>
        )}

        {(estado === "pronto" || estado === "a-enviar") && (
          <>
            <p className="vqt-mudo">
              Queremos preparar o dia à volta do que a equipa realmente precisa — responde com calma, não há
              respostas certas ou erradas.
            </p>
            <form onSubmit={enviar}>
              <label htmlFor="expectativa">O que esperas mais deste dia de Teambuilding?</label>
              <textarea
                id="expectativa"
                required
                value={expectativa}
                onChange={(e) => setExpectativa(e.target.value)}
              />

              <label htmlFor="formacoes">Que temas ou formações gostarias de ver abordados nesse dia?</label>
              <textarea
                id="formacoes"
                required
                value={formacoesDesejadas}
                onChange={(e) => setFormacoesDesejadas(e.target.value)}
              />

              <label htmlFor="duvidas">
                Há alguma dúvida ou dificuldade específica que gostavas de ver esclarecida?{" "}
                <span className="vqt-opcional">(opcional)</span>
              </label>
              <textarea id="duvidas" value={duvidas} onChange={(e) => setDuvidas(e.target.value)} />

              <label htmlFor="outros">
                Algo mais que queiras partilhar sobre as tuas expectativas para o dia?{" "}
                <span className="vqt-opcional">(opcional)</span>
              </label>
              <textarea id="outros" value={outros} onChange={(e) => setOutros(e.target.value)} />

              <button type="submit" disabled={estado === "a-enviar"}>
                {estado === "a-enviar" ? "A enviar..." : "Enviar"}
              </button>
              {erro && <p className="vqt-erro">{erro}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
