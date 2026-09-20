"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { guardarEmail, lerEmailGuardado, limparEmailGuardado } from "./armazenamento";
import { EventoForm } from "./evento-form";
import { NotificacoesPush } from "./notificacoes-push";

interface DadosIdentificacao {
  nome: string | null;
  link: string;
  ehConsultorEquipa: boolean;
  formacao: { titulo: string; sessaoExternaEm: string } | null;
  inscritoFormacao: boolean;
  proximoWebinar: { titulo: string; sessaoExternaEm: string } | null;
  inscritoProximoWebinar: boolean;
  formacoesEquipa: { id: string; titulo: string; sessaoExternaEm: string; inscrito: boolean }[];
  precisaResponderTeambuilding: boolean;
  precisaResponderTrofeus: boolean;
  inscricoesEventoAbertas: boolean;
  formacoesExternas: { id: string; titulo: string; sessaoExternaEm: string; link: string }[];
  welcomeAboard: { sessao1Concluida: boolean; sessao2Concluida: boolean } | null;
  proximaSessaoWelcomeAboard: { id: string; sessaoExternaEm: string } | null;
  inscritoWelcomeAboard: boolean;
  equipaWelcomeAboard: {
    nome: string;
    email: string;
    dataRegisto: string | null;
    sessao1Concluida: boolean;
    sessao2Concluida: boolean;
  }[];
}

const LINK_WELCOME_ABOARD = "https://calendly.com/intravel/reuniao-welcome-aboard-1";

