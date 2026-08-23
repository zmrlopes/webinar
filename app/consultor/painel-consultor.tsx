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
  webinar: { titulo: string; sessaoExternaEm: string };
  aberturas: number;
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
  equipaTotal: number;
  leads: LeadConsultor[];
  equipa: ArvoreEquipa | null;
}

function textoAbriuLink(estado: LeadConsultor["abriuLink"]): string {
  return estado === "sim" ? "Sim" : "Não";
}

const NOME_NIVEL: Record<string, string> = {
  JUNIOR: "Júnior",
  SENIOR: "Sénior",
  COORDENADOR: "Coordenador",
  DIRETOR: "Diretor",
  MASTER: "Master",
};

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
    <li className="vqc-eq-no">
      <div className="vqc-eq-linha">
        {temFilhos ? (
          <button
            type="button"
            className="vqc-eq-expandir"
            onClick={() => toggleAberto(no.email)}
            aria-label="Expandir/colapsar"
          >
            <span className={aberto ? "vqc-eq-seta vqc-eq-seta-aberta" : "vqc-eq-seta"}>▸</span>
          </button>
        ) : (
          <span className="vqc-eq-expandir-vazio" />
        )}
        <span className={`vqc-eq-ponto vqc-eq-ponto-${no.estado}`} title={no.estado} />
        <span className="vqc-eq-nome">{no.nome}</span>
        <span className={`vqc-eq-etiqueta vqc-eq-nivel-${(no.nivel ?? "").toLowerCase()}`}>
          {NOME_NIVEL[no.nivel ?? ""] ?? no.nivel ?? "—"}
        </span>
        {temFilhos && (
          <span className="vqc-eq-contagem">
            {no.filhos.length} direto{no.filhos.length === 1 ? "" : "s"}
          </span>
        )}
        <span className="vqc-eq-leads">
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
        <ul className="vqc-eq-arvore">
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

  const [pesquisaEquipa, setPesquisaEquipa] = useState("");
  const [soAtivosEquipa, setSoAtivosEquipa] = useState(false);
  const [abertosEquipa, setAbertosEquipa] = useState<Set<string>>(new Set());

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
    setPesquisaEquipa("");
    setSoAtivosEquipa(false);
    setAbertosEquipa(new Set());

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

  function toggleAbertoEquipa(emailNo: string): void {
    setAbertosEquipa((atual) => {
      const novo = new Set(atual);
      if (novo.has(emailNo)) novo.delete(emailNo);
      else novo.add(emailNo);
      return novo;
    });
  }

  const aPedirAlgo = estadoLink === "a-pedir" || estadoEstatisticas === "a-pedir";
  const termoEquipa = pesquisaEquipa.trim().toLowerCase();

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
        .vqc-cartao.vqc-cartao-equipa { border-top: 3px solid #3a2f77; }
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

        .vqc-eq-ferramentas {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          align-items: center;
          margin: 1.1rem 0 0.85rem;
        }
        .vqc-eq-ferramentas input[type="search"] {
          flex: 1 1 200px;
          min-width: 160px;
        }
        .vqc-eq-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #b3b0a6;
          font-size: 0.85rem;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .vqc-eq-toggle input { accent-color: #b8902f; width: 15px; height: 15px; }
        .vqc-eq-btn-texto {
          background: transparent;
          border: 1px solid #6b5c2e;
          color: #d4af37;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.45rem 0.8rem;
          white-space: nowrap;
        }

        .vqc-eq-caixa {
          border: 1px solid #eae7de;
          border-radius: 10px;
          overflow: hidden;
          background: #f7f6f3;
        }
        .vqc-eq-vazio { padding: 1.5rem 1.25rem; color: #6b6a63; text-align: center; font-size: 0.9rem; }

        ul.vqc-eq-arvore { list-style: none; margin: 0; padding: 0; }
        ul.vqc-eq-arvore ul.vqc-eq-arvore {
          padding-left: 1.3rem;
          border-left: 1px dashed #eae7de;
          margin-left: 1rem;
        }
        .vqc-eq-no { border-bottom: 1px solid #eae7de; }
        .vqc-eq-no:last-child { border-bottom: none; }
        .vqc-eq-linha { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; flex-wrap: wrap; }

        .vqc-eq-expandir {
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
        .vqc-eq-expandir:hover { background: rgba(0,0,0,0.06); }
        .vqc-eq-seta { display: inline-block; font-size: 0.7rem; transition: transform 0.15s; }
        .vqc-eq-seta-aberta { transform: rotate(90deg); }
        .vqc-eq-expandir-vazio { width: 20px; flex: none; }

        .vqc-eq-ponto { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .vqc-eq-ponto-ACTIVE { background: #0ca30c; }
        .vqc-eq-ponto-SUSPENDED { background: #b8860b; }
        .vqc-eq-ponto-CANCELED { background: #d03b3b; }

        .vqc-eq-nome { font-size: 0.88rem; font-weight: 600; color: #15130f; }
        .vqc-eq-etiqueta {
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
        .vqc-eq-nivel-junior { background: #eee; color: #555; border-color: #ddd; }
        .vqc-eq-nivel-senior { background: #e6eef7; color: #2c5282; border-color: #cfe0f2; }
        .vqc-eq-nivel-coordenador { background: #f1e6c9; color: #4a3c10; border-color: #e2cf94; }
        .vqc-eq-nivel-diretor { background: #e4e0f6; color: #3a2f77; border-color: #cac2ec; }
        .vqc-eq-nivel-master { background: #f8e2e0; color: #7a1f1f; border-color: #f0c4c1; }

        .vqc-eq-contagem { color: #6b6a63; font-size: 0.75rem; white-space: nowrap; }
        .vqc-eq-leads {
          margin-left: auto;
          text-align: right;
          font-size: 0.78rem;
          color: #6b6a63;
          white-space: nowrap;
        }
        .vqc-eq-leads strong { color: #15130f; font-size: 0.92rem; }

        @media (max-width: 560px) {
          .vqc-linha { flex-direction: column; align-items: stretch; }
          .vqc-linha > div, .vqc-linha input, .vqc-linha button { width: 100%; min-width: 0; }
          .vqc-eq-leads { margin-left: 2rem; }
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

            {estatisticas.equipa && (
              <>
                <h2>A minha equipa</h2>
                <p className="vqc-mudo">Todos os consultores que estão, direta ou indiretamente, abaixo de ti.</p>
                <div className="vqc-grid">
                  <div className="vqc-cartao vqc-cartao-equipa">
                    <div className="vqc-numero">{estatisticas.equipa.diretos}</div>
                    <div className="vqc-legenda">Diretos</div>
                  </div>
                  <div className="vqc-cartao vqc-cartao-equipa">
                    <div className="vqc-numero">{estatisticas.equipa.equipaTotal}</div>
                    <div className="vqc-legenda">Equipa total</div>
                  </div>
                  <div className="vqc-cartao vqc-cartao-equipa">
                    <div className="vqc-numero">{estatisticas.equipa.equipaAtiva}</div>
                    <div className="vqc-legenda">Ativos na equipa</div>
                  </div>
                  <div className="vqc-cartao vqc-cartao-equipa">
                    <div className="vqc-numero">{estatisticas.equipa.leadsEquipaTotal}</div>
                    <div className="vqc-legenda">Leads da equipa nesta sessão</div>
                  </div>
                </div>

                <div className="vqc-eq-ferramentas">
                  <input
                    type="search"
                    placeholder="Procurar por nome na equipa…"
                    aria-label="Procurar por nome na equipa"
                    value={pesquisaEquipa}
                    onChange={(e) => setPesquisaEquipa(e.target.value)}
                  />
                  <label className="vqc-eq-toggle">
                    <input
                      type="checkbox"
                      checked={soAtivosEquipa}
                      onChange={(e) => setSoAtivosEquipa(e.target.checked)}
                    />
                    Mostrar só ativos
                  </label>
                  <button
                    type="button"
                    className="vqc-eq-btn-texto"
                    onClick={() => setAbertosEquipa(new Set(todosComFilhos(estatisticas.equipa!.raiz)))}
                  >
                    Expandir tudo
                  </button>
                  <button
                    type="button"
                    className="vqc-eq-btn-texto"
                    onClick={() => setAbertosEquipa(new Set())}
                  >
                    Colapsar tudo
                  </button>
                </div>

                <div className="vqc-eq-caixa">
                  {estatisticas.equipa.raiz.length === 0 ? (
                    <div className="vqc-eq-vazio">Ainda sem equipa direta.</div>
                  ) : (
                    <ul className="vqc-eq-arvore">
                      {estatisticas.equipa.raiz.map((no) => (
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
