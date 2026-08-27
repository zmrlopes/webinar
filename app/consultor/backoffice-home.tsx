"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guardarEmail, lerEmailGuardado, limparEmailGuardado } from "./armazenamento";
import { EventoForm } from "./evento-form";

interface DadosIdentificacao {
  nome: string | null;
  link: string;
  ehConsultorEquipa: boolean;
  formacao: { titulo: string; sessaoExternaEm: string } | null;
  proximoWebinar: { titulo: string; sessaoExternaEm: string } | null;
  formacoesEquipa: { id: string; titulo: string; sessaoExternaEm: string }[];
}

type Estado = "a-carregar" | "por-identificar" | "pronto" | "erro";
type Seccao = "sessoes" | "eventos" | null;

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
  const [aPedirFormacaoId, setAPedirFormacaoId] = useState<string | null>(null);
  const [errosFormacaoAdHoc, setErrosFormacaoAdHoc] = useState<Record<string, string>>({});
  const [aPedirWebinar, setAPedirWebinar] = useState(false);
  const [erroWebinar, setErroWebinar] = useState("");
  const [seccaoAtiva, setSeccaoAtiva] = useState<Seccao>(null);

  function alternarSeccao(seccao: Seccao): void {
    setSeccaoAtiva((atual) => (atual === seccao ? null : seccao));
  }

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

  async function pedirFormacaoAdHoc(webinarId: string): Promise<void> {
    setAPedirFormacaoId(webinarId);
    setErrosFormacaoAdHoc((atual) => {
      const { [webinarId]: _removido, ...resto } = atual;
      return resto;
    });
    try {
      const resposta = await fetch("/api/consultor/backoffice/formacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, webinarId }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErrosFormacaoAdHoc((atual) => ({
          ...atual,
          [webinarId]: typeof corpo.erro === "string" ? corpo.erro : "não foi possível obter o link",
        }));
        setAPedirFormacaoId(null);
        return;
      }
      window.location.href = corpo.url;
    } catch {
      setErrosFormacaoAdHoc((atual) => ({ ...atual, [webinarId]: "falha de ligação — tenta outra vez" }));
      setAPedirFormacaoId(null);
    }
  }

  async function pedirWebinar(): Promise<void> {
    setAPedirWebinar(true);
    setErroWebinar("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/webinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroWebinar(typeof corpo.erro === "string" ? corpo.erro : "não foi possível obter o link");
        setAPedirWebinar(false);
        return;
      }
      window.location.href = corpo.url;
    } catch {
      setErroWebinar("falha de ligação — tenta outra vez");
      setAPedirWebinar(false);
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
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .vqb-caixa { max-width: 760px; margin: 0 auto; }
        .vqb-pagina h1 { color: #000000; font-size: 1.6rem; margin: 0 0 0.4rem; }
        .vqb-pagina h2 { color: #4b5320; font-size: 1.15rem; margin: 2rem 0 0.6rem; }
        .vqb-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.25rem; }
        .vqb-erro { color: #b3261e; margin-top: 0.75rem; }
        .vqb-linha { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
        .vqb-pagina label { display: block; font-weight: 600; margin: 0 0 0.35rem; }
        .vqb-pagina input {
          box-sizing: border-box;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #ffffff;
          color: #000000;
          font-size: 1rem;
          min-width: 260px;
        }
        .vqb-pagina button {
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
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
          color: #4b5320;
          border: 1px solid #4b5320;
        }
        .vqb-topo { display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap; }
        .vqb-pagina button.vqb-trocar {
          color: #6b6a63;
          font-size: 0.8rem;
          background: none;
          border: none;
          text-decoration: underline;
          padding: 0;
          font-weight: 400;
          cursor: pointer;
        }
        .vqb-linkbox {
          border: 1px solid #000000;
          background: #f7f6f3;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          word-break: break-all;
          font-family: monospace;
          color: #000000;
        }
        .vqb-cartao {
          background: #f7f6f3;
          color: #000000;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .vqb-cartao + .vqb-cartao { margin-top: 0.9rem; }
        .vqb-cartao h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
        .vqb-cartao p { margin: 0; color: #6b6a63; font-size: 0.9rem; }
        .vqb-destaque-etiqueta {
          display: block;
          color: #4b5320;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0 0 0.4rem;
        }
        .vqb-destaque-titulo {
          margin: 0 0 0.3rem;
          font-size: 1.3rem;
          text-transform: uppercase;
        }
        .vqb-destaque-data { margin: 0 0 0.75rem; color: #6b6a63; font-size: 0.95rem; }
        .vqb-destaque-texto { margin: 0 0 1.1rem; color: #6b6a63; font-size: 0.9rem; }
        .vqb-destaque-botao { display: block; width: 100%; text-align: center; padding: 0.85rem; font-size: 1.05rem; }
        .vqb-pagina a.vqb-destaque-botao {
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border-radius: 8px;
          font-weight: 700;
          text-decoration: none;
          box-sizing: border-box;
        }
        .vqb-menu { display: flex; gap: 0.6rem; flex-wrap: wrap; margin: 1.75rem 0 0; }
        .vqb-pagina button.vqb-menu-item,
        .vqb-pagina a.vqb-menu-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 1 1 140px;
          box-sizing: border-box;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          font-family: inherit;
          line-height: 1.3;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          margin: 0;
        }
        .vqb-pagina button.vqb-menu-item.vqb-menu-ativo {
          background: linear-gradient(135deg, #3a4118, #23280e);
        }
        .vqb-seccao { margin-top: 1.5rem; }
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
              É este o link que partilhas para as pessoas se inscreverem no webinar. Quem se inscrever
              por ele fica atribuído a ti.
            </p>
            <div className="vqb-linkbox">{dados.link}</div>
            <div style={{ marginTop: "0.75rem" }}>
              <button type="button" onClick={copiarLink}>
                {linkCopiado ? "Copiado!" : "Copiar link"}
              </button>
            </div>

            <h2>Página da Equipa</h2>
            <div className="vqb-cartao">
              <p className="vqb-destaque-texto" style={{ marginBottom: "1.1rem" }}>
                Informações importantes, agenda semanal, incentivos, formações gravadas e muito mais.
              </p>
              <a
                href="https://viajareviver.net/equipa"
                target="_blank"
                rel="noopener noreferrer"
                className="vqb-destaque-botao"
              >
                Entrar na página
              </a>
            </div>

            <div className="vqb-menu">
              <button
                type="button"
                className={
                  seccaoAtiva === "sessoes" ? "vqb-menu-item vqb-menu-ativo" : "vqb-menu-item"
                }
                onClick={() => alternarSeccao("sessoes")}
              >
                Próximas sessões
              </button>
              <Link href="/consultor/webinares" className="vqb-menu-item">
                Leads
              </Link>
              <button
                type="button"
                className={
                  seccaoAtiva === "eventos" ? "vqb-menu-item vqb-menu-ativo" : "vqb-menu-item"
                }
                onClick={() => alternarSeccao("eventos")}
              >
                Eventos
              </button>
            </div>

            {seccaoAtiva === "sessoes" && (() => {
              type Sessao =
                | { tipo: "formacao-recorrente"; titulo: string; sessaoExternaEm: string }
                | { tipo: "formacao-adhoc"; id: string; titulo: string; sessaoExternaEm: string }
                | { tipo: "webinar-publico"; titulo: string; sessaoExternaEm: string };

              const sessoes: Sessao[] = [
                ...(dados.ehConsultorEquipa && dados.formacao
                  ? [{ tipo: "formacao-recorrente" as const, ...dados.formacao }]
                  : []),
                ...(dados.ehConsultorEquipa
                  ? dados.formacoesEquipa.map((f) => ({ tipo: "formacao-adhoc" as const, ...f }))
                  : []),
                ...(dados.proximoWebinar
                  ? [{ tipo: "webinar-publico" as const, ...dados.proximoWebinar }]
                  : []),
              ].sort(
                (a, b) => new Date(a.sessaoExternaEm).getTime() - new Date(b.sessaoExternaEm).getTime(),
              );

              return (
                <div className="vqb-seccao">
                  {sessoes.length === 0 && (
                    <p className="vqb-mudo">Sem sessões agendadas de momento.</p>
                  )}

                  {sessoes.map((s) => {
                    if (s.tipo === "webinar-publico") {
                      return (
                        <div className="vqb-cartao" key="webinar-publico">
                          <span className="vqb-destaque-etiqueta">Próximo webinar</span>
                          <h3 className="vqb-destaque-titulo">{s.titulo}</h3>
                          <p className="vqb-destaque-data">{formatarData(s.sessaoExternaEm)}</p>
                          <p className="vqb-destaque-texto">
                            Entra diretamente no Zoom — ficas automaticamente inscrito.
                          </p>
                          <button
                            type="button"
                            className="vqb-destaque-botao"
                            onClick={pedirWebinar}
                            disabled={aPedirWebinar}
                          >
                            {aPedirWebinar ? "A preparar..." : "Entrar no webinar"}
                          </button>
                          {erroWebinar && (
                            <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>{erroWebinar}</p>
                          )}
                        </div>
                      );
                    }

                    if (s.tipo === "formacao-recorrente") {
                      return (
                        <div className="vqb-cartao" key="formacao-recorrente">
                          <span className="vqb-destaque-etiqueta">Formação interna</span>
                          <h3 className="vqb-destaque-titulo">{s.titulo}</h3>
                          <p className="vqb-destaque-data">{formatarData(s.sessaoExternaEm)}</p>
                          <p className="vqb-destaque-texto">É só para travel partners — não é para convidados.</p>
                          <button
                            type="button"
                            className="vqb-destaque-botao"
                            onClick={pedirFormacao}
                            disabled={aPedirFormacao}
                          >
                            {aPedirFormacao ? "A preparar..." : "Entrar na formação"}
                          </button>
                          {erroFormacao && (
                            <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>{erroFormacao}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="vqb-cartao" key={s.id}>
                        <span className="vqb-destaque-etiqueta">Formação interna</span>
                        <h3 className="vqb-destaque-titulo">{s.titulo}</h3>
                        <p className="vqb-destaque-data">{formatarData(s.sessaoExternaEm)}</p>
                        <button
                          type="button"
                          className="vqb-destaque-botao"
                          onClick={() => pedirFormacaoAdHoc(s.id)}
                          disabled={aPedirFormacaoId === s.id}
                        >
                          {aPedirFormacaoId === s.id ? "A preparar..." : "Entrar na formação"}
                        </button>
                        {errosFormacaoAdHoc[s.id] && (
                          <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>
                            {errosFormacaoAdHoc[s.id]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {seccaoAtiva === "eventos" && (
              <div className="vqb-seccao">
                <h2>Teambuilding Tropa de Elite</h2>
                <EventoForm email={email} nome={dados.nome} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