type Estado = "a-carregar" | "por-identificar" | "pronto" | "erro";
type Seccao = "sessoes" | "eventos" | "equipa-nova" | null;

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    dateStyle: "medium",
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
  const [formacaoInscrita, setFormacaoInscrita] = useState(false);
  const [formacaoAcabadaDeInscrever, setFormacaoAcabadaDeInscrever] = useState(false);
  const [aPedirFormacaoId, setAPedirFormacaoId] = useState<string | null>(null);
  const [errosFormacaoAdHoc, setErrosFormacaoAdHoc] = useState<Record<string, string>>({});
  const [formacoesAdHocInscritas, setFormacoesAdHocInscritas] = useState<Record<string, boolean>>({});
  const [formacoesAdHocAcabadasDeInscrever, setFormacoesAdHocAcabadasDeInscrever] = useState<
    Record<string, boolean>
  >({});
  const [aPedirWebinar, setAPedirWebinar] = useState(false);
  const [erroWebinar, setErroWebinar] = useState("");
  const [webinarInscrito, setWebinarInscrito] = useState(false);
  const [webinarAcabadoDeInscrever, setWebinarAcabadoDeInscrever] = useState(false);
  const [seccaoAtiva, setSeccaoAtiva] = useState<Seccao>(null);
  const [aMarcarWelcomeAboard, setAMarcarWelcomeAboard] = useState<1 | 2 | null>(null);
  // O Welcome Aboard "novo" (presença real, sem checkboxes) só aparece
  // aqui — para toda a gente continua exatamente como estava, até ser
  // publicado (ver NOVO_SISTEMA_SO_DEMO em src/lib/welcome-aboard.ts).
  const ehContaDemonstracao = email === EMAIL_PAINEL_DEMONSTRACAO;

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
      setWebinarInscrito(corpo.inscritoProximoWebinar === true);
      setFormacaoInscrita(corpo.inscritoFormacao === true);
      const formacoesEquipa = Array.isArray(corpo.formacoesEquipa) ? corpo.formacoesEquipa : [];
      const inscricoesIniciais: Record<string, boolean> = Object.fromEntries(
        formacoesEquipa.map((f: { id: string; inscrito: boolean }) => [f.id, f.inscrito === true]),
      );
      // A sessão do Welcome Aboard usa o mesmíssimo mecanismo de
      // inscrição das formações ad-hoc (pedirFormacaoAdHoc) — junta-se ao
      // mesmo mapa em vez de duplicar estado e funções só para ela.
      if (corpo.proximaSessaoWelcomeAboard?.id) {
        inscricoesIniciais[corpo.proximaSessaoWelcomeAboard.id] = corpo.inscritoWelcomeAboard === true;
      }
      setFormacoesAdHocInscritas(inscricoesIniciais);
      setEstado("pronto");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("por-identificar");
    }
  }

  /** Atualiza só localmente — evita o piscar de "a entrar..." que identificar() causaria por uma checkbox. */
  async function marcarSessaoWelcomeAboard(sessao: 1 | 2, concluida: boolean): Promise<void> {
    if (!dados?.welcomeAboard) return;
    setAMarcarWelcomeAboard(sessao);
    try {
      const resposta = await fetch("/api/consultor/backoffice/welcome-aboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessao, concluida }),
      });
      if (resposta.ok) {
        setDados((atual) =>
          atual && atual.welcomeAboard
            ? {
                ...atual,
                welcomeAboard: {
                  sessao1Concluida: sessao === 1 ? concluida : atual.welcomeAboard.sessao1Concluida,
                  sessao2Concluida: sessao === 2 ? concluida : atual.welcomeAboard.sessao2Concluida,
                },
              }
            : atual,
        );
      }
    } finally {
      setAMarcarWelcomeAboard(null);
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

  /** Mesmos dois passos do webinar público: ver pedirWebinar() acima. */
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
      if (!formacaoInscrita) {
        setFormacaoInscrita(true);
        setFormacaoAcabadaDeInscrever(true);
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
    const jaInscrita = formacoesAdHocInscritas[webinarId] === true;
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
      if (!jaInscrita) {
        setFormacoesAdHocInscritas((atual) => ({ ...atual, [webinarId]: true }));
        setFormacoesAdHocAcabadasDeInscrever((atual) => ({ ...atual, [webinarId]: true }));
        setAPedirFormacaoId(null);
        return;
      }
      window.location.href = corpo.url;
    } catch {
      setErrosFormacaoAdHoc((atual) => ({ ...atual, [webinarId]: "falha de ligação — tenta outra vez" }));
      setAPedirFormacaoId(null);
    }
  }

  /**
   * Dois passos, de propósito: a primeira vez só inscreve (o backend já
   * envia sempre o email de confirmação com o link) e fica com o botão a
   * mudar para "Entrar no webinar" — não entra logo. Assim o consultor
   * fica com o link garantido no email, mesmo que só volte a clicar
   * "Entrar" depois de a sessão já ter começado (o pedido de um link novo
   * nessa altura falharia, mas reentrar com o link já obtido não).
   */
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
      if (!webinarInscrito) {
        setWebinarInscrito(true);
        setWebinarAcabadoDeInscrever(true);
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
        .vqb-caixa { max-width: 1100px; margin: 0 auto; }
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
        .vqb-cartao-icligo { background: #fff2ee; border-color: #f0603f; }
        .vqb-destaque-etiqueta-icligo { color: #e0532f; display: flex; align-items: center; gap: 0.4rem; }
        .vqb-icligo-badge { display: inline-flex; width: 1.1rem; height: 1.1rem; }
        .vqb-destaque-data-icligo { margin: 0 0 1.1rem; color: #6b6a63; font-size: 0.95rem; }
        .vqb-pagina a.vqb-destaque-botao,
        .vqb-pagina button.vqb-destaque-botao {
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border-radius: 8px;
          font-weight: 700;
          text-decoration: none;
          box-sizing: border-box;
          font-family: inherit;
          cursor: pointer;
        }
        .vqb-pagina button.vqb-destaque-botao:disabled { opacity: 0.6; cursor: default; }
        .vqb-pagina a.vqb-destaque-botao-icligo {
          background: linear-gradient(135deg, #f5895f, #f0603f);
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
        .vqb-sessoes-grade {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .vqb-sessoes-grade .vqb-cartao { margin: 0; height: 100%; display: flex; flex-direction: column; }
        .vqb-sessoes-grade .vqb-cartao + .vqb-cartao { margin-top: 0; }
        .vqb-sessoes-grade .vqb-destaque-botao { margin-top: auto; }
        .vqb-avisos {
          margin: 2rem 0;
          padding: 1.75rem 0;
          border-top: 2px solid #eae7de;
          border-bottom: 2px solid #eae7de;
        }
        .vqb-avisos h2 { margin: 0 0 1rem; text-align: center; }
        .vqb-aviso-destaque {
          max-width: 420px;
          margin: 0 auto;
          background: #fbfaf6;
          border: 2px solid #4b5320;
          border-radius: 14px;
          padding: 1.5rem 1.5rem 1.75rem;
          box-shadow: 0 4px 18px rgba(75, 83, 32, 0.18);
        }
        .vqb-tabela-wrap { border: 1px solid #000000; border-radius: 10px; overflow-x: auto; }
        .vqb-tabela { width: 100%; min-width: 460px; border-collapse: collapse; background: #f7f6f3; }
        .vqb-tabela th, .vqb-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .vqb-tabela th {
          color: #6b6a63;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .vqb-tabela tr:last-child td { border-bottom: none; }
        .vqb-wa-linha { margin: 0 0 0.55rem; color: #6b6a63; font-size: 0.9rem; }
        .vqb-wa-linha strong { color: #000000; }
        .vqb-wa-progresso { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .vqb-wa-progresso span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .vqb-wa-feito { background: #e4f3e4; color: #0ca30c; }
        .vqb-wa-porfazer { background: #f0f0e8; color: #6b6a63; }
        .vqb-pagina div.vqb-check-sessao {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.9rem;
          color: #000000;
          cursor: pointer;
          user-select: none;
        }
        .vqb-check-sessao.vqb-check-desativada { cursor: default; opacity: 0.5; }
        .vqb-check-sessao + .vqb-check-sessao { margin-top: 0.5rem; }
        /*
         * O min-width de 260px e o padding da regra ".vqb-pagina input"
         * (feitos para o campo de email) também pegavam nesta checkbox — e
         * como min-width ganha sempre ao width, ela ficava com 260px de
         * largura, com o desenho nativo ao centro dessa caixa, no meio do
         * texto. Daí este reset.
         */
        .vqb-check-sessao input[type="checkbox"] {
          flex: none;
          min-width: 0;
          width: 1.15rem;
          height: 1.15rem;
          margin: 0;
          padding: 0;
          pointer-events: none;
          accent-color: #4b5320;
        }
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

            {
              // A secção fica sempre aberta (deixou de depender só dos
              // outros três avisos) porque o cartão de notificações tem
              // sempre algo para mostrar a quem ainda não o ativou — ele
              // próprio decide voltar null quando já não há nada a pedir.
            }
            <div className="vqb-avisos">
              <h2>Avisos</h2>
              <NotificacoesPush email={email} />
              {(dados.precisaResponderTeambuilding || dados.precisaResponderTrofeus || dados.welcomeAboard) && (
                <>
                  {dados.precisaResponderTeambuilding && (
                  <div className="vqb-aviso-destaque">
                    <span className="vqb-destaque-etiqueta">Teambuilding — 14 de novembro</span>
                    <p className="vqb-destaque-texto" style={{ marginBottom: "1.1rem" }}>
                      Inscreveste-te no Teambuilding — ajuda-nos a preparar o dia: responde a 4 perguntas
                      rápidas sobre o que esperas e que formações gostavas de ver.
                    </p>
                    <Link href="/consultor/teambuilding" className="vqb-destaque-botao">
                      Responder ao formulário
                    </Link>
                  </div>
                )}
                {dados.precisaResponderTrofeus && (
                  <div
                    className="vqb-aviso-destaque"
                    style={dados.precisaResponderTeambuilding ? { marginTop: "1rem" } : undefined}
                  >
                    <span className="vqb-destaque-etiqueta">Troféus — 14 de novembro</span>
                    <p className="vqb-destaque-texto" style={{ marginBottom: "1.1rem" }}>
                      Vamos entregar os troféus no Teambuilding. Diz-nos quais queres receber e quais já
                      tens em casa, para mandarmos fazer o número certo — ninguém fica sem o seu nem recebe
                      um repetido.
                    </p>
                    <Link href="/consultor/trofeus" className="vqb-destaque-botao">
                      Escolher os meus troféus
                    </Link>
                  </div>
                )}
                {dados.welcomeAboard && ehContaDemonstracao && (
                  <div
                    className="vqb-aviso-destaque"
                    style={
                      dados.precisaResponderTeambuilding || dados.precisaResponderTrofeus
                        ? { marginTop: "1rem" }
                        : undefined
                    }
                  >
                    <span className="vqb-destaque-etiqueta">Welcome Aboard (novo — presença real)</span>
                    <p className="vqb-wa-linha">
                      Duas sessões de acolhimento para quem entrou no negócio há pouco tempo:
                    </p>
                    <p className="vqb-wa-linha">
                      <strong>1ª sessão</strong> — os primeiros passos como consultor, com truques e dicas
                      para começares bem.
                    </p>
                    <p className="vqb-wa-linha">
                      <strong>2ª sessão</strong> — o potencial do negócio: até onde isto pode crescer.
                    </p>
                    <p className="vqb-wa-linha">
                      Acontecem às quartas-feiras. Só tens de te inscrever e aparecer.
                    </p>
                    <div className="vqb-wa-progresso">
                      <span className={dados.welcomeAboard.sessao1Concluida ? "vqb-wa-feito" : "vqb-wa-porfazer"}>
                        {dados.welcomeAboard.sessao1Concluida ? "✓" : "○"} 1ª sessão
                      </span>
                      <span className={dados.welcomeAboard.sessao2Concluida ? "vqb-wa-feito" : "vqb-wa-porfazer"}>
                        {dados.welcomeAboard.sessao2Concluida ? "✓" : "○"} 2ª sessão
                      </span>
                    </div>
                    <p className="vqb-destaque-texto" style={{ marginTop: "0.6rem", marginBottom: "1.1rem" }}>
                      {dados.welcomeAboard.sessao1Concluida
                        ? "A tua presença na 1ª já ficou confirmada. Falta a 2ª."
                        : "Confirmamos a tua presença pela sessão de Zoom — não precisas de marcar nada aqui."}
                    </p>
                    {dados.proximaSessaoWelcomeAboard ? (
                      (() => {
                        const idSessao = dados.proximaSessaoWelcomeAboard.id;
                        const inscrita = formacoesAdHocInscritas[idSessao] === true;
                        const aInscrever = aPedirFormacaoId === idSessao;
                        return (
                          <>
                            <button
                              type="button"
                              className="vqb-destaque-botao"
                              disabled={aInscrever}
                              onClick={() => pedirFormacaoAdHoc(idSessao)}
                            >
                              {aInscrever
                                ? "Um momento…"
                                : inscrita
                                  ? "Entrar na próxima sessão"
                                  : "Inscrever-me na próxima sessão"}
                            </button>
                            <p className="vqb-destaque-data" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                              {formatarData(dados.proximaSessaoWelcomeAboard.sessaoExternaEm)}
                            </p>
                            {formacoesAdHocAcabadasDeInscrever[idSessao] && (
                              <p className="vqb-sucesso" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                                ✅ Inscrição confirmada — vais receber o link no teu email.
                              </p>
                            )}
                            {errosFormacaoAdHoc[idSessao] && (
                              <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>
                                {errosFormacaoAdHoc[idSessao]}
                              </p>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <p className="vqb-destaque-texto">
                        Sem sessão agendada de momento — volta a olhar aqui em breve.
                      </p>
                    )}
                  </div>
                )}
                {dados.welcomeAboard && !ehContaDemonstracao && (
                  <div
                    className="vqb-aviso-destaque"
                    style={
                      dados.precisaResponderTeambuilding || dados.precisaResponderTrofeus
                        ? { marginTop: "1rem" }
                        : undefined
                    }
                  >
                    <span className="vqb-destaque-etiqueta">Welcome Aboard</span>
                    <p className="vqb-wa-linha">
                      Duas sessões de acolhimento para quem entrou no negócio há pouco tempo:
                    </p>
                    <p className="vqb-wa-linha">
                      <strong>1ª sessão</strong> — os primeiros passos como consultor, com truques e dicas
                      para começares bem.
                    </p>
                    <p className="vqb-wa-linha">
                      <strong>2ª sessão</strong> — o potencial do negócio: até onde isto pode crescer.
                    </p>
                    <p className="vqb-destaque-texto" style={{ marginBottom: "1.1rem" }}>
                      Acontecem às quartas-feiras e tens de assistir às duas. Inscreve-te numa, marca-a
                      aqui como feita, e depois inscreve-te na seguinte — só podes fazer a 2ª depois de
                      teres feito a 1ª.
                    </p>
                    <a
                      href={LINK_WELCOME_ABOARD}
                      target="_blank"
                      rel="noreferrer"
                      className="vqb-destaque-botao"
                      style={{ marginBottom: "1.1rem" }}
                    >
                      Inscrever-me numa sessão
                    </a>
                    <div
                      className="vqb-check-sessao"
                      role="checkbox"
                      aria-checked={dados.welcomeAboard.sessao1Concluida}
                      onClick={() =>
                        aMarcarWelcomeAboard !== 1 &&
                        marcarSessaoWelcomeAboard(1, !dados.welcomeAboard!.sessao1Concluida)
                      }
                    >
                      <input type="checkbox" checked={dados.welcomeAboard.sessao1Concluida} readOnly />
                      <span>Já assisti à 1ª sessão</span>
                    </div>
                    <div
                      className={
                        dados.welcomeAboard.sessao1Concluida
                          ? "vqb-check-sessao"
                          : "vqb-check-sessao vqb-check-desativada"
                      }
                      role="checkbox"
                      aria-checked={dados.welcomeAboard.sessao2Concluida}
                      onClick={() =>
                        dados.welcomeAboard!.sessao1Concluida &&
                        aMarcarWelcomeAboard !== 2 &&
                        marcarSessaoWelcomeAboard(2, !dados.welcomeAboard!.sessao2Concluida)
                      }
                    >
                      <input type="checkbox" checked={dados.welcomeAboard.sessao2Concluida} readOnly />
                      <span>Já assisti à 2ª sessão</span>
                    </div>
                  </div>
                )}
                </>
              )}
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
              {dados.equipaWelcomeAboard.length > 0 && (
                <button
                  type="button"
                  className={
                    seccaoAtiva === "equipa-nova" ? "vqb-menu-item vqb-menu-ativo" : "vqb-menu-item"
                  }
                  onClick={() => alternarSeccao("equipa-nova")}
                >
                  Welcome Aboard Equipa
                </button>
              )}
            </div>

            {seccaoAtiva === "sessoes" && (() => {
              type Sessao =
                | { tipo: "formacao-recorrente"; titulo: string; sessaoExternaEm: string }
                | { tipo: "formacao-adhoc"; id: string; titulo: string; sessaoExternaEm: string }
                | { tipo: "webinar-publico"; titulo: string; sessaoExternaEm: string }
                | { tipo: "formacao-externa"; id: string; titulo: string; sessaoExternaEm: string; link: string };

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
                ...dados.formacoesExternas.map((f) => ({ tipo: "formacao-externa" as const, ...f })),
              ].sort(
                (a, b) => new Date(a.sessaoExternaEm).getTime() - new Date(b.sessaoExternaEm).getTime(),
              );

              return (
                <div className="vqb-seccao vqb-sessoes-grade">
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
                            {webinarInscrito
                              ? "Já estás inscrito — o link também ficou no teu email."
                              : "Inscreve-te para receberes já o link por email — entra quando quiseres."}
                          </p>
                          <button
                            type="button"
                            className="vqb-destaque-botao"
                            onClick={pedirWebinar}
                            disabled={aPedirWebinar}
                          >
                            {aPedirWebinar ? "A preparar..." : webinarInscrito ? "Entrar no webinar" : "Inscrever"}
                          </button>
                          {webinarAcabadoDeInscrever && (
                            <p className="vqb-sucesso" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                              ✅ Inscrição confirmada — vais receber o link no teu email.
                            </p>
                          )}
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
                          <p className="vqb-destaque-texto">
                            {formacaoInscrita
                              ? "Já estás inscrito — o link também ficou no teu email."
                              : "É só para travel partners — não é para convidados. Inscreve-te para receberes já o link por email."}
                          </p>
                          <button
                            type="button"
                            className="vqb-destaque-botao"
                            onClick={pedirFormacao}
                            disabled={aPedirFormacao}
                          >
                            {aPedirFormacao ? "A preparar..." : formacaoInscrita ? "Entrar na formação" : "Inscrever"}
                          </button>
                          {formacaoAcabadaDeInscrever && (
                            <p className="vqb-sucesso" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                              ✅ Inscrição confirmada — vais receber o link no teu email.
                            </p>
                          )}
                          {erroFormacao && (
                            <p className="vqb-erro" style={{ marginTop: "0.75rem" }}>{erroFormacao}</p>
                          )}
                        </div>
                      );
                    }

                    if (s.tipo === "formacao-externa") {
                      return (
                        <div className="vqb-cartao vqb-cartao-icligo" key={s.id}>
                          <span className="vqb-destaque-etiqueta vqb-destaque-etiqueta-icligo">
                            <img src="/icligo-logo.png" alt="" className="vqb-icligo-badge" />
                            Formação iCliGo
                          </span>
                          <h3 className="vqb-destaque-titulo">{s.titulo}</h3>
                          <p className="vqb-destaque-data vqb-destaque-data-icligo">
                            {formatarData(s.sessaoExternaEm)}
                          </p>
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noreferrer"
                            className="vqb-destaque-botao vqb-destaque-botao-icligo"
                          >
                            Ir para a formação
                          </a>
                        </div>
                      );
                    }

                    const inscritaAdHoc = formacoesAdHocInscritas[s.id] === true;
                    return (
                      <div className="vqb-cartao" key={s.id}>
                        <span className="vqb-destaque-etiqueta">Formação interna</span>
                        <h3 className="vqb-destaque-titulo">{s.titulo}</h3>
                        <p className="vqb-destaque-data">{formatarData(s.sessaoExternaEm)}</p>
                        {inscritaAdHoc && (
                          <p className="vqb-destaque-texto">Já estás inscrito — o link também ficou no teu email.</p>
                        )}
                        <button
                          type="button"
                          className="vqb-destaque-botao"
                          onClick={() => pedirFormacaoAdHoc(s.id)}
                          disabled={aPedirFormacaoId === s.id}
                        >
                          {aPedirFormacaoId === s.id ? "A preparar..." : inscritaAdHoc ? "Entrar na formação" : "Inscrever"}
                        </button>
                        {formacoesAdHocAcabadasDeInscrever[s.id] && (
                          <p className="vqb-sucesso" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                            ✅ Inscrição confirmada — vais receber o link no teu email.
                          </p>
                        )}
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
                {dados.inscricoesEventoAbertas ? (
                  <EventoForm email={email} nome={dados.nome} />
                ) : (
                  <p className="vqb-mudo">As inscrições para este evento já estão encerradas.</p>
                )}
              </div>
            )}

            {seccaoAtiva === "equipa-nova" && (
              <div className="vqb-seccao">
                <h2>Welcome Aboard da tua equipa</h2>
                <p className="vqb-mudo">
                  Quem entrou na tua equipa há menos de 3 meses e as duas sessões obrigatórias de
                  acolhimento. Quem ainda tiver sessões por fazer precisa de um empurrão teu.
                </p>
                <div className="vqb-tabela-wrap">
                  <table className="vqb-tabela">
                    <thead>
                      <tr>
                        <th>Consultor</th>
                        <th>Entrou em</th>
                        <th>1ª sessão</th>
                        <th>2ª sessão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.equipaWelcomeAboard.map((m) => (
                        <tr key={m.email}>
                          <td>
                            <div>{m.nome}</div>
                            <div className="vqb-mudo" style={{ margin: 0, fontSize: "0.8rem" }}>
                              {m.email}
                            </div>
                          </td>
                          <td>{m.dataRegisto ? formatarDataCurta(m.dataRegisto) : "—"}</td>
                          <td>{m.sessao1Concluida ? "✅" : "—"}</td>
                          <td>{m.sessao2Concluida ? "✅" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
