"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guardarEmail, lerEmailGuardado, limparEmailGuardado } from "./armazenamento";

interface DadosIdentificacao {
  nome: string | null;
  link: string;
  ehConsultorEquipa: boolean;
  formacao: { titulo: string; sessaoExternaEm: string } | null;
}

type Estado = "a-carregar" | "por-identificar" | "pronto" | "erro";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function BackofficeHome() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<DadosIdentificacao | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [aPedirFormacao, setAPedirFormacao] = useState(false);
  const [erroFormacao, setErroFormacao] = useState("");

  async function identificar(emailParaIdentificar: string): Promise<void> {
    setEstado("a-carregar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/identificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParaIdentificar }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        limparEmailGuardado();
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível identificar-te");
        setEstado("por-identificar");
        return;
      }
      guardarEmail(emailParaIdentificar);
      setEmail(emailParaIdentificar);
      setDados(corpo);
      setEstado("pronto");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("por-identificar");
    }
  }

  useEffect(() => {
    const guardado = lerEmailGuardado();
    if (guardado) {
      void identificar(guardado);
    } else {
      setEstado("por-identificar");
    }
  }, []);

  async function copiarLink(): Promise<void> {
    if (!dados) return;
    await navigator.clipboard.writeText(dados.link);
    setLinkCopiado(true);
  }

  async function pedirFormacao(): Promise<void> {
    setAPedirFormacao(true);
    setErroFormacao("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/formacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroFormacao(typeof corpo.erro === "string" ? corpo.erro : "não foi possível obter o link");
        setAPedirFormacao(false);
        return;
      }
      window.location.href = corpo.url;
    } catch {
      setErroFormacao("falha de ligação — tenta outra vez");
      setAPedirFormacao(false);
    }
  }

  function trocarConta(): void {
    limparEmailGuardado();
    setDados(null);
    setEmail("");
    setEstado("por-identificar");
  }

  return (
    <div className="vqb-pagina">
      <style>{`
        .vqb-pagina {
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqb-caixa { max-width: 760px; margin: 0 auto; }
        .vqb-pagina h1 { color: #fff; font-size: 1.6rem; margin: 0 0 0.4rem; }
        .vqb-pagina h2 { color: #d4af37; font-size: 1.15rem; margin: 2rem 0 0.6rem; }
        .vqb-mudo { color: #b3b0a6; font-size: 0.9rem; margin: 0 0 1.25rem; }
        .vqb-erro { color: #ff9b8a; margin-top: 0.75rem; }
        .vqb-linha { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
        .vqb-pagina label { display: block; font-weight: 600; margin: 0 0 0.35rem; }
        .vqb-pagina input {
          box-sizing: border-box;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 1rem;
          min-width: 260px;
        }
        .vqb-pagina button {
          background: linear-gradient(135deg, #e8c96a, #b8902f);
          color: #1a1712;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.3rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
        .vqb-pagina button:disabled { opacity: 0.5; cursor: default; }
        .vqb-pagina button.vqb-secundario {
          background: transparent;
          color: #d4af37;
          border: 1px solid #6b5c2e;
        }
        .vqb-topo { display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap; }
        .vqb-pagina button.vqb-trocar {
          color: #85817a;
          font-size: 0.8rem;
          background: none;
          border: none;
          text-decoration: underline;
          padding: 0;
          font-weight: 400;
          cursor: pointer;
        }
        .vqb-linkbox {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          word-break: break-all;
          font-family: monospace;
          color: #f2f0ea;
        }
        .vqb-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .vqb-cartao-topo { display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap; }
        .vqb-cartao h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
        .vqb-cartao p { margin: 0; color: #6b6a63; font-size: 0.9rem; }
        .vqb-botao-webinares {
          display: block;
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          margin-top: 1.25rem;
          font-weight: 700;
        }
        .vqb-botao-webinares span { display: block; color: #6b6a63; font-weight: 400; font-size: 0.85rem; margin-top: 0.2rem; }
      `}</style>

      <div className="vqb-caixa">
        {estado === "por-identificar" && (
          <>
            <h1>O teu backoffice</h1>
            <p className="vqb-mudo">Escreve o teu email para entrares.</p>
            <div className="vqb-linha">
              <div>
                <label htmlFor="email-backoffice">O teu email</label>
                <input
                  id="email-backoffice"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao.silva@exemplo.pt"
                />
              </div>
              <button type="button" onClick={() => identificar(email)} disabled={!email}>
                Entrar
              </button>
            </div>
            {erro && <p className="vqb-erro">{erro}</p>}
          </>
        )}

        {estado === "a-carregar" && <p className="vqb-mudo">A entrar...</p>}

        {estado === "pronto" && dados && (
          <>
            <div className="vqb-topo">
              <h1>Olá{dados.nome ? `, ${dados.nome}` : ""}</h1>
              <button type="button" className="vqb-trocar" onClick={trocarConta}>
                não sou eu / trocar conta
              </button>
            </div>

            <h2>O teu link de partilha</h2>
            <p className="vqb-mudo">
              É este o endereço que partilhas. Quem se inscrever por ele fica atribuído a ti.
            </p>
            <div className="vqb-linkbox">{dados.link}</div>
            <div style={{ marginTop: "0.75rem" }}>
              <button type="button" onClick={copiarLink}>
                {linkCopiado ? "Copiado!" : "Copiar link"}
              </button>
            </div>

            {dados.ehConsultorEquipa && dados.formacao && (
              <>
                <h2>Formação de segunda</h2>
                <div className="vqb-cartao">
                  <div className="vqb-cartao-topo">
                    <div>
                      <h3>{dados.formacao.titulo}</h3>
                      <p>{formatarData(dados.formacao.sessaoExternaEm)}</p>
                    </div>
                    <button type="button" onClick={pedirFormacao} disabled={aPedirFormacao}>
                      {aPedirFormacao ? "A preparar..." : "Quero assistir"}
                    </button>
                  </div>
                  {erroFormacao && <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>{erroFormacao}</p>}
                </div>
              </>
            )}

            <Link href="/consultor/backoffice/webinares" className="vqb-botao-webinares">
              Webinares
              <span>Ver todos os teus leads e da tua equipa, sessão a sessão</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
