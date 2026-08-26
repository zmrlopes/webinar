"use client";

import { useEffect, useState } from "react";

interface LeadConsultor {
  nome: string;
  telemovel: string | null;
  email: string;
  abriuLink: "sim" | "nao";
  percentagemAssistencia: number | null;
  linkZoom: string | null;
  trazidoPor: string | null;
}

interface NoEquipa {
  nome: string;
  email: string;
  nivel: string | null;
  estado: string;
  leadsProprios: number;
  leadsEquipa: number;
  filhos: NoEquipa[];
}

interface ArvoreEquipa {
  diretos: number;
  equipaTotal: number;
  equipaAtiva: number;
  leadsEquipaTotal: number;
  raiz: NoEquipa[];
}

interface DadosEstatisticas {
  webinar: { id: string; titulo: string; sessaoExternaEm: string };
  aberturas: number;
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
  equipaTotal: number;
  leads: LeadConsultor[];
  equipa: ArvoreEquipa | null;
}

const NOME_NIVEL: Record<string, string> = {
  JUNIOR: "Júnior",
  SENIOR: "Sénior",
  COORDENADOR: "Coordenador",
  DIRETOR: "Diretor",
  MASTER: "Master",
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function textoAbriuLink(estado: LeadConsultor["abriuLink"]): string {
  return estado === "sim" ? "Sim" : "Não";
}

function comparencia(estatisticas: DadosEstatisticas): string {
  if (estatisticas.totalInscricoes === 0) return "—";
  return `${Math.round((estatisticas.presencas / estatisticas.totalInscricoes) * 100)}%`;
}

function temResultado(no: NoEquipa, termo: string): boolean {
  if (!termo) return true;
  if (no.nome.toLowerCase().includes(termo)) return true;
  return no.filhos.some((f) => temResultado(f, termo));
}

function passaFiltroEstado(no: NoEquipa, soAtivos: boolean): boolean {
  if (!soAtivos) return true;
  if (no.estado === "ACTIVE") return true;
  return no.filhos.some((f) => passaFiltroEstado(f, soAtivos));
}

function todosComFilhos(nos: NoEquipa[]): string[] {
  let emails: string[] = [];
  for (const no of nos) {
    if (no.filhos.length > 0) {
      emails.push(no.email);
      emails = emails.concat(todosComFilhos(no.filhos));
    }
  }
  return emails;
}

function NoArvoreEquipa({
  no,
  termo,
  soAtivos,
  abertos,
  toggleAberto,
}: {
  no: NoEquipa;
  termo: string;
  soAtivos: boolean;
  abertos: Set<string>;
  toggleAberto: (email: string) => void;
}) {
  if (!temResultado(no, termo) || !passaFiltroEstado(no, soAtivos)) return null;

  const temFilhos = no.filhos.length > 0;
  const abertoPelaPesquisa = termo !== "" && no.filhos.some((f) => temResultado(f, termo));
  const aberto = abertoPelaPesquisa || abertos.has(no.email);

  return (
    <li className="vqs-eq-no">
      <div className="vqs-eq-linha">
        {temFilhos ? (
          <button
            type="button"
            className="vqs-eq-expandir"
            onClick={() => toggleAberto(no.email)}
            aria-label="Expandir/colapsar"
          >
            <span className={aberto ? "vqs-eq-seta vqs-eq-seta-aberta" : "vqs-eq-seta"}>▸</span>
          </button>
        ) : (
          <span className="vqs-eq-expandir-vazio" />
        )}
        <span className={`vqs-eq-ponto vqs-eq-ponto-${no.estado}`} title={no.estado} />
        <span className="vqs-eq-nome">{no.nome}</span>
        <span className={`vqs-eq-etiqueta vqs-eq-nivel-${(no.nivel ?? "").toLowerCase()}`}>
          {NOME_NIVEL[no.nivel ?? ""] ?? no.nivel ?? "—"}
        </span>
        {temFilhos && (
          <span className="vqs-eq-contagem">
            {no.filhos.length} direto{no.filhos.length === 1 ? "" : "s"}
          </span>
        )}
        <span className="vqs-eq-leads">
          <strong>{no.leadsProprios}</strong> leads
          {temFilhos && (
            <>
              {" · "}
              <strong>{no.leadsEquipa}</strong> na equipa
            </>
          )}
        </span>
      </div>
      {temFilhos && aberto && (
        <ul className="vqs-eq-arvore">
          {no.filhos.map((filho) => (
            <NoArvoreEquipa
              key={filho.email}
              no={filho}
              termo={termo}
              soAtivos={soAtivos}
              abertos={abertos}
              toggleAberto={toggleAberto}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Vista de uma única sessão, dentro do separador "por sessão" da página de
 * webinares do backoffice — réplica fiel do painel `/consultor` atual
 * (cartões + árvore da equipa + tabela de leads com link do Zoom), só que
 * embutida aqui em vez de ser a página toda.
 */
export function SessaoUnica({ email, webinarId }: { email: string; webinarId: string }) {
  const [estado, setEstado] = useState<"a-carregar" | "pronto" | "erro">("a-carregar");
  const [dados, setDados] = useState<DadosEstatisticas | null>(null);
  const [erro, setErro] = useState("");
  const [emailCopiado, setEmailCopiado] = useState<string | null>(null);

  const [pesquisaEquipa, setPesquisaEquipa] = useState("");
  const [soAtivosEquipa, setSoAtivosEquipa] = useState(false);
  const [abertosEquipa, setAbertosEquipa] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelado = false;
    setEstado("a-carregar");
    setErro("");
    setPesquisaEquipa("");
    setSoAtivosEquipa(false);
    setAbertosEquipa(new Set());

    (async () => {
      try {
        const resposta = await fetch("/api/consultor/estatisticas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, webinarId }),
        });
        const corpo = await resposta.json().catch(() => ({}));
        if (cancelado) return;
        if (!resposta.ok) {
          setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível obter os números");
          setEstado("erro");
          return;
        }
        setDados(corpo);
        setEstado("pronto");
      } catch {
        if (cancelado) return;
        setErro("falha de ligação — tenta outra vez");
        setEstado("erro");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [email, webinarId]);

  async function copiarLinkZoom(lead: LeadConsultor): Promise<void> {
    if (!lead.linkZoom) return;
    await navigator.clipboard.writeText(lead.linkZoom);
    setEmailCopiado(lead.email);
  }

  function toggleAbertoEquipa(emailNo: string): void {
    setAbertosEquipa((atual) => {
      const novo = new Set(atual);
      if (novo.has(emailNo)) novo.delete(emailNo);
      else novo.add(emailNo);
      return novo;
    });
  }

  const termoEquipa = pesquisaEquipa.trim().toLowerCase();

  return (
    <div className="vqs-bloco">
      <style>{`
        .vqs-bloco h2 { color: #d4af37; font-size: 1.2rem; margin: 2rem 0 0.4rem; }
        .vqs-mudo { color: #b3b0a6; font-size: 0.9rem; margin: 0 0 1.25rem; }
        .vqs-erro { color: #ff9b8a; margin-top: 0.75rem; }
        .vqs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }
        .vqs-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 10px;
          padding: 1.1rem 1.25rem;
        }
        .vqs-cartao .vqs-numero { font-size: 1.9rem; font-weight: 800; line-height: 1.1; color: #15130f; }
        .vqs-cartao .vqs-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .vqs-cartao.vqs-cartao-equipa { border-top: 3px solid #3a2f77; }
        .vqs-tabela-wrap {
          margin-top: 1.25rem;
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .vqs-tabela {
          width: 100%;
          min-width: 560px;
          border-collapse: collapse;
          background: #f7f6f3;
        }
        .vqs-tabela th, .vqs-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #15130f;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .vqs-tabela th {
          color: #6b6a63;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .vqs-tabela tr:last-child td { border-bottom: none; }
        .vqs-botao-tabela {
          background: transparent;
          color: #d4af37;
          border: 1px solid #6b5c2e;
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .vqs-eq-ferramentas {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          align-items: center;
          margin: 1.1rem 0 0.85rem;
        }
        .vqs-eq-ferramentas input[type="search"] {
          flex: 1 1 200px;
          min-width: 160px;
          box-sizing: border-box;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 1rem;
        }
        .vqs-eq-ferramentas input::placeholder { color: #85817a; }
        .vqs-eq-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #b3b0a6;
          font-size: 0.85rem;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .vqs-eq-toggle input { accent-color: #b8902f; width: 15px; height: 15px; }
        .vqs-eq-btn-texto {
          background: transparent;
          border: 1px solid #6b5c2e;
          color: #d4af37;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.45rem 0.8rem;
          white-space: nowrap;
          cursor: pointer;
        }

        .vqs-eq-caixa {
          border: 1px solid #eae7de;
          border-radius: 10px;
          overflow: hidden;
          background: #f7f6f3;
        }
        .vqs-eq-vazio { padding: 1.5rem 1.25rem; color: #6b6a63; text-align: center; font-size: 0.9rem; }

        ul.vqs-eq-arvore { list-style: none; margin: 0; padding: 0; }
        ul.vqs-eq-arvore ul.vqs-eq-arvore {
          padding-left: 1.3rem;
          border-left: 1px dashed #eae7de;
          margin-left: 1rem;
        }
        .vqs-eq-no { border-bottom: 1px solid #eae7de; }
        .vqs-eq-no:last-child { border-bottom: none; }
        .vqs-eq-linha { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; flex-wrap: wrap; }

        .vqs-eq-expandir {
          background: transparent;
          border: none;
          color: #6b6a63;
          cursor: pointer;
          width: 20px;
          height: 20px;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border-radius: 4px;
        }
        .vqs-eq-expandir:hover { background: rgba(0,0,0,0.06); }
        .vqs-eq-seta { display: inline-block; font-size: 0.7rem; transition: transform 0.15s; }
        .vqs-eq-seta-aberta { transform: rotate(90deg); }
        .vqs-eq-expandir-vazio { width: 20px; flex: none; }

        .vqs-eq-ponto { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .vqs-eq-ponto-ACTIVE { background: #0ca30c; }
        .vqs-eq-ponto-SUSPENDED { background: #b8860b; }
        .vqs-eq-ponto-CANCELED { background: #d03b3b; }

        .vqs-eq-nome { font-size: 0.88rem; font-weight: 600; color: #15130f; }
        .vqs-eq-etiqueta {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 0.1rem 0.5rem;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .vqs-eq-nivel-junior { background: #eee; color: #555; border-color: #ddd; }
        .vqs-eq-nivel-senior { background: #e6eef7; color: #2c5282; border-color: #cfe0f2; }
        .vqs-eq-nivel-coordenador { background: #f1e6c9; color: #4a3c10; border-color: #e2cf94; }
        .vqs-eq-nivel-diretor { background: #e4e0f6; color: #3a2f77; border-color: #cac2ec; }
        .vqs-eq-nivel-master { background: #f8e2e0; color: #7a1f1f; border-color: #f0c4c1; }

        .vqs-eq-contagem { color: #6b6a63; font-size: 0.75rem; white-space: nowrap; }
        .vqs-eq-leads {
          margin-left: auto;
          text-align: right;
          font-size: 0.78rem;
          color: #6b6a63;
          white-space: nowrap;
        }
        .vqs-eq-leads strong { color: #15130f; font-size: 0.92rem; }

        @media (max-width: 560px) {
          .vqs-eq-leads { margin-left: 2rem; }
        }
      `}</style>

      {estado === "a-carregar" && <p className="vqs-mudo">A carregar...</p>}
      {estado === "erro" && <p className="vqs-erro">{erro}</p>}

      {dados && (
        <>
          <h2>{dados.equipaTotal > 0 ? "Os números (eu + equipa)" : "Os meus números"}</h2>
          <p className="vqs-mudo">
            {dados.webinar.titulo} — {formatarData(dados.webinar.sessaoExternaEm)}
            {dados.equipaTotal > 0 && ` · inclui a tua equipa (${dados.equipaTotal} pessoas)`}
          </p>
          <div className="vqs-grid">
            <div className="vqs-cartao">
              <div className="vqs-numero">{dados.aberturas}</div>
              <div className="vqs-legenda">
                {dados.equipaTotal > 0 ? "Aberturas do link (eu + equipa)" : "Aberturas do meu link"}
              </div>
            </div>
            <div className="vqs-cartao">
              <div className="vqs-numero">{dados.totalInscricoes}</div>
              <div className="vqs-legenda">Leads inscritas</div>
            </div>
            <div className="vqs-cartao">
              <div className="vqs-numero">{dados.presencas}</div>
              <div className="vqs-legenda">Participaram</div>
            </div>
            <div className="vqs-cartao">
              <div className="vqs-numero">{comparencia(dados)}</div>
              <div className="vqs-legenda">Comparência</div>
            </div>
          </div>

          {dados.equipa && (
            <>
              <h2>A minha equipa</h2>
              <p className="vqs-mudo">Todos os consultores que estão, direta ou indiretamente, abaixo de ti.</p>
              <div className="vqs-grid">
                <div className="vqs-cartao vqs-cartao-equipa">
                  <div className="vqs-numero">{dados.equipa.diretos}</div>
                  <div className="vqs-legenda">Diretos</div>
                </div>
                <div className="vqs-cartao vqs-cartao-equipa">
                  <div className="vqs-numero">{dados.equipa.equipaTotal}</div>
                  <div className="vqs-legenda">Equipa total</div>
                </div>
                <div className="vqs-cartao vqs-cartao-equipa">
                  <div className="vqs-numero">{dados.equipa.equipaAtiva}</div>
                  <div className="vqs-legenda">Ativos na equipa</div>
                </div>
                <div className="vqs-cartao vqs-cartao-equipa">
                  <div className="vqs-numero">{dados.equipa.leadsEquipaTotal}</div>
                  <div className="vqs-legenda">Leads da equipa nesta sessão</div>
                </div>
              </div>

              <div className="vqs-eq-ferramentas">
                <input
                  type="search"
                  placeholder="Procurar por nome na equipa…"
                  aria-label="Procurar por nome na equipa"
                  value={pesquisaEquipa}
                  onChange={(e) => setPesquisaEquipa(e.target.value)}
                />
                <label className="vqs-eq-toggle">
                  <input
                    type="checkbox"
                    checked={soAtivosEquipa}
                    onChange={(e) => setSoAtivosEquipa(e.target.checked)}
                  />
                  Mostrar só ativos
                </label>
                <button
                  type="button"
                  className="vqs-eq-btn-texto"
                  onClick={() => setAbertosEquipa(new Set(todosComFilhos(dados.equipa!.raiz)))}
                >
                  Expandir tudo
                </button>
                <button type="button" className="vqs-eq-btn-texto" onClick={() => setAbertosEquipa(new Set())}>
                  Colapsar tudo
                </button>
              </div>

              <div className="vqs-eq-caixa">
                {dados.equipa.raiz.length === 0 ? (
                  <div className="vqs-eq-vazio">Ainda sem equipa direta.</div>
                ) : (
                  <ul className="vqs-eq-arvore">
                    {dados.equipa.raiz.map((no) => (
                      <NoArvoreEquipa
                        key={no.email}
                        no={no}
                        termo={termoEquipa}
                        soAtivos={soAtivosEquipa}
                        abertos={abertosEquipa}
                        toggleAberto={toggleAbertoEquipa}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {dados.leads.length > 0 && (
            <div className="vqs-tabela-wrap">
              <table className="vqs-tabela">
                <thead>
                  <tr>
                    <th>Lead</th>
                    {dados.equipaTotal > 0 && <th>Trazido por</th>}
                    <th>Abriu o link do Zoom</th>
                    <th>% de assistência</th>
                    <th>Link do Zoom</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.leads.map((lead) => (
                    <tr key={lead.email}>
                      <td>
                        <div>{lead.nome}</div>
                        <div className="vqs-mudo" style={{ margin: 0, fontSize: "0.8rem" }}>
                          {lead.email}
                          {lead.telemovel ? ` · ${lead.telemovel}` : ""}
                        </div>
                      </td>
                      {dados.equipaTotal > 0 && <td>{lead.trazidoPor ?? "Eu"}</td>}
                      <td>{textoAbriuLink(lead.abriuLink)}</td>
                      <td>{lead.percentagemAssistencia !== null ? `${lead.percentagemAssistencia}%` : "—"}</td>
                      <td>
                        {lead.linkZoom ? (
                          <button type="button" className="vqs-botao-tabela" onClick={() => copiarLinkZoom(lead)}>
                            {emailCopiado === lead.email ? "Copiado!" : "Copiar link do Zoom"}
                          </button>
                        ) : (
                          <span className="vqs-mudo" style={{ margin: 0 }}>
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
    </div>
  );
}
