"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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

function Passo({ numero, titulo, concluido, alternar, children }: {
  numero: number; titulo: string; concluido: boolean; alternar: () => void; children: ReactNode;
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
          <button type="button" className={estilos.concluir} aria-pressed={concluido} onClick={alternar}>
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
  const [seccao, setSeccao] = useState<"comeca-aqui" | "calendario" | "leads" | "tarefas-equipa" | "proximo-webinar" | "proximas-formacoes" | "formacoes-gravadas" | "documentos" | "eventos-presenciais">("comeca-aqui");

  useEffect(() => {
    const conta = lerEmailGuardado()?.trim().toLowerCase() ?? "";
    if (!podeVerNovaArea(conta)) { setEstado("sem-acesso"); return; }
    const controller = new AbortController();
    setEmail(conta);
    try {
      const guardados: unknown = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO) ?? "[]");
      if (Array.isArray(guardados)) {
        setFeitos([...new Set(guardados.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 5))]);
      }
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

  function alternarPasso(numero: number) {
    const atualizados = feitos.includes(numero) ? feitos.filter(n => n !== numero) : [...feitos, numero];
    setFeitos(atualizados);
    try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(atualizados)); } catch { /* Sem bloquear a página. */ }
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
            <div><strong>Olá, {primeiroNome}</strong><span>{email}</span></div>
            <button type="button" className={estilos.sair} onClick={() => { limparEmailGuardado(); setDados(null); setEstado("sem-acesso"); }}>Sair <Seta /></button>
          </div>
        </header>

        <div className={estilos.layout}>
          <aside className={estilos.lateral}>
            <nav aria-label="Secções da nova área">
              <div className={estilos.grupoMenu}>
                <span className={estilos.etiqueta}>PRIMEIROS PASSOS</span>
                <button type="button" className={seccao === "comeca-aqui" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("comeca-aqui")} aria-current={seccao === "comeca-aqui" ? "page" : undefined} aria-controls="conteudo-nova-area">Começa aqui <span>{5 - totalFeitos}</span></button>
              </div>
              <div className={estilos.grupoMenu}>
                <button type="button" className={seccao === "calendario" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("calendario")} aria-current={seccao === "calendario" ? "page" : undefined} aria-controls="conteudo-nova-area">Calendário <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M7 3v4m10-4v4M3 11h18" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              </div>
              <div className={estilos.grupoMenu}>
                <span className={estilos.etiqueta}>A MINHA ORGANIZAÇÃO</span>
                <button type="button" className={seccao === "leads" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("leads")} aria-current={seccao === "leads" ? "page" : undefined} aria-controls="conteudo-nova-area">Leads</button>
                <button type="button" className={seccao === "tarefas-equipa" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("tarefas-equipa")} aria-current={seccao === "tarefas-equipa" ? "page" : undefined} aria-controls="conteudo-nova-area">Tarefas iniciais da equipa</button>
                <button type="button" className={seccao === "proximo-webinar" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("proximo-webinar")} aria-current={seccao === "proximo-webinar" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximo webinar</button>
              </div>
              <div className={estilos.grupoMenu}>
                <span className={estilos.etiqueta}>FORMAÇÃO</span>
                <button type="button" className={seccao === "proximas-formacoes" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("proximas-formacoes")} aria-current={seccao === "proximas-formacoes" ? "page" : undefined} aria-controls="conteudo-nova-area">Próximas formações</button>
                <button type="button" className={seccao === "formacoes-gravadas" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("formacoes-gravadas")} aria-current={seccao === "formacoes-gravadas" ? "page" : undefined} aria-controls="conteudo-nova-area">Formações gravadas</button>
                <button type="button" className={seccao === "documentos" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("documentos")} aria-current={seccao === "documentos" ? "page" : undefined} aria-controls="conteudo-nova-area">Documentos</button>
              </div>
              <div className={estilos.grupoMenu}>
                <span className={estilos.etiqueta}>EVENTOS</span>
                <button type="button" className={seccao === "eventos-presenciais" ? estilos.navAtivo : estilos.navItem} onClick={() => setSeccao("eventos-presenciais")} aria-current={seccao === "eventos-presenciais" ? "page" : undefined} aria-controls="conteudo-nova-area">Eventos presenciais</button>
              </div>
            </nav>
            {seccao === "comeca-aqui" && <div className={estilos.resumo}>
              <span className={estilos.etiqueta}>O TEU ARRANQUE</span>
              <p>{totalFeitos === 5 ? "Primeiros passos concluídos!" : "Um passo de cada vez."}</p>
              <div className={estilos.barra} role="progressbar" aria-label="Primeiros passos concluídos" aria-valuemin={0} aria-valuemax={5} aria-valuenow={totalFeitos}><span style={{ width: `${totalFeitos * 20}%` }} /></div>
              <span className={estilos.progressoTexto}>{totalFeitos} de 5 passos feitos</span>
              <ol className={estilos.listaPassos}>
                {TITULOS.map((titulo, i) => <li key={titulo}><a href={`#passo-${i + 1}`}><span className={feitos.includes(i + 1) ? estilos.miniFeito : estilos.miniNumero}>{feitos.includes(i + 1) ? "✓" : i + 1}</span>{titulo}</a></li>)}
              </ol>
            </div>}
            <Link className={estilos.voltar} href="/consultor">Consultar a área atual <Seta /></Link>
          </aside>

          <main id="conteudo-nova-area" className={estilos.conteudo}>
            {seccao === "comeca-aqui" && <section id="comeca-aqui" aria-label="Começa aqui">
            <div className={estilos.intro}>
              <span className={estilos.etiqueta}>BEM-VINDO À EQUIPA</span>
              <h1>Começa aqui<span>.</span></h1>
              <p>Os teus primeiros passos, por esta ordem. <strong>{totalFeitos} de 5 feitos.</strong></p>
            </div>
            <div className={estilos.passos}>
              <Passo numero={1} titulo="Entra no grupo de WhatsApp Welcome Aboard" concluido={feitos.includes(1)} alternar={() => alternarPasso(1)}>
                <p>O teu ponto de encontro para começares acompanhado. Junta-te ao grupo de acolhimento da equipa.</p>
                <div className={estilos.grupo}>
                  <span className={estilos.grupoIcone} aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M20 11.5a8 8 0 0 1-12 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" /><path d="M8.5 8.5c.8 3.2 2.5 4.8 5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
                  <div><h3>Welcome Aboard</h3><p>Primeiros passos, dúvidas e boas-vindas à comunidade.</p></div>
                  {LINK_GRUPO_WELCOME_ABOARD
                    ? <a className={estilos.botao} href={LINK_GRUPO_WELCOME_ABOARD} target="_blank" rel="noopener noreferrer">Entrar no grupo <Seta /></a>
                    : <div className={estilos.convitePendente}><button className={estilos.botao} type="button" disabled>Entrar no grupo <Seta /></button><small>Convite disponível em breve</small></div>}
                </div>
              </Passo>

              <Passo numero={2} titulo="Marca a 1.ª videochamada com o teu upline" concluido={feitos.includes(2)} alternar={() => alternarPasso(2)}>
                <p>Uma conversa curta, no máximo 30 minutos, para se conhecerem e para te orientar no arranque.</p>
                {dados.upline?.nome && <p className={estilos.upline}>O teu upline é <strong>{dados.upline.nome}.</strong></p>}
                <a className={estilos.botao} href={mensagemWhatsApp(dados.nome)} target="_blank" rel="noopener noreferrer">Preparar mensagem no WhatsApp <Seta /></a>
                <p className={estilos.nota}>Escolhe o contacto do teu upline e combina a chamada.</p>
              </Passo>

              <Passo numero={3} titulo="Faz o curso Be a Travel Partner" concluido={feitos.includes(3)} alternar={() => alternarPasso(3)}>
                <p>É <strong>obrigatório</strong> e está na academia da iCliGo. Faz-se lá; aqui fica o caminho para chegares ao curso.</p>
                <a className={estilos.botao} href={LINK_CURSO_TRAVEL_PARTNER} target="_blank" rel="noopener noreferrer">Ir para o curso <Seta /></a>
                <p className={estilos.nota}>Entra com a tua conta da iCliGo Academy.</p>
              </Passo>

              <Passo numero={4} titulo="Vai ao Welcome Aboard — a Sessão 1 e a Sessão 2" concluido={feitos.includes(4)} alternar={() => alternarPasso(4)}>
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

              <Passo numero={5} titulo="Marca a 2.ª videochamada com o teu upline, para definir objetivos" concluido={feitos.includes(5)} alternar={() => alternarPasso(5)}>
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
            {seccao === "documentos" && <DocumentosNovaArea />}
            {seccao === "eventos-presenciais" && <EventosPresenciais email={email} nome={dados.nome} />}
            <footer className={estilos.rodape}><span className={estilos.ponto} />Nova área em construção <span>·</span> Visível apenas na conta de teste</footer>
          </main>
        </div>
      </div>
    </div>
  );
}
