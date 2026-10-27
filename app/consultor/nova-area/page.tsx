"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LINK_CURSO_TRAVEL_PARTNER,
  podeVerNovaArea,
  type DadosNovaArea,
} from "@/lib/consultor-nova-area";
import { AlternarArea } from "../alternar-area";
import { lerEmailGuardado, limparEmailGuardado } from "../armazenamento";
import estilos from "./nova-area.module.css";
import { ProximoWebinar } from "./organizacao";
import { ChecklistMentor } from "./mentor-checklist";
import { LeadsNovaArea } from "./leads";
import { ProximasFormacoes, FormacoesGravadas, DocumentosNovaArea } from "./formacao";
import { CalendarioConsultor } from "./calendario";
import { CalendarioCriativo } from "./calendario-criativo";
import { BlackFriday } from "./blackfriday";
import { EventosPresenciais } from "./eventos";
import { InicioNovaArea } from "./inicio";
import { TestemunhosNovaArea } from "./testemunhos";
import { AssistenteEquipa } from "./assistente";
import { CalculadorasNovaArea } from "./calculadoras";
import { CoreRankNovaArea } from "./core-rank";
import { ReservasNovaArea } from "./reservas";
import { TravelPlannerNovaArea } from "./travel-planner";
import { PropostaNovaArea } from "./proposta";
import { ComecaAqui } from "./onboarding";
import { limparPrimeirosPassos, importarOnboardingTemporario, migrarPrimeirosPassosAnteriores, RESUMO_PRIMEIROS_PASSOS, TOTAL_PRIMEIROS_PASSOS } from "@/lib/primeiros-passos";

const CHAVE_PROGRESSO = "consultor-nova-area:primeiros-passos:v2";

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

