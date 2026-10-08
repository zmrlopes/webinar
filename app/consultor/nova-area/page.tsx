"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LINK_CURSO_TRAVEL_PARTNER,
  LINK_GRUPO_WELCOME_ABOARD,
  podeVerNovaArea,
  type DadosNovaArea,
} from "@/lib/consultor-nova-area";
import { AlternarArea } from "../alternar-area";
import { lerEmailGuardado, limparEmailGuardado } from "../armazenamento";
import estilos from "./nova-area.module.css";
import { ProximoWebinar, TarefasIniciaisEquipa } from "./organizacao";
import { LeadsNovaArea } from "./leads";
import { ProximasFormacoes, FormacoesGravadas, DocumentosNovaArea } from "./formacao";
import { CalendarioConsultor } from "./calendario";
import { EventosPresenciais } from "./eventos";
import { InicioNovaArea } from "./inicio";
import { TestemunhosNovaArea } from "./testemunhos";
import { limparPrimeirosPassos } from "@/lib/primeiros-passos";

const CHAVE_PROGRESSO = "consultor-nova-area:primeiros-passos:v1";
const TITULOS = [
  "Grupo Welcome Aboard",
  "Primeira videochamada",
  "Be a Travel Partner",
  "Sessões Welcome Aboard",
  "Os teus objetivos",
];

function Seta() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GrupoMenu({ titulo, ativo, children }: { titulo: string; ativo: boolean; children: ReactNode }) {
  return <details className={estilos.grupoMenu}>
    <summary className={estilos.tituloMenu} data-ativo={ativo}>
      {titulo}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </summary>
    <div className={estilos.itensMenu}>{children}</div>
  </details>;
}

function Passo({ numero, titulo, concluido, alternar, children, aGuardar }: {
  numero: number; titulo: string; concluido: boolean; alternar: () => void; children: ReactNode; aGuardar: boolean;
}) {
  return (
    <article id={`passo-${numero}`} className={`${estilos.passo} ${concluido ? estilos.passoFeito : ""}`} aria-labelledby={`titulo-passo-${numero}`}>
      <div className={estilos.passoCabecalho}>
        <span className={estilos.numero} aria-label={`Passo ${numero}`}>{concluido ? "✓" : numero}</span>
        <h2 id={`titulo-passo-${numero}`}>{titulo}</h2>
      </div>
      <div className={estilos.passoConteudo}>
        {children}
        <div className={estilos.passoRodape}>
          <button type="button" className={estilos.concluir} aria-pressed={concluido} disabled={aGuardar} onClick={alternar}>
            <span className={estilos.checkbox} aria-hidden="true">{concluido && "✓"}</span>
            {concluido ? "Passo concluído" : "Já fiz este passo"}
          </button>
          {concluido && <span className={estilos.desfazer}>Clica para desmarcar</span>}
        </div>
      </div>
    </article>
  );
}

function mensagemWhatsApp(nome: string, segunda = false): string {
  const mensagem = segunda
    ? `Olá! Sou ${nome}. Já avancei nos primeiros passos e gostava de marcar a nossa segunda videochamada para definirmos os meus objetivos. Quando tens disponibilidade?`
    : `Olá! Sou ${nome}. Gostava de marcar a nossa primeira videochamada para me orientares no arranque como consultor. Quando tens disponibilidade?`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
}

