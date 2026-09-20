"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";

type Estado = "a-carregar" | "pronto" | "a-enviar" | "enviado" | "erro" | "sem-conta";
type TipoQuarto = "single" | "duplo";

export default function HotelPagina() {
  return (
    <Suspense fallback={null}>
      <HotelFormulario />
    </Suspense>
  );
}

function HotelFormulario() {
  const searchParams = useSearchParams();
  const emPreview = searchParams.get("preview") === "1";
  const [email, setEmail] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [querQuarto, setQuerQuarto] = useState<boolean | null>(null);
  const [tipoQuarto, setTipoQuarto] = useState<TipoQuarto | null>(null);
  const [noiteAnterior, setNoiteAnterior] = useState(false);
  const [noiteSeguinte, setNoiteSeguinte] = useState(false);
  const [temCriancas, setTemCriancas] = useState(false);
  const [idadesCriancas, setIdadesCriancas] = useState("");

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

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (querQuarto === null) {
      setErro("diz-nos se queres quarto");
      return;
    }
    if (querQuarto && !tipoQuarto) {
      setErro("escolhe o tipo de quarto");
      return;
    }
    if (querQuarto && temCriancas && idadesCriancas.trim() === "") {
      setErro("diz-nos as idades das crianças");
      return;
    }
    if (emPreview) {
      setEstado("enviado");
      return;
    }
    if (!email) return;

    setEstado("a-enviar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/hotel-resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          querQuarto,
          tipoQuarto: querQuarto ? tipoQuarto : null,
          noiteAnterior: querQuarto ? noiteAnterior : false,
          noiteSeguinte: querQuarto ? noiteSeguinte : false,
          temCriancas: querQuarto ? temCriancas : false,
          idadesCriancas: querQuarto && temCriancas ? idadesCriancas : null,
        }),
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
        .vqx-linha input[type="radio"], .vqx-linha input[type="checkbox"] {
          flex: none;
          width: 1.15rem;
          height: 1.15rem;
          min-width: 0;
          margin: 0;
          padding: 0;
          accent-color: #4b5320;
        }
        .vqx-preco { color: #6b6a63; font-size: 0.85rem; margin-left: auto; }
        .vqx-campo {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e2e0d8;
          border-radius: 10px;
          padding: 0.65rem 0.9rem;
          font-size: 0.95rem;
          color: #000000;
          background: #ffffff;
        }
        .vqx-campo:focus { outline: 2px solid #4b5320; outline-offset: 1px; }
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
        <h1>Quarto no hotel — Teambuilding de 14 de novembro</h1>

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
              Reservámos o Aurea Fátima Hotel Congress & Spa para quem quiser ficar por lá. Single a 60€
              por noite, Duplo/Twin a 72€ por noite, pequeno-almoço incluído. Diz-nos se precisas de
              quarto para acertarmos a reserva com o hotel.
            </p>

            <form onSubmit={enviar}>
              <h2>Queres quarto?</h2>
              <div className="vqx-lista">
                <label className="vqx-linha" htmlFor="quer-sim">
                  <input
                    id="quer-sim"
                    type="radio"
                    name="quer-quarto"
                    checked={querQuarto === true}
                    onChange={() => setQuerQuarto(true)}
                  />
                  <span>Sim</span>
                </label>
                <label className="vqx-linha" htmlFor="quer-nao">
                  <input
                    id="quer-nao"
                    type="radio"
                    name="quer-quarto"
                    checked={querQuarto === false}
                    onChange={() => {
                      setQuerQuarto(false);
                      setTipoQuarto(null);
                      setNoiteAnterior(false);
                      setNoiteSeguinte(false);
                      setTemCriancas(false);
                      setIdadesCriancas("");
                    }}
                  />
                  <span>Não</span>
                </label>
              </div>

              {querQuarto && (
                <>
                  <h2>Tipo de quarto</h2>
                  <div className="vqx-lista">
                    <label className="vqx-linha" htmlFor="tipo-single">
                      <input
                        id="tipo-single"
                        type="radio"
                        name="tipo-quarto"
                        checked={tipoQuarto === "single"}
                        onChange={() => setTipoQuarto("single")}
                      />
                      <span>Single (1 pessoa)</span>
                      <span className="vqx-preco">60€/noite</span>
                    </label>
                    <label className="vqx-linha" htmlFor="tipo-duplo">
                      <input
                        id="tipo-duplo"
                        type="radio"
                        name="tipo-quarto"
                        checked={tipoQuarto === "duplo"}
                        onChange={() => setTipoQuarto("duplo")}
                      />
                      <span>Duplo/Twin (2 pessoas)</span>
                      <span className="vqx-preco">72€/noite</span>
                    </label>
                  </div>

                  <h2>Que noites</h2>
                  <p className="vqx-sub">
                    O evento é sábado, dia 14. Marca se ficas na véspera e/ou se ficas mais uma noite
                    depois.
                  </p>
                  <div className="vqx-lista">
                    <label className="vqx-linha" htmlFor="noite-anterior">
                      <input
                        id="noite-anterior"
                        type="checkbox"
                        checked={noiteAnterior}
                        onChange={() => setNoiteAnterior(!noiteAnterior)}
                      />
                      <span>Noite de 13 para 14 (chego na véspera)</span>
                    </label>
                    <label className="vqx-linha" htmlFor="noite-seguinte">
                      <input
                        id="noite-seguinte"
                        type="checkbox"
                        checked={noiteSeguinte}
                        onChange={() => setNoiteSeguinte(!noiteSeguinte)}
                      />
                      <span>Noite de 14 para 15 (fico depois do evento)</span>
                    </label>
                  </div>

                  <h2>Crianças</h2>
                  <div className="vqx-lista">
                    <label className="vqx-linha" htmlFor="tem-criancas">
                      <input
                        id="tem-criancas"
                        type="checkbox"
                        checked={temCriancas}
                        onChange={() => {
                          setTemCriancas(!temCriancas);
                          if (temCriancas) setIdadesCriancas("");
                        }}
                      />
                      <span>Vou levar crianças para o quarto</span>
                    </label>
                  </div>

                  {temCriancas && (
                    <>
                      <p className="vqx-sub">Que idades têm (ex: 5, 8)?</p>
                      <input
                        type="text"
                        className="vqx-campo"
                        value={idadesCriancas}
                        onChange={(e) => setIdadesCriancas(e.target.value)}
                        placeholder="Idades das crianças"
                      />
                    </>
                  )}
                </>
              )}

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