export default function NovaAreaConsultor() {
  const [estado, setEstado] = useState<"a-carregar" | "sem-acesso" | "erro" | "pronto">("a-carregar");
  const [email, setEmail] = useState("");
  const [dados, setDados] = useState<DadosNovaArea | null>(null);
  const [feitos, setFeitos] = useState<number[]>([]);
  const [erro, setErro] = useState("");
  const [aInscrever, setAInscrever] = useState(false);
  const [erroSessao, setErroSessao] = useState("");
  const [inscrito, setInscrito] = useState(false);
  const [seccao, setSeccao] = useState<"inicio" | "comeca-aqui" | "calendario" | "blackfriday" | "calendario-criativo" | "leads" | "mentor-checklist" | "proximo-webinar" | "proximas-formacoes" | "formacoes-gravadas" | "testemunhos" | "assistente" | "documentos" | "eventos-presenciais" | "calculadoras" | "core-rank" | "reservas" | "travel-planner" | "propostas">("inicio");
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [reservasAberto, setReservasAberto] = useState(false);
  const [coreAberto, setCoreAberto] = useState(false);
  const [abrirRelatoriosCore, setAbrirRelatoriosCore] = useState(0);
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
    if (proxima === "assistente") setAssistenteAberto(true);
    if (proxima === "core-rank") setCoreAberto(true);
    if (proxima === "reservas") setReservasAberto(true);
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
      const guardados = localStorage.getItem(CHAVE_PROGRESSO);
      progressoLocal = guardados !== null ? limparPrimeirosPassos(JSON.parse(guardados)) : limparPrimeirosPassos([
        ...importarOnboardingTemporario(JSON.parse(localStorage.getItem("consultor-nova-area:onboarding-codex:v2") ?? "[]")),
        ...migrarPrimeirosPassosAnteriores(JSON.parse(localStorage.getItem("consultor-nova-area:primeiros-passos:v1") ?? "[]")),
      ]);
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
        if (!corpo.primeirosPassos?.guardado) {
          const importacao = await fetch("/api/consultor/nova-area/progresso", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: conta, versao: 2, feitos: limparPrimeirosPassos([...feitosGuardados, ...progressoLocal]) }), signal: controller.signal,
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
        body: JSON.stringify({ email, versao: 2, passo: numero, concluido: !feitos.includes(numero) }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível guardar este passo.");
      const atualizados = limparPrimeirosPassos(corpo.feitos);
      setFeitos(atualizados);
      try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(atualizados)); } catch { /* A conta já tem o progresso guardado. */ }
      if (atualizados.length === TOTAL_PRIMEIROS_PASSOS) {
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
              <div className={estilos.grupoMenu}>
                <button type="button" className={seccao === "inicio" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("inicio")} aria-current={seccao === "inicio" ? "page" : undefined} aria-controls="conteudo-nova-area">Início <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3V10Z" stroke="currentColor" strokeWidth="1.6" /><path d="M9 20v-7h6v7" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              </div>
              <div className={estilos.grupoMenu}>
                <button type="button" className={seccao === "comeca-aqui" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("comeca-aqui")} aria-current={seccao === "comeca-aqui" ? "page" : undefined} aria-controls="conteudo-nova-area">Começa aqui <span>{totalFeitos === TOTAL_PRIMEIROS_PASSOS ? "✓" : TOTAL_PRIMEIROS_PASSOS - totalFeitos}</span></button>
                {seccao === "comeca-aqui" && <div className={estilos.resumo}>
                  <span className={estilos.etiqueta}>O TEU ARRANQUE</span>
                  <p>Um passo de cada vez.</p>
                  <div className={estilos.barra} role="progressbar" aria-label="Primeiros passos concluídos" aria-valuemin={0} aria-valuemax={TOTAL_PRIMEIROS_PASSOS} aria-valuenow={totalFeitos}><span style={{ width: `${totalFeitos / TOTAL_PRIMEIROS_PASSOS * 100}%` }} /></div>
                  <span className={estilos.progressoTexto}>{totalFeitos} de {TOTAL_PRIMEIROS_PASSOS} tarefas feitas</span>
                  <ol className={estilos.listaPassos}>
                    {RESUMO_PRIMEIROS_PASSOS.map(({ titulo, tarefas }, i) => <li key={titulo}><a href={`#passo-${i + 1}`}><span className={tarefas.every(tarefa => feitos.includes(tarefa)) ? estilos.miniFeito : estilos.miniNumero}>{tarefas.every(tarefa => feitos.includes(tarefa)) ? "✓" : i + 1}</span>{titulo}</a></li>)}
                  </ol>
                </div>}
              </div>
              <div className={estilos.grupoMenu}>
                <button type="button" className={seccao === "calendario" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("calendario")} aria-current={seccao === "calendario" ? "page" : undefined} aria-controls="conteudo-nova-area">Calendário <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M7 3v4m10-4v4M3 11h18" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              </div>
              <div className={estilos.grupoMenu}>
                <button type="button" className={estilos.navBlackFriday} onClick={() => abrirSeccao("blackfriday")} aria-current={seccao === "blackfriday" ? "page" : undefined} aria-controls="conteudo-nova-area">BLACKFRIDAY <span aria-hidden="true">✦</span></button>
              </div>
              <GrupoMenu titulo="A minha organização" ativo={seccao === "assistente" || seccao === "leads" || seccao === "proximo-webinar" || seccao === "testemunhos" || seccao === "mentor-checklist"}>
                <button type="button" className={seccao === "mentor-checklist" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("mentor-checklist")} aria-current={seccao === "mentor-checklist" ? "page" : undefined} aria-controls="conteudo-nova-area">Tenho um novo TP, e agora?</button>
                <button type="button" className={seccao === "assistente" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("assistente")} aria-current={seccao === "assistente" ? "page" : undefined} aria-controls="conteudo-nova-area">Assistente da equipa <span>IA</span></button>
                <button type="button" className={seccao === "leads" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("leads")} aria-current={seccao === "leads" ? "page" : undefined} aria-controls="conteudo-nova-area">Leads</button>
                <button type="button" className={seccao === "proximo-webinar" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("proximo-webinar")} aria-current={seccao === "proximo-webinar" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximo webinar</button>
                <button type="button" className={seccao === "testemunhos" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("testemunhos")} aria-current={seccao === "testemunhos" ? "page" : undefined} aria-controls="conteudo-nova-area">Testemunhos</button>
              </GrupoMenu>
              <GrupoMenu titulo="Reservas" ativo={seccao === "propostas" || seccao === "travel-planner" || seccao === "reservas" || seccao === "calendario-criativo"}>
                <button type="button" className={seccao === "propostas" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("propostas")} aria-current={seccao === "propostas" ? "page" : undefined} aria-controls="conteudo-nova-area">Propostas</button>
                <button type="button" className={seccao === "travel-planner" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("travel-planner")} aria-current={seccao === "travel-planner" ? "page" : undefined} aria-controls="conteudo-nova-area">Travel planner</button>
                <button type="button" className={seccao === "reservas" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("reservas")} aria-current={seccao === "reservas" ? "page" : undefined} aria-controls="conteudo-nova-area">Criar templates</button>
                <button type="button" className={seccao === "calendario-criativo" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("calendario-criativo")} aria-current={seccao === "calendario-criativo" ? "page" : undefined} aria-controls="conteudo-nova-area">Calendário criativo</button>
              </GrupoMenu>
              <GrupoMenu titulo="Objetivos" ativo={seccao === "core-rank" || seccao === "calculadoras"}>
                <button type="button" className={seccao === "core-rank" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("core-rank")} aria-current={seccao === "core-rank" ? "page" : undefined} aria-controls="conteudo-nova-area">Core Rank</button>
                <button type="button" className={seccao === "calculadoras" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("calculadoras")} aria-current={seccao === "calculadoras" ? "page" : undefined} aria-controls="conteudo-nova-area">Calculadoras</button>
              </GrupoMenu>
              <GrupoMenu titulo="Formação e eventos" ativo={seccao === "proximas-formacoes" || seccao === "formacoes-gravadas" || seccao === "documentos" || seccao === "eventos-presenciais"}>
                <button type="button" className={seccao === "proximas-formacoes" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("proximas-formacoes")} aria-current={seccao === "proximas-formacoes" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximas formações</button>
                <button type="button" className={seccao === "formacoes-gravadas" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("formacoes-gravadas")} aria-current={seccao === "formacoes-gravadas" ? "page" : undefined} aria-controls="conteudo-nova-area">Formações gravadas</button>
                <button type="button" className={seccao === "documentos" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("documentos")} aria-current={seccao === "documentos" ? "page" : undefined} aria-controls="conteudo-nova-area">Documentos</button>
                <button type="button" className={seccao === "eventos-presenciais" ? estilos.navAtivo : estilos.navItem} onClick={() => abrirSeccao("eventos-presenciais")} aria-current={seccao === "eventos-presenciais" ? "page" : undefined} aria-controls="conteudo-nova-area">Eventos presenciais</button>
              </GrupoMenu>
            </nav>
            <Link className={estilos.voltar} href="/consultor">Consultar a área atual <Seta /></Link>
          </aside>

          <main id="conteudo-nova-area" ref={conteudo} tabIndex={-1} aria-label="Conteúdo da secção" className={estilos.conteudo}>
            {seccao === "inicio" && <InicioNovaArea email={email} aoAbrirCore={() => {setAbrirRelatoriosCore(n => n + 1); abrirSeccao("core-rank");}} avisos={dados.avisos ?? []} erroAvisos={dados.erroAvisos ?? false} feitos={totalFeitos} aoComecar={() => abrirSeccao("comeca-aqui")} acabadoAgora={acabadoAgora} />}
            {seccao === "comeca-aqui" && <ComecaAqui
              linkGrupo={dados.linkGrupoWelcomeAboard || null} linkCurso={LINK_CURSO_TRAVEL_PARTNER}
              abrir={abrirSeccao} nome={dados.nome} nomeUpline={dados.upline?.nome}
              feitos={feitos} alternar={numero => void alternarPasso(numero)} aGuardar={aGuardarPasso} erro={erroProgresso}
              sessaoWelcomeAboard={<>
                {dados.proximaSessao ? <>
                  <p className={estilos.dataSessao}>Próxima sessão Welcome Aboard: <strong>{new Date(dados.proximaSessao.comecaEm).toLocaleString("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}.</strong></p>
                  <button className={estilos.botao} type="button" disabled={aInscrever} onClick={() => void entrarWelcomeAboard()}>{aInscrever ? "A preparar o teu acesso…" : inscrito ? "Entrar na sessão" : "Inscrever-me"} <Seta /></button>
                </> : <p className={estilos.nota}>A próxima sessão será apresentada aqui assim que estiver agendada.</p>}
                {erroSessao && <p role="alert" className={estilos.erro}>{erroSessao}</p>}
              </>}
            />}
            {seccao === "leads" && <LeadsNovaArea linkPartilha={dados.linkPartilha} />}
            {seccao === "calendario" && <CalendarioConsultor email={email} nome={dados.nome} />}
            {seccao === "calendario-criativo" && <CalendarioCriativo email={email} />}
            {seccao === "blackfriday" && <BlackFriday email={email} />}
            {seccao === "calculadoras" && <CalculadorasNovaArea />}
            {reservasAberto && <div hidden={seccao !== "reservas"}><ReservasNovaArea email={email} /></div>}
            {seccao === "travel-planner" && <TravelPlannerNovaArea email={email} />}
            {seccao === "propostas" && <PropostaNovaArea email={email} abrirPlanner={() => abrirSeccao("travel-planner")} />}
            {coreAberto && <div hidden={seccao !== "core-rank"}><CoreRankNovaArea email={email} nome={dados.nome} abrirRelatorios={abrirRelatoriosCore} /></div>}
            {seccao === "mentor-checklist" && <ChecklistMentor email={email} />}
            {seccao === "proximo-webinar" && <ProximoWebinar webinar={dados.proximoWebinar} email={email} aoInscrever={() => setDados(atual => atual?.proximoWebinar ? { ...atual, proximoWebinar: { ...atual.proximoWebinar, inscrito: true } } : atual)} />}
            {seccao === "proximas-formacoes" && <ProximasFormacoes formacoes={dados.proximasFormacoes} email={email} aoInscrever={id => setDados(atual => atual ? {
              ...atual, proximasFormacoes: atual.proximasFormacoes.map(f => f.id === id && f.tipo === "interna" ? { ...f, inscrito: true } : f),
            } : atual)} />}
            {seccao === "formacoes-gravadas" && <FormacoesGravadas />}
            {seccao === "testemunhos" && <TestemunhosNovaArea />}
            {assistenteAberto && <div hidden={seccao !== "assistente"}><AssistenteEquipa email={email} /></div>}
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
