"use client";

import { useState } from "react";

interface DadosLink {
  link: string;
  nome: string | null;
}

interface DadosEstatisticas {
  webinar: { titulo: string; sessaoExternaEm: string };
  aberturas: number;
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
}

type EstadoPedido = "pronto" | "a-pedir" | "feito";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
}

function comparencia(estatisticas: DadosEstatisticas): string {
  if (estatisticas.totalInscricoes === 0) return "—";
  return `${Math.round((estatisticas.presencas / estatisticas.totalInscricoes) * 100)}%`;
}

export function PainelConsultor() {
  const [email, setEmail] = useState("");

  const [estadoLink, setEstadoLink] = useState<EstadoPedido>("pronto");
  const [link, setLink] = useState<DadosLink | null>(null);
  const [erroLink, setErroLink] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [estadoEstatisticas, setEstadoEstatisticas] = useState<EstadoPedido>("pronto");
  const [estatisticas, setEstatisticas] = useState<DadosEstatisticas | null>(null);
  const [erroEstatisticas, setErroEstatisticas] = useState("");

  async function obterLink(): Promise<void> {
    setEstadoLink("a-pedir");
    setErroLink("");
    setLink(null);
    setCopiado(false);

    try {
      const resposta = await fetch("/api/consultor/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroLink(typeof dados.erro === "string" ? dados.erro : "não foi possível gerar o link");
      } else {
        setLink(dados);
      }
    } catch {
      setErroLink("falha de ligação — tenta outra vez");
    }
    setEstadoLink("feito");
  }

  async function verNumeros(): Promise<void> {
    setEstadoEstatisticas("a-pedir");
    setErroEstatisticas("");
    setEstatisticas(null);

    try {
      const resposta = await fetch("/api/consultor/estatisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroEstatisticas(
          typeof dados.erro === "string" ? dados.erro : "não foi possível obter os números",
        );
      } else {
        setEstatisticas(dados);
      }
    } catch {
      setErroEstatisticas("falha de ligação — tenta outra vez");
    }
    setEstadoEstatisticas("feito");
  }

  async function copiar(): Promise<void> {
    if (!link) return;
    await navigator.clipboard.writeText(link.link);
    setCopiado(true);
  }

  const aPedirAlgo = estadoLink === "a-pedir" || estadoEstatisticas === "a-pedir";

  return (
    <div className="vqc-pagina">
      <style>{`
        .vqc-pagina {
          background: #2f2c66;
          color: #e8e6f7;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqc-caixa { max-width: 760px; margin: 0 auto; }
        .vqc-pagina h1 {
          color: #f6e05e;
          font-size: 1.6rem;
          margin: 0 0 0.4rem;
        }
        .vqc-pagina h2 {
          color: #f6e05e;
          font-size: 1.2rem;
          margin: 2.5rem 0 0.4rem;
        }
        .vqc-pagina .vqc-mudo { color: #c9c6e8; font-size: 0.9rem; margin: 0 0 1.25rem; }
        .vqc-pagina .vqc-linha { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
        .vqc-pagina label { display: block; font-weight: 600; margin: 0 0 0.35rem; color: #e8e6f7; }
        .vqc-pagina input {
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 1rem;
          min-width: 260px;
          margin: 0;
        }
        .vqc-pagina input::placeholder { color: #a8a4d6; }
        .vqc-pagina button {
          background: #f6e05e;
          color: #2f2c66;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.3rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          margin: 0;
        }
        .vqc-pagina button.vqc-secundario {
          background: transparent;
          color: #f6e05e;
          border: 1px solid #f6e05e;
        }
        .vqc-pagina button:disabled { opacity: 0.6; cursor: default; }
        .vqc-pagina .vqc-erro { color: #ff9b9b; margin-top: 0.75rem; }
        .vqc-linkbox {
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          word-break: break-all;
          font-family: monospace;
        }
        .vqc-linkbox-acoes { margin-top: 0.75rem; }
        .vqc-linkbox-acoes button { padding: 0.45rem 1rem; font-size: 0.9rem; }
        .vqc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }
        .vqc-cartao {
          background: #fff;
          color: #201d4a;
          border-radius: 10px;
          padding: 1.1rem 1.25rem;
        }
        .vqc-cartao .vqc-numero { font-size: 1.9rem; font-weight: 800; line-height: 1.1; }
        .vqc-cartao .vqc-legenda { color: #5d5a80; font-size: 0.85rem; margin-top: 0.25rem; }
      `}</style>

      <div className="vqc-caixa">
        <h1>O painel do consultor</h1>
        <p className="vqc-mudo">
          Escreve o teu email (o mesmo registado na equipa). &ldquo;Obter link&rdquo; envia-te o link
          por email; &ldquo;Painel de leads&rdquo; só mostra os teus números, sem enviar nada.
        </p>

        <div className="vqc-linha">
          <div>
            <label htmlFor="email-painel-consultor">O teu email</label>
            <input
              id="email-painel-consultor"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao.silva@exemplo.pt"
            />
          </div>
          <button type="button" onClick={obterLink} disabled={!email || aPedirAlgo}>
            {estadoLink === "a-pedir" ? "A gerar..." : "Obter link"}
          </button>
          <button
            type="button"
            className="vqc-secundario"
            onClick={verNumeros}
            disabled={!email || aPedirAlgo}
          >
            {estadoEstatisticas === "a-pedir" ? "A consultar..." : "Painel de leads"}
          </button>
        </div>

        {link && (
          <>
            <h2>O meu link</h2>
            <p className="vqc-mudo">É este o endereço que partilhas. Quem se inscrever por ele fica atribuído a ti.</p>
            <div className="vqc-linkbox">{link.link}</div>
            <div className="vqc-linkbox-acoes">
              <button type="button" onClick={copiar}>
                {copiado ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          </>
        )}
        {estadoLink === "feito" && erroLink && <p className="vqc-erro">{erroLink}</p>}

        {estatisticas && (
          <>
            <h2>Os meus números</h2>
            <p className="vqc-mudo">
              {estatisticas.webinar.titulo} — {formatarData(estatisticas.webinar.sessaoExternaEm)}
            </p>
            <div className="vqc-grid">
              <div className="vqc-cartao">
                <div className="vqc-numero">{estatisticas.aberturas}</div>
                <div className="vqc-legenda">Aberturas do meu link</div>
              </div>
              <div className="vqc-cartao">
                <div className="vqc-numero">{estatisticas.totalInscricoes}</div>
                <div className="vqc-legenda">Leads inscritas</div>
              </div>
              <div className="vqc-cartao">
                <div className="vqc-numero">{estatisticas.presencas}</div>
                <div className="vqc-legenda">Participaram</div>
              </div>
              <div className="vqc-cartao">
                <div className="vqc-numero">{comparencia(estatisticas)}</div>
                <div className="vqc-legenda">Comparência</div>
              </div>
            </div>
          </>
        )}
        {estadoEstatisticas === "feito" && erroEstatisticas && (
          <p className="vqc-erro">{erroEstatisticas}</p>
        )}
      </div>
    </div>
  );
}
