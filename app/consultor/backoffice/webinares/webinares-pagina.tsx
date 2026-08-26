"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";

type EstadoLead = "follow_up" | "convertido" | "desistiu";

interface LeadConsolidado {
  nome: string;
  telemovel: string | null;
  email: string;
  sessoesFeitas: number;
  assistiu: boolean;
  percentagemAssistencia: number | null;
  trazidoPor: string | null;
  estado: EstadoLead | null;
  podeEditar: boolean;
}

interface ResumoLeads {
  leadsTotais: number;
  assistiram: number;
  followUp: number;
  convertidos: number;
  desistiram: number;
  leads: LeadConsolidado[];
}

const ESTADOS: { valor: EstadoLead; rotulo: string }[] = [
  { valor: "follow_up", rotulo: "Follow up" },
  { valor: "convertido", rotulo: "Converteu" },
  { valor: "desistiu", rotulo: "Desistiu" },
];

export function WebinaresPagina() {
  const [email, setEmail] = useState<string | null>(null);
  const [dados, setDados] = useState<ResumoLeads | null>(null);
  const [erro, setErro] = useState("");
  const [aAtualizar, setAAtualizar] = useState<string | null>(null);

  async function carregar(emailAtual: string): Promise<void> {
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAtual }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível obter as leads");
        return;
      }
      setDados(corpo);
    } catch {
      setErro("falha de ligação — tenta outra vez");
    }
  }

  useEffect(() => {
    const guardado = lerEmailGuardado();
    setEmail(guardado);
    if (guardado) void carregar(guardado);
  }, []);

  async function mudarEstado(leadEmail: string, estado: EstadoLead): Promise<void> {
    if (!email) return;
    setAAtualizar(leadEmail);
    try {
      const resposta = await fetch("/api/consultor/backoffice/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, leadEmail, estado }),
      });
      if (resposta.ok) {
        await carregar(email);
      }
    } finally {
      setAAtualizar(null);
    }
  }

  return (
    <div className="vqw-pagina">
      <style>{`
        .vqw-pagina {
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqw-caixa { max-width: 1100px; margin: 0 auto; }
        .vqw-voltar { color: #d4af37; font-size: 0.85rem; text-decoration: none; }
        .vqw-voltar:hover { text-decoration: underline; }
        .vqw-pagina h1 { color: #fff; font-size: 1.5rem; margin: 0.75rem 0 1.25rem; }
        .vqw-mudo { color: #b3b0a6; font-size: 0.9rem; }
        .vqw-erro { color: #ff9b8a; }
        .vqw-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .vqw-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 10px;
          padding: 1.1rem 1.25rem;
        }
        .vqw-numero { font-size: 1.9rem; font-weight: 800; line-height: 1.1; }
        .vqw-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .vqw-tabela-wrap {
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .vqw-tabela { width: 100%; min-width: 800px; border-collapse: collapse; background: #f7f6f3; }
        .vqw-tabela th, .vqw-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #15130f;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .vqw-tabela th { color: #6b6a63; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .vqw-tabela tr:last-child td { border-bottom: none; }
        .vqw-estados { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .vqw-pilula {
          display: inline-flex;
          align-items: center;
          box-sizing: border-box;
          border-radius: 999px;
          padding: 0.25rem 0.65rem;
          font-size: 0.75rem;
          font-family: inherit;
          line-height: 1.4;
          font-weight: 600;
          border: 1px solid transparent;
          white-space: nowrap;
          margin: 0;
        }
        .vqw-pilula-assistiu { background: #e4f3e4; color: #0ca30c; border-color: #c9e8c9; }
        .vqw-pilula-assistiu.vqw-inativa { background: #eee; color: #999; border-color: #ddd; }
        .vqw-tabela button.vqw-pilula {
          cursor: pointer;
          background: #eee;
          color: #555;
        }
        .vqw-tabela button.vqw-pilula:disabled { opacity: 0.5; cursor: default; }
        .vqw-tabela button.vqw-pilula.vqw-ativa-follow_up { background: #f1e6c9; color: #4a3c10; border-color: #e2cf94; }
        .vqw-tabela button.vqw-pilula.vqw-ativa-convertido { background: #e4f3e4; color: #0ca30c; border-color: #c9e8c9; }
        .vqw-tabela button.vqw-pilula.vqw-ativa-desistiu { background: #f8e2e0; color: #a33; border-color: #f0c4c1; }
      `}</style>

      <div className="vqw-caixa">
        <Link href="/consultor/backoffice" className="vqw-voltar">
          ← Backoffice
        </Link>
        <h1>Webinares</h1>

        {!email && (
          <p className="vqw-mudo">
            Não estás identificado — <Link href="/consultor/backoffice">entra aqui primeiro</Link>.
          </p>
        )}
        {erro && <p className="vqw-erro">{erro}</p>}

        {dados && (
          <>
            <div className="vqw-grid">
              <div className="vqw-cartao">
                <div className="vqw-numero">{dados.leadsTotais}</div>
                <div className="vqw-legenda">Leads totais</div>
              </div>
              <div className="vqw-cartao">
                <div className="vqw-numero">{dados.assistiram}</div>
                <div className="vqw-legenda">Assistiram</div>
              </div>
              <div className="vqw-cartao">
                <div className="vqw-numero">{dados.followUp}</div>
                <div className="vqw-legenda">Follow up</div>
              </div>
              <div className="vqw-cartao">
                <div className="vqw-numero">{dados.convertidos}</div>
                <div className="vqw-legenda">Convertidos</div>
              </div>
            </div>

            {dados.leads.length === 0 ? (
              <p className="vqw-mudo">Ainda sem leads em nenhuma sessão pública.</p>
            ) : (
              <div className="vqw-tabela-wrap">
                <table className="vqw-tabela">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Trazido por</th>
                      <th>Sessões</th>
                      <th>% assistência</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.leads.map((lead) => (
                      <tr key={lead.email}>
                        <td>
                          <div>{lead.nome}</div>
                          <div className="vqw-mudo" style={{ margin: 0, fontSize: "0.8rem" }}>
                            {lead.email}
                            {lead.telemovel ? ` · ${lead.telemovel}` : ""}
                          </div>
                        </td>
                        <td>{lead.trazidoPor ?? "Eu"}</td>
                        <td>{lead.sessoesFeitas}</td>
                        <td>
                          {lead.percentagemAssistencia !== null ? `${lead.percentagemAssistencia}%` : "—"}
                        </td>
                        <td>
                          <div className="vqw-estados">
                            <span className={lead.assistiu ? "vqw-pilula vqw-pilula-assistiu" : "vqw-pilula vqw-pilula-assistiu vqw-inativa"}>
                              Assistiu
                            </span>
                            {lead.podeEditar &&
                              ESTADOS.map((e) => (
                                <button
                                  key={e.valor}
                                  type="button"
                                  className={
                                    lead.estado === e.valor
                                      ? `vqw-pilula vqw-ativa-${e.valor}`
                                      : "vqw-pilula"
                                  }
                                  disabled={aAtualizar === lead.email}
                                  onClick={() => mudarEstado(lead.email, e.valor)}
                                >
                                  {e.rotulo}
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