export default function NovaAreaConsultor() {
  const [estado, setEstado] = useState<"a-carregar" | "sem-acesso" | "erro" | "pronto">("a-carregar");
  const [email, setEmail] = useState("");
  const [dados, setDados] = useState<DadosNovaArea | null>(null);
  const [feitos, setFeitos] = useState<number[]>([]);
  const [erro, setErro] = useState("");
  const [aInscrever, setAInscrever] = useState(false);
  const [erroSessao, setErroSessao] = useState("");
  const [inscrito, setInscrito] = useState(false);
  const [seccao, setSeccao] = useState<"inicio" | "comeca-aqui" | "calendario" | "leads" | "tarefas-equipa" | "proximo-webinar" | "proximas-formacoes" | "formacoes-gravadas" | "testemunhos" | "documentos" | "eventos-presenciais">("inicio");
  const [aGuardarPasso, setAGuardarPasso] = useState<number | null>(null);
  const [erroProgresso, setErroProgresso] = useState("");
  const [acabadoAgora, setAcabadoAgora] = useState(false);
  const [voltarAoInicio, setVoltarAoInicio] = useState(false);
  const conteudo = useRef<HTMLElement>(null);
  const menu = useRef<HTMLElement>(null);
  const [pedidoNavegacao, setPedidoNavegacao] = useState(0);
  const [pedidoAvisos, setPedidoAvisos] = useState(0);
  const [mostrarVoltarAoMenu, setMostrarVoltarAoMenu] = useState(false);

  useEffect(() => {
    if (!pedidoAvisos) return;
    const avisos = document.getElementById("questionarios-inicio");
    avisos?.focus({ preventScroll: true });
    avisos?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [pedidoAvisos]);

  useEffect(() => {
    if (!voltarAoInicio) return;
    conteudo.current?.focus({ preventScroll: true });
    conteudo.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    setVoltarAoInicio(false);
  }, [voltarAoInicio]);

  useEffect(() => {
    if (!pedidoNavegacao || !window.matchMedia("(max-width: 760px)").matches) return;
    conteudo.current?.focus({ preventScroll: true });
    conteudo.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [pedidoNavegacao]);

  useEffect(() => {
    if (estado !== "pronto" || !menu.current) return;
    const observador = new IntersectionObserver(([entrada]) => {
      setMostrarVoltarAoMenu(!!entrada && !entrada.isIntersecting && entrada.boundingClientRect.bottom < 0);
    });
    observador.observe(menu.current);
    return () => observador.disconnect();
  }, [estado]);

  function abrirSeccao(proxima: typeof seccao) {
    setSeccao(proxima);
    // O contador também permite voltar ao conteúdo ao clicar na secção já ativa.
    setPedidoNavegacao(pedido => pedido + 1);
  }

  function voltarAoMenu() {
    const ativo = menu.current?.querySelector<HTMLButtonElement>("button[aria-current='page']");
    const grupo = ativo?.closest("details");
    const destino = grupo && !grupo.open ? grupo.querySelector<HTMLElement>("summary") : ativo;
    destino?.focus({ preventScroll: true });
    menu.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  useEffect(() => {
    const conta = lerEmailGuardado()?.trim().toLowerCase() ?? "";
    if (!podeVerNovaArea(conta)) { setEstado("sem-acesso"); return; }
    const controller = new AbortController();
    setEmail(conta);
    let progressoLocal: number[] = [];
    try {
      const guardados: unknown = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO) ?? "[]");
      progressoLocal = limparPrimeirosPassos(guardados);
    } catch { /* O progresso continua a funcionar se o armazenamento estiver indisponível. */ }
    async function carregar() {
      try {
        const resposta = await fetch("/api/consultor/nova-area", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: conta }), signal: controller.signal,
        });
        const corpo = await resposta.json();
        if (controller.signal.aborted) return;
        if (resposta.status === 403) { setEstado("sem-acesso"); return; }
        if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível carregar a nova área.");
        let feitosGuardados = limparPrimeirosPassos(corpo.primeirosPassos?.feitos);
        if (!corpo.primeirosPassos?.guardado && progressoLocal.length) {
          const importacao = await fetch("/api/consultor/nova-area/progresso", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: conta, feitos: progressoLocal }), signal: controller.signal,
          });
          const progresso = await importacao.json();
          if (!importacao.ok) throw new Error(progresso.erro ?? "Não foi possível recuperar os teus primeiros passos.");
          feitosGuardados = limparPrimeirosPassos(progresso.feitos);
        }
        if (controller.signal.aborted) return;
        setFeitos(feitosGuardados);
        setDados(corpo);
        setInscrito(corpo.inscritoWelcomeAboard === true);
        setEstado("pronto");
      } catch (falha) {
        if (controller.signal.aborted) return;
        setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
        setEstado("erro");
      }
    }
    void carregar();
    return () => controller.abort();
  }, []);

  async function alternarPasso(numero: number) {
    if (aGuardarPasso !== null) return;
    setAGuardarPasso(numero);
    setErroProgresso("");
    try {
      const resposta = await fetch("/api/consultor/nova-area/progresso", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passo: numero, concluido: !feitos.includes(numero) }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível guardar este passo.");
      const atualizados = limparPrimeirosPassos(corpo.feitos);
      setFeitos(atualizados);
      try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(atualizados)); } catch { /* A conta já tem o progresso guardado. */ }
      if (atualizados.length === 5) {
        setAcabadoAgora(true);
        setSeccao("inicio");
        setVoltarAoInicio(true);
      }
    } catch (falha) {
      setErroProgresso(falha instanceof Error ? falha.message : "Não foi possível guardar este passo. Tenta novamente.");
    } finally { setAGuardarPasso(null); }
  }

  async function entrarWelcomeAboard() {
    if (!dados?.proximaSessao || aInscrever) return;
    const janela = window.open("about:blank", "_blank");
    if (janela) janela.opener = null;
    setAInscrever(true);
    setErroSessao("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/formacao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, webinarId: dados.proximaSessao.id }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok || typeof corpo.url !== "string") {
        throw new Error(corpo.erro ?? "Não foi possível fazer a inscrição. Tenta novamente.");
      }
      setInscrito(true);
      if (janela) janela.location.href = corpo.url;
      else window.location.href = corpo.url;
    } catch (falha) {
      janela?.close();
      setErroSessao(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAInscrever(false); }
  }

  if (estado !== "pronto" || !dados) {
    return (
      <div className={estilos.pagina}>
        <div className={estilos.estado} aria-live="polite">
          <span className={estilos.etiqueta}>A MINHA ÁREA</span>
          <h1>{estado === "a-carregar" ? "A preparar a tua área…" : estado === "sem-acesso" ? "Esta área está em preparação" : "Não conseguimos carregar a página"}</h1>
          <p>{estado === "erro" ? erro : estado === "sem-acesso" ? "Continua a consultar a tua área de consultor habitual." : "Os teus primeiros passos estão a chegar."}</p>
          {estado !== "a-carregar" && <Link className={estilos.botao} href="/consultor">Voltar à área atual <Seta /></Link>}
          {estado === "erro" && <button className={estilos.botaoSecundario} onClick={() => window.location.reload()}>Tentar novamente</button>}
        </div>
      </div>
    );
  }

  const totalFeitos = feitos.length;
  const primeiroNome = dados.nome.split(" ")[0];
  const questionariosPendentes = dados.erroAvisos ? 0 : (dados.avisos?.length ?? 0);
  const avisoQuestionarios = `${questionariosPendentes} ${questionariosPendentes === 1 ? "questionário" : "questionários"} por responder`;
  return (
    <div className={estilos.pagina}>
      <div className={estilos.contentor}>
        <AlternarArea ativa="nova" />
        <header className={estilos.topo}>
          <div className={estilos.marca}>
            <span className={estilos.simbolo} aria-hidden="true"><img src="/icons/icon-192.png" alt="" width="44" height="44" /></span>
            <div><span className={estilos.etiqueta}>TROPA DE ELITE</span><p>A minha área</p></div>
          </div>
          <div className={estilos.conta}>
            <div className={estilos.identidadeConta}>
              <div><strong>Olá, {primeiroNome}</strong><span className={estilos.emailConta}>{email}</span></div>
              {questionariosPendentes > 0 && <button type="button" className={estilos.avisosConta} aria-label={`${avisoQuestionarios}. Ver avisos.`} title={avisoQuestionarios} aria-controls="questionarios-inicio" onClick={() => { setSeccao("inicio"); setPedidoAvisos(pedido => pedido + 1); }}>
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4M12 2V1" /></svg>
                <span className={estilos.numeroAvisos} aria-hidden="true">{questionariosPendentes}</span>
              </button>}
            </div>
            <button type="button" className={estilos.sair} onClick={() => { limparEmailGuardado(); setDados(null); setEstado("sem-acesso"); }}>Sair <Seta /></button>
          </div>
        </header>

        <div className={estilos.layout}>
          <aside className={estilos.lateral}>
            <nav id="menu-nova-area" ref={menu} aria-label="Secções da nova área">
              <GrupoMenu titulo="A minha área" ativo={seccao === "inicio"}>
                <button type="button" className={seccao === "inicio" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("inicio")} aria-current={seccao === "inicio" ? "page" : undefined} aria-controls="conteudo-nova-area">Início <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3V10Z" stroke="currentColor" strokeWidth="1.6" /><path d="M9 20v-7h6v7" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              </GrupoMenu>
              {totalFeitos < 5 && <GrupoMenu titulo="Primeiros passos" ativo={seccao === "comeca-aqui"}>
                <button type="button" className={seccao === "comeca-aqui" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("comeca-aqui")} aria-current={seccao === "comeca-aqui" ? "page" : undefined} aria-controls="conteudo-nova-area">Começa aqui <span>{5 - totalFeitos}</span></button>
                {seccao === "comeca-aqui" && <div className={estilos.resumo}>
                  <span className={estilos.etiqueta}>O TEU ARRANQUE</span>
                  <p>Um passo de cada vez.</p>
                  <div className={estilos.barra} role="progressbar" aria-label="Primeiros passos concluídos" aria-valuemin={0} aria-valuemax={5} aria-valuenow={totalFeitos}><span style={{ width: `${totalFeitos * 20}%` }} /></div>
                  <span className={estilos.progressoTexto}>{totalFeitos} de 5 passos feitos</span>
                  <ol className={estilos.listaPassos}>
                    {TITULOS.map((titulo, i) => <li key={titulo}><a href={`#passo-${i + 1}`}><span className={feitos.includes(i + 1) ? estilos.miniFeito : estilos.miniNumero}>{feitos.includes(i + 1) ? "✓" : i + 1}</span>{titulo}</a></li>)}
                  </ol>
                </div>}
              </GrupoMenu>}
              <div className={estilos.grupoMenu}>
                <button type="button" className={seccao === "calendario" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("calendario")} aria-current={seccao === "calendario" ? "page" : undefined} aria-controls="conteudo-nova-area">Calendário <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M7 3v4m10-4v4M3 11h18" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              </div>
              <GrupoMenu titulo="A minha organização" ativo={seccao === "leads" || seccao === "tarefas-equipa" || seccao === "proximo-webinar"}>
                <button type="button" className={seccao === "leads" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("leads")} aria-current={seccao === "leads" ? "page" : undefined} aria-controls="conteudo-nova-area">Leads</button>
                <button type="button" className={seccao === "tarefas-equipa" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("tarefas-equipa")} aria-current={seccao === "tarefas-equipa" ? "page" : undefined} aria-controls="conteudo-nova-area">Tarefas iniciais da equipa</button>
                <button type="button" className={seccao === "proximo-webinar" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("proximo-webinar")} aria-current={seccao === "proximo-webinar" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximo webinar</button>
              </GrupoMenu>
              <GrupoMenu titulo="Formação" ativo={seccao === "proximas-formacoes" || seccao === "formacoes-gravadas" || seccao === "testemunhos" || seccao === "documentos"}>
                <button type="button" className={seccao === "proximas-formacoes" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("proximas-formacoes")} aria-current={seccao === "proximas-formacoes" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximas formações</button>
                <button type="button" className={seccao === "formacoes-gravadas" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("formacoes-gravadas")} aria-current={seccao === "formacoes-gravadas" ? "page" : undefined} aria-controls="conteudo-nova-area">Formações gravadas</button>
                <button type="button" className={seccao === "testemunhos" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("testemunhos")} aria-current={seccao === "testemunhos" ? "page" : undefined} aria-controls="conteudo-nova-area">Testemunhos</button>
                <button type="button" className={seccao === "documentos" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("documentos")} aria-current={seccao === "documentos" ? "page" : undefined} aria-controls="conteudo-nova-area">Documentos</button>
              </GrupoMenu>
              <GrupoMenu titulo="Eventos" ativo={seccao === "eventos-presenciais"}>
                <button type="button" className={seccao === "eventos-presenciais" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("eventos-presenciais")} aria-current={seccao === "eventos-presenciais" ? "page" : undefined} aria-controls="conteudo-nova-area">Eventos presenciais</button>
              </GrupoMenu>
            </nav>
            <Link className={estilos.voltar} href="/consultor">Consultar a área atual <Seta /></Link>
          </aside>

          <main id="conteudo-nova-area" ref={conteudo} tabIndex={-1} aria-label="Conteúdo da secção" className={estilos.conteudo}>
            {seccao === "inicio" && <InicioNovaArea avisos={dados.avisos ?? []} erroAvisos={dados.erroAvisos ?? false} feitos={totalFeitos} aoComecar={() => abrirSeccao("comeca-aqui")} acabadoAgora={acabadoAgora} />}
            {seccao === "comeca-aqui" && <section id="comeca-aqui" aria-label="Começa aqui">
            <div className={estilos.intro}>
              <span className={estilos.etiqueta}>BEM-VINDO À EQUIPA</span>
              <h1>Começa aqui<span>.</span></h1>
              <p>Os teus primeiros passos, por esta ordem. <strong>{totalFeitos} de 5 feitos.</strong></p>
              {aGuardarPasso !== null && <p role="status">A guardar o passo {aGuardarPasso}…</p>}
              {erroProgresso && <p role="alert" className={estilos.erroOrganizacao}>{erroProgresso}</p>}
            </div>
            <div className={estilos.passos}>
              <Passo numero={1} titulo="Entra no grupo de WhatsApp Welcome Aboard" concluido={feitos.includes(1)} alternar={() => void alternarPasso(1)} aGuardar={aGuardarPasso !== null}>
                <p>O teu ponto de encontro para começares acompanhado. Junta-te ao grupo de acolhimento da equipa.</p>
                <div className={estilos.grupo}>
                  <span className={estilos.grupoIcone} aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M20 11.5a8 8 0 0 1-12 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" /><path d="M8.5 8.5c.8 3.2 2.5 4.8 5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
                  <div><h3>Welcome Aboard</h3><p>Primeiros passos, dúvidas e boas-vindas à comunidade.</p></div>
                  {LINK_GRUPO_WELCOME_ABOARD
                    ? <a className={estilos.botao} href={LINK_GRUPO_WELCOME_ABOARD} target="_blank" rel="noopener noreferrer">Entrar no grupo <Seta /></a>
                    : <div className={estilos.convitePendente}><button className={estilos.botao} type="button" disabled>Entrar no grupo <Seta /></button><small>Convite disponível em breve</small></div>}
                </div>
              </Passo>

              <Passo numero={2} titulo="Marca a 1.ª videochamada com o teu upline" concluido={feitos.includes(2)} alternar={() => void alternarPasso(2)} aGuardar={aGuardarPasso !== null}>
                <p>Uma conversa curta, no máximo 30 minutos, para se conhecerem e para te orientar no arranque.</p>
                {dados.upline?.nome && <p className={estilos.upline}>O teu upline é <strong>{dados.upline.nome}.</strong></p>}
                <a className={estilos.botao} href={mensagemWhatsApp(dados.nome)} target="_blank" rel="noopener noreferrer">Preparar mensagem no WhatsApp <Seta /></a>
                <p className={estilos.nota}>Escolhe o contacto do teu upline e combina a chamada.</p>
              </Passo>

              <Passo numero={3} titulo="Faz o curso Be a Travel Partner" concluido={feitos.includes(3)} alternar={() => void alternarPasso(3)} aGuardar={aGuardarPasso !== null}>
                <p>É <strong>obrigatório</strong> e está na academia da iCliGo. Faz-se lá; aqui fica o caminho para chegares ao curso.</p>
                <a className={estilos.botao} href={LINK_CURSO_TRAVEL_PARTNER} target="_blank" rel="noopener noreferrer">Ir para o curso <Seta /></a>
                <p className={estilos.nota}>Entra com a tua conta da iCliGo Academy.</p>
              </Passo>

              <Passo numero={4} titulo="Vai ao Welcome Aboard — a Sessão 1 e a Sessão 2" concluido={feitos.includes(4)} alternar={() => void alternarPasso(4)} aGuardar={aGuardarPasso !== null}>
                <p><strong>Todas as quartas-feiras, às 21:20</strong>, com os líderes. É uma sala de Zoom que se divide em duas: começas pela Sessão 1 e, na semana seguinte, vais à Sessão 2.</p>
                <div className={estilos.sessoes}>
                  <div className={estilos.sessao}><h3><span aria-hidden="true">✈️</span> Sessão 1</h3><p>Foco em começar e fazer as primeiras reservas.</p><span className={dados.welcomeAboard?.sessao1Concluida ? estilos.presencaFeita : estilos.presencaPendente}>{dados.welcomeAboard?.sessao1Concluida ? "✓ Concluída" : "Por fazer"}</span></div>
                  <div className={estilos.sessao}><h3><span aria-hidden="true">🚀</span> Sessão 2</h3><p>Foco no crescimento e em atingir o patamar de Sénior. Para quem já esteve na Sessão 1.</p><span className={dados.welcomeAboard?.sessao2Concluida ? estilos.presencaFeita : estilos.presencaPendente}>{dados.welcomeAboard?.sessao2Concluida ? "✓ Concluída" : "Depois da Sessão 1"}</span></div>
                </div>
                <p className={estilos.valores}>🧭 Acompanhamento <span>·</span> 🎯 Clareza <span>·</span> 🌍 Inspiração</p>
                {dados.proximaSessao ? <>
                  <p className={estilos.dataSessao}>Próxima: <strong>{new Date(dados.proximaSessao.comecaEm).toLocaleString("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}.</strong></p>
                  <button className={estilos.botao} type="button" disabled={aInscrever} onClick={() => void entrarWelcomeAboard()}>{aInscrever ? "A preparar o teu acesso…" : inscrito ? "Entrar na sessão" : "Inscrever-me"} <Seta /></button>
                </> : <p className={estilos.nota}>A próxima sessão será apresentada aqui assim que estiver agendada.</p>}
                {erroSessao && <p role="alert" className={estilos.erro}>{erroSessao}</p>}
              </Passo>

              <Passo numero={5} titulo="Marca a 2.ª videochamada com o teu upline, para definir objetivos" concluido={feitos.includes(5)} alternar={() => void alternarPasso(5)} aGuardar={aGuardarPasso !== null}>
                <p>Com os primeiros passos feitos, é a conversa para definirem juntos os teus objetivos. Chega a ela com o teu objetivo já pensado.</p>
                <a className={estilos.botao} href={mensagemWhatsApp(dados.nome, true)} target="_blank" rel="noopener noreferrer">Preparar mensagem no WhatsApp <Seta /></a>
                <p className={estilos.nota}>Escolhe o contacto do teu upline e combina a segunda chamada.</p>
              </Passo>
            </div>
            </section>}
            {seccao === "leads" && <LeadsNovaArea linkPartilha={dados.linkPartilha} />}
            {seccao === "calendario" && <CalendarioConsultor email={email} nome={dados.nome} />}
            {seccao === "tarefas-equipa" && <TarefasIniciaisEquipa membros={dados.equipaPrimeirosPassos} />}
            {seccao === "proximo-webinar" && <ProximoWebinar webinar={dados.proximoWebinar} email={email} aoInscrever={() => setDados(atual => atual?.proximoWebinar ? { ...atual, proximoWebinar: { ...atual.proximoWebinar, inscrito: true } } : atual)} />}
            {seccao === "proximas-formacoes" && <ProximasFormacoes formacoes={dados.proximasFormacoes} email={email} aoInscrever={id => setDados(atual => atual ? {
              ...atual, proximasFormacoes: atual.proximasFormacoes.map(f => f.id === id && f.tipo === "interna" ? { ...f, inscrito: true } : f),
            } : atual)} />}
            {seccao === "formacoes-gravadas" && <FormacoesGravadas />}
            {seccao === "testemunhos" && <TestemunhosNovaArea />}
            {seccao === "documentos" && <DocumentosNovaArea />}
            {seccao === "eventos-presenciais" && <EventosPresenciais email={email} nome={dados.nome} />}
            <footer className={estilos.rodape}><span className={estilos.ponto} />Nova área em construção <span>·</span> Visível apenas na conta de teste</footer>
          </main>
        </div>
      </div>
      {mostrarVoltarAoMenu && <button type="button" className={estilos.voltarAoMenu} onClick={voltarAoMenu} aria-label="Voltar ao menu no topo" aria-controls="menu-nova-area">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Menu
      </button>}
    </div>
  );
}
