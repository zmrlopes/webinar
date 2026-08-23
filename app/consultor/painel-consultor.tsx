"use client";

import { useState } from "react";

interface DadosLink {
  link: string;
  nome: string | null;
}

interface LeadConsultor {
  nome: string;
  telemovel: string | null;
  email: string;
  abriuLink: "sim" | "nao" | "por-confirmar";
  percentagemAssistencia: number | null;
  linkZoom: string | null;
  trazidoPor: string | null;
}

interface DadosEstatisticas {
  webinar: { titulo: string; sessaoExternaEm: string };
  aberturas: number;
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
  equipaTotal: number;
  leads: LeadConsultor[];
}

function textoAbriuLink(estado: LeadConsultor["abriuLink"]): string {
  if (estado === "sim") return "Sim";
  if (estado === "nao") return "Não";
  return "Por confirmar";
}

type EstadoPedido = "pronto" | "a-pedir" | "feito";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
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
  const [emailCopiado, setEmailCopiado] = useState<string | null>(null);

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

  async function copiarLinkZoom(lead: LeadConsultor): Promise<void> {
    if (!lead.linkZoom) return;
    await navigator.clipboard.writeText(lead.linkZoom);
    setEmailCopiado(lead.email);
  }

  const aPedirAlgo = estadoLink === "a-pedir" || estadoEstatisticas === "a-pedir";

  return (
    <div className="vqc-pagina">
      <style>{`
        .vqc-pagina {
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqc-caixa { max-width: 760px; margin: 0 auto; }
        .vqc-pagina h1 {
          color: #fff;
          font-size: 1.6rem;
          margin: 0 0 0.4rem;
        }
        .vqc-pagina h2 {
          color: #d4af37;
          font-size: 1.2rem;
          margin: 2.5rem 0 0.4rem;
        }
        .vqc-pagina .vqc-mudo { color: #b3b0a6; font-size: 0.9rem; margin: 0 0 1.25rem; }
        .vqc-pagina .vqc-linha { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
        .vqc-pagina label { display: block; font-weight: 600; margin: 0 0 0.35rem; color: #e8e6df; }
        .vqc-pagina input {
          box-sizing: border-box;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 1rem;
          min-width: 260px;
          margin: 0;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vqc-pagina input:focus {
          outline: none;
          border-color: #b8902f;
          box-shadow: 0 0 0 3px rgba(184, 144, 47, 0.25);
        }
        .vqc-pagina input::placeholder { color: #85817a; }
        .vqc-pagina button {
          background: linear-gradient(135deg, #e8c96a, #b8902f);
          color: #1a1712;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.3rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          margin: 0;
          transition: filter 0.15s;
        }
        .vqc-pagina button:hover:not(:disabled) { filter: brightness(1.08); }
        .vqc-pagina button.vqc-secundario {
          background: transparent;
          color: #d4af37;
          border: 1px solid #6b5c2e;
        }
        .vqc-pagina button:disabled { opacity: 0.5; cursor: default; }
        .vqc-pagina .vqc-erro { color: #ff9b8a; margin-top: 0.75rem; }
        .vqc-linkbox {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          word-break: break-all;
          font-family: monospace;
          color: #f2f0ea;
        }
        .vqc-linkbox-acoes { margin-top: 0.75rem; }
        .vqc-linkbox-acoes button { padding: 0.45rem 1rem; font-size: 0.9rem; }
        .vqc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }
        .vqc-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 10px;
          padding: 1.1rem 1.25rem;
        }
        .vqc-cartao .vqc-numero { font-size: 1.9rem; font-weight: 800; line-height: 1.1; color: #15130f; }
        .vqc-cartao .vqc-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .vqc-tabela-wrap {
          margin-top: 1.25rem;
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .vqc-tabela {
          width: 100%;
          min-width: 560px;
          border-collapse: collapse;
          background: #f7f6f3;
        }
        .vqc-tabela th, .vqc-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #15130f;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .vqc-tabela th {
          color: #6b6a63;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .vqc-tabela tr:last-child td { border-bottom: none; }
        .vqc-botao-tabela { padding: 0.4rem 0.8rem; font-size: 0.8rem; white-space: nowrap; }

        @media (max-width: 560px) {
          .vqc-linha { flex-direction: column; align-items: stretch; }
          .vqc-linha > div, .vqc-linha input, .vqc-linha button { width: 100%; min-width: 0; }
        }
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
            <h2>{estatisticas.equipaTotal > 0 ? "Os números (eu + equipa)" : "Os meus números"}</h2>
            <p className="vqc-mudo">
              {estatisticas.webinar.titulo} — {formatarData(estatisticas.webinar.sessaoExternaEm)}
              {estatisticas.equipaTotal > 0 &&
                ` · inclui a tua equipa (${estatisticas.equipaTotal} pessoas)`}
            </p>
            <div className="vqc-grid">
              <div className="vqc-cartao">
                <div className="vqc-numero">{estatisticas.aberturas}</div>
                <div className="vqc-legenda">
                  {estatisticas.equipaTotal > 0 ? "Aberturas do link (eu + equipa)" : "Aberturas do meu link"}
                </div>
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

            {estatisticas.leads.length > 0 && (
              <div className="vqc-tabela-wrap">
                <table className="vqc-tabela">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      {estatisticas.equipaTotal > 0 && <th>Trazido por</th>}
                      <th>Abriu o link do Zoom</th>
                      <th>% de assistência</th>
                      <th>Link do Zoom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estatisticas.leads.map((lead) => (
                      <tr key={lead.email}>
                        <td>
                          <div>{lead.nome}</div>
                          <div className="vqc-mudo" style={{ margin: 0, fontSize: "0.8rem" }}>
                            {lead.email}
                            {lead.telemovel ? ` · ${lead.telemovel}` : ""}
                          </div>
                        </td>
                        {estatisticas.equipaTotal > 0 && <td>{lead.trazidoPor ?? "Eu"}</td>}
                        <td>{textoAbriuLink(lead.abriuLink)}</td>
                        <td>
                          {lead.percentagemAssistencia !== null
                            ? `${lead.percentagemAssistencia}%`
                            : "—"}
                        </td>
                        <td>
                          {lead.linkZoom ? (
                            <button
                              type="button"
                              className="vqc-secundario vqc-botao-tabela"
                              onClick={() => copiarLinkZoom(lead)}
                            >
                              {emailCopiado === lead.email ? "Copiado!" : "Copiar link do Zoom"}
                            </button>
                          ) : (
                            <span className="vqc-mudo" style={{ margin: 0 }}>
                              ainda sem link
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {estadoEstatisticas === "feito" && erroEstatisticas && (
          <p className="vqc-erro">{erroEstatisticas}</p>
        )}
      </div>
    </div>
  );
}
