"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TROFEUS_JA_TENHO, TROFEUS_QUERO, type Trofeu } from "@/lib/trofeus-lista";
import { lerEmailGuardado } from "../armazenamento";

type Estado = "a-carregar" | "pronto" | "a-enviar" | "enviado" | "erro" | "sem-conta";

export default function TrofeusPagina() {
  return (
    <Suspense fallback={null}>
      <TrofeusFormulario />
    </Suspense>
  );
}

function ListaTrofeus({
  trofeus,
  escolhidos,
  alternar,
  prefixo,
}: {
  trofeus: Trofeu[];
  escolhidos: string[];
  alternar: (chave: string) => void;
  prefixo: string;
}) {
  return (
    <div className="vqx-lista">
      {trofeus.map((t) => (
        <label className="vqx-linha" key={`${prefixo}-${t.chave}`} htmlFor={`${prefixo}-${t.chave}`}>
          <input
            id={`${prefixo}-${t.chave}`}
            type="checkbox"
            checked={escolhidos.includes(t.chave)}
            onChange={() => alternar(t.chave)}
          />
          <span>{t.rotulo}</span>
        </label>
      ))}
    </div>
  );
}

function TrofeusFormulario() {
  const searchParams = useSearchParams();
  const emPreview = searchParams.get("preview") === "1";
  const [email, setEmail] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [quero, setQuero] = useState<string[]>([]);
  const [jaTenho, setJaTenho] = useState<string[]>([]);

  useEffect(() => {
    if (emPreview) {
      setEstado("pronto");
      return;
    }
    const guardado = lerEmailGuardado();
    if (!guardado) {
      setEstado("sem-conta");
      return;
    }
    setEmail(guardado);
    setEstado("pronto");
  }, [emPreview]);

  function alternar(lista: string[], definir: (v: string[]) => void, chave: string): void {
    definir(lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave]);
  }

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (emPreview) {
      setEstado("enviado");
      return;
    }
    if (!email) return;

    setEstado("a-enviar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/trofeus-resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, quero, jaTenho }),
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
    <div className="vqx-pagina">
      <style>{`
        .vqx-pagina {
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqx-caixa { max-width: 640px; margin: 0 auto; }
        .vqx-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .vqx-pagina h2 { color: #4b5320; font-size: 1.05rem; margin: 2rem 0 0.25rem; }
        .vqx-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .vqx-voltar:hover { text-decoration: underline; }
        .vqx-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .vqx-sub { color: #6b6a63; font-size: 0.85rem; margin: 0 0 0.75rem; }
        .vqx-lista {
          border: 1px solid #e2e0d8;
          border-radius: 10px;
          overflow: hidden;
        }
        .vqx-linha {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.7rem 0.9rem;
          border-bottom: 1px solid #efedE6;
          cursor: pointer;
          font-size: 0.95rem;
        }
        .vqx-linha:last-child { border-bottom: none; }
        .vqx-linha:hover { background: #f7f6f3; }
        /* Sem este travão, uma regra de formulário mais geral estica a caixa
           e o quadrado acaba no meio do texto — o min-width é que manda. */
        .vqx-linha input[type="checkbox"] {
          flex: none;
          width: 1.15rem;
          height: 1.15rem;
          min-width: 0;
          margin: 0;
          padding: 0;
          accent-color: #4b5320;
        }
        .vqx-pagina button {
          margin-top: 1.75rem;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
        .vqx-pagina button:disabled { opacity: 0.5; cursor: default; }
        .vqx-erro { color: #b3261e; margin-top: 0.75rem; }
        .vqx-nota {
          background: #eef1e4;
          padding: 0.6rem 0.9rem;
          border-radius: 8px;
          color: #4b5320;
          font-size: 0.85rem;
        }
      `}</style>
      <div className="vqx-caixa">
        <Link href="/consultor" className="vqx-voltar">
          ← O teu backoffice
        </Link>
        <h1>Troféus — Teambuilding de 14 de novembro</h1>

        {estado === "a-carregar" && <p className="vqx-mudo">A carregar...</p>}

        {estado === "sem-conta" && (
          <p className="vqx-mudo">
            Não conseguimos identificar-te. Volta ao{" "}
            <Link href="/consultor" className="vqx-voltar">
              teu backoffice
            </Link>{" "}
            e entra outra vez com o teu email.
          </p>
        )}

        {estado === "enviado" && (
          <p className="vqx-mudo">
            {emPreview
              ? "✅ (Pré-visualização) É isto que o consultor vê depois de enviar."
              : "✅ Obrigado! A tua resposta ficou registada."}
          </p>
        )}

        {(estado === "pronto" || estado === "a-enviar") && (
          <>
            {emPreview && (
              <p className="vqx-nota">
                Pré-visualização — é isto que o consultor vê. Enviar aqui não grava nada.
              </p>
            )}
            <p className="vqx-mudo">
              Vamos entregar os troféus no Teambuilding e precisamos de saber quantos mandar fazer. Marca
              os que queres receber e os que já tens em casa — assim ninguém fica sem o seu nem recebe um
              repetido.
            </p>

            <form onSubmit={enviar}>
              <h2>Quero receber</h2>
              <p className="vqx-sub">Marca todos os que te faltam. Podes escolher mais do que um.</p>
              <ListaTrofeus
                trofeus={TROFEUS_QUERO}
                escolhidos={quero}
                alternar={(c) => alternar(quero, setQuero, c)}
                prefixo="quero"
              />

              <h2>Já tenho</h2>
              <p className="vqx-sub">Os que já recebeste e estão contigo.</p>
              <ListaTrofeus
                trofeus={TROFEUS_JA_TENHO}
                escolhidos={jaTenho}
                alternar={(c) => alternar(jaTenho, setJaTenho, c)}
                prefixo="ja-tenho"
              />

              <button type="submit" disabled={estado === "a-enviar"}>
                {estado === "a-enviar" ? "A enviar..." : "Enviar"}
              </button>
              {erro && <p className="vqx-erro">{erro}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
