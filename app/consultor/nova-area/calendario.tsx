"use client";

import { useEffect, useRef, useState } from "react";
import { diaDoAcontecimento, diaEmPortugal, diasDoMes, mudarMes, NOMES_CATEGORIAS, type AcontecimentoCalendario, type CategoriaAcontecimento } from "@/lib/calendario-consultor";
import estilos from "./nova-area.module.css";
import s from "./calendario.module.css";
import { EventoForm } from "../evento-form";

const CATEGORIAS = Object.keys(NOMES_CATEGORIAS) as CategoriaAcontecimento[];
const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ETIQUETAS_EVENTOS: Record<CategoriaAcontecimento, string> = {
  webinar: "Webinar", welcome: "Welcome", formacao: "Equipa", icligo: "iCliGo", evento: "Evento",
};

function MarcaAcontecimento({ categoria }: { categoria: CategoriaAcontecimento }) {
  return <span className={s.marcaEvento}>
    {categoria === "icligo" ? <img className={s.logoIcligo} src="/icligo-logo.png" alt="" width={32} height={32} /> : <span className={s.ponto} aria-hidden="true" />}
    <span className={s.nomeMarca}>{ETIQUETAS_EVENTOS[categoria]}</span>
  </span>;
}

function dataLonga(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon",
  });
}

function hora(data: string): string {
  return new Date(data).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}

function horario(acontecimento: AcontecimentoCalendario): string {
  if (acontecimento.diaInteiro) return "Hora por confirmar";
  return `${hora(acontecimento.comecaEm)}${acontecimento.terminaEm ? ` – ${hora(acontecimento.terminaEm)}` : ""}`;
}

export function CalendarioConsultor({ email, nome }: { email: string; nome: string | null }) {
  const hoje = diaEmPortugal();
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [vista, setVista] = useState<"mes" | "agenda">("mes");
  const [categorias, setCategorias] = useState(CATEGORIAS);
  const [dados, setDados] = useState<{ mes: string; acontecimentos: AcontecimentoCalendario[] } | null>(null);
  const [estado, setEstado] = useState<"carregar" | "pronto" | "erro">("carregar");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [selecionado, setSelecionado] = useState<AcontecimentoCalendario | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aPedir, setAPedir] = useState(false);
  const [erroAcao, setErroAcao] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [mostrarInscricaoEvento, setMostrarInscricaoEvento] = useState(false);
  const acontecimentoAtual = useRef<string | undefined>(undefined);
  acontecimentoAtual.current = selecionado?.id;

  function abrirAcontecimento(acontecimento: AcontecimentoCalendario) {
    setErroAcao("");
    setConfirmado(false);
    setMostrarInscricaoEvento(false);
    setSelecionado(acontecimento);
  }

  async function pedirAcesso() {
    if (!selecionado?.webinarId || aPedir) return;
    const acontecimento = selecionado;
    const janela = acontecimento.inscrito ? window.open("about:blank", "_blank") : null;
    if (janela) janela.opener = null;
    setAPedir(true);
    setErroAcao("");
    try {
      const resposta = await fetch(`/api/consultor/backoffice/${acontecimento.categoria === "webinar" ? "webinar" : "formacao"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, webinarId: acontecimento.webinarId }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok || typeof corpo.url !== "string") throw new Error(corpo.erro ?? "Não foi possível preparar o teu acesso. Tenta novamente.");
      if (acontecimento.inscrito) {
        if (janela) janela.location.href = corpo.url;
        else window.location.href = corpo.url;
      } else {
        setDados(atual => atual ? { ...atual, acontecimentos: atual.acontecimentos.map(a => a.id === acontecimento.id ? { ...a, inscrito: true } : a) } : atual);
        setSelecionado(atual => atual?.id === acontecimento.id ? { ...atual, inscrito: true } : atual);
        if (acontecimentoAtual.current === acontecimento.id) setConfirmado(true);
      }
    } catch (falha) {
      janela?.close();
      if (acontecimentoAtual.current === acontecimento.id) setErroAcao(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAPedir(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    setEstado("carregar");
    setErro("");
    async function carregar() {
      try {
        const r = await fetch("/api/consultor/nova-area/calendario", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, mes }), signal: controller.signal,
        });
        const corpo = await r.json();
        if (controller.signal.aborted) return;
        if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível carregar o calendário.");
        setDados(corpo);
        setEstado("pronto");
      } catch (falha) {
        if (controller.signal.aborted) return;
        setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
        setEstado("erro");
      }
    }
    void carregar();
    return () => controller.abort();
  }, [email, mes, tentativa]);

  useEffect(() => {
    if (selecionado && !dialogo.current?.open) dialogo.current?.showModal();
    if (!selecionado && dialogo.current?.open) dialogo.current.close();
  }, [selecionado]);

  function escolherMes(novo: string) {
    if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(novo)) return;
    setMes(novo);
    setDiaSelecionado(novo === hoje.slice(0, 7) ? hoje : `${novo}-01`);
    setSelecionado(null);
  }

  function escolherDia(dia: string) {
    if (!dia.startsWith(mes)) escolherMes(dia.slice(0, 7));
    setDiaSelecionado(dia);
  }

  const acontecimentos = estado !== "erro" && dados?.mes === mes ? dados.acontecimentos : [];
  const visiveis = acontecimentos.filter(a => categorias.includes(a.categoria));
  const porDia = new Map<string, AcontecimentoCalendario[]>();
  for (const a of visiveis) {
    const dia = diaDoAcontecimento(a);
    porDia.set(dia, [...(porDia.get(dia) ?? []), a]);
  }
  const tituloMes = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

  function lista(listaEventos: AcontecimentoCalendario[]) {
    return <div className={s.lista}>{listaEventos.map(a => <button type="button" key={a.id} className={s.itemAgenda} data-categoria={a.categoria} onClick={() => abrirAcontecimento(a)}>
      {a.categoria === "icligo" ? <img className={s.logoIcligo} src="/icligo-logo.png" alt="" width={32} height={32} /> : <span className={s.ponto} aria-hidden="true" />}
      <span className={s.itemTexto}><strong>{a.titulo}</strong><span>{horario(a)} · {NOMES_CATEGORIAS[a.categoria]}</span>{a.local && <small>{a.local}</small>}</span>
      <span aria-hidden="true">↗</span>
    </button>)}</div>;
  }

  return <section id="calendario" aria-label="Calendário mensal">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>A TUA AGENDA</span>
      <h1>Calendário<span>.</span></h1>
      <p>Webinars, Welcome Aboard, formações e eventos da equipa num só lugar.</p>
    </div>
    <div className={s.contentor}>
      <div className={s.barra}>
        <div className={s.navegacao}>
          <button type="button" onClick={() => escolherMes(hoje.slice(0, 7))}>Hoje</button>
          <button type="button" aria-label="Mês anterior" disabled={mes === "2000-01"} onClick={() => escolherMes(mudarMes(mes, -1))}>‹</button>
          <button type="button" aria-label="Mês seguinte" disabled={mes === "2099-12"} onClick={() => escolherMes(mudarMes(mes, 1))}>›</button>
          <h2 id="mes-calendario">{tituloMes}</h2>
        </div>
        <div className={s.controlos}>
          <input type="month" aria-label="Escolher mês" value={mes} min="2000-01" max="2099-12" onChange={e => escolherMes(e.target.value)} />
          <div className={s.vistas} aria-label="Vista do calendário">
            <button type="button" aria-pressed={vista === "mes"} onClick={() => setVista("mes")}>Mês</button>
            <button type="button" aria-pressed={vista === "agenda"} onClick={() => setVista("agenda")}>Agenda</button>
          </div>
        </div>
      </div>
      <div className={s.legenda} aria-label="Filtrar acontecimentos">
        {CATEGORIAS.map(c => <button key={c} type="button" data-categoria={c} aria-pressed={categorias.includes(c)} onClick={() => setCategorias(atual => atual.includes(c) ? atual.filter(v => v !== c) : [...atual, c])}>
          <span className={s.ponto} aria-hidden="true" />{NOMES_CATEGORIAS[c]}
        </button>)}
      </div>
      <p className={s.resumo} aria-live="polite">{estado === "erro" ? "Calendário indisponível" : estado === "carregar" || dados?.mes !== mes ? "A carregar os acontecimentos…" : `${visiveis.length} ${visiveis.length === 1 ? "acontecimento" : "acontecimentos"} neste mês · Horas de Portugal`}</p>
      {estado === "erro" && <div className={s.erro} role="alert"><p>{erro}</p><button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>}
      {vista === "mes" ? <>
        <div className={s.deslocacaoMes} tabIndex={0} role="region" aria-label={`Calendário de ${tituloMes}`}>
        <div className={s.grelha} aria-labelledby="mes-calendario" aria-busy={estado === "carregar"}>
          {DIAS_SEMANA.map(d => <div className={s.diaSemana} key={d}>{d}</div>)}
          {diasDoMes(mes).map(dia => <div key={dia} className={s.dia} data-dia={dia} data-fora={!dia.startsWith(mes)} data-selecionado={diaSelecionado === dia}>
            <button type="button" className={s.numero} data-hoje={dia === hoje} aria-label={dataLonga(dia)} aria-pressed={diaSelecionado === dia} onClick={() => escolherDia(dia)}>{Number(dia.slice(-2))}</button>
            <div className={s.eventosDia}>{(porDia.get(dia) ?? []).map(a => <button type="button" className={s.acontecimento} key={a.id} data-categoria={a.categoria} title={`${a.titulo} · ${horario(a)}`} aria-label={`${a.titulo}, ${dataLonga(dia)}, ${horario(a)}`} aria-haspopup="dialog" onClick={() => { setDiaSelecionado(dia); abrirAcontecimento(a); }}>
              <MarcaAcontecimento categoria={a.categoria} />
              <span className={s.hora}>{a.diaInteiro ? "Hora por confirmar" : hora(a.comecaEm)}</span>
              <span className={s.eventoTexto}>{a.titulo}</span>
              <span className={s.verDetalhes} aria-hidden="true">Ver detalhes <span>↗</span></span>
            </button>)}</div>
          </div>)}
        </div>
        </div>
        <div className={s.agendaDia}>
          <h3>{dataLonga(diaSelecionado)}</h3>
          {porDia.has(diaSelecionado) ? lista(porDia.get(diaSelecionado)!) : estado === "pronto" && <p>Sem acontecimentos para este dia.</p>}
        </div>
      </> : <div className={s.agendaMes}>
        {[...porDia.entries()].map(([dia, eventos]) => <div key={dia}><h3>{dataLonga(dia)}</h3>{lista(eventos)}</div>)}
        {estado === "pronto" && !visiveis.length && <p>Sem acontecimentos para os filtros selecionados neste mês.</p>}
      </div>}
    </div>
    <dialog ref={dialogo} className={s.dialogo} aria-labelledby="titulo-acontecimento" onCancel={() => setSelecionado(null)} onClick={e => { if (e.target === e.currentTarget) setSelecionado(null); }}>
      {selecionado && <div>
        <button type="button" className={s.fechar} onClick={() => setSelecionado(null)} aria-label="Fechar detalhes">×</button>
        <span className={s.tipoDetalhes} data-categoria={selecionado.categoria}>{selecionado.categoria === "icligo" ? <img className={s.logoIcligo} src="/icligo-logo.png" alt="" width={32} height={32} /> : <span className={s.ponto} />}{NOMES_CATEGORIAS[selecionado.categoria]}</span>
        <h2 id="titulo-acontecimento">{selecionado.titulo}</h2>
        <p>{dataLonga(diaDoAcontecimento(selecionado))}</p>
        <p><strong>{horario(selecionado)}</strong>{!selecionado.diaInteiro && " · Hora de Portugal"}</p>
        {selecionado.local && <p>{selecionado.local}</p>}
        <div className={s.acoes} data-categoria={selecionado.categoria}>
          {selecionado.webinarId && <button type="button" className={`${estilos.botao} ${s.botaoAcao}`} disabled={aPedir} onClick={() => void pedirAcesso()}>
            {aPedir ? "A preparar o teu acesso…" : !selecionado.inscrito ? "Inscrever-me" : selecionado.categoria === "webinar" ? "Entrar no webinar" : selecionado.categoria === "welcome" ? "Entrar na sessão" : "Entrar na formação"} <span aria-hidden="true">↗</span>
          </button>}
          {selecionado.url && <a className={`${estilos.botao} ${s.botaoAcao}`} href={selecionado.url} target="_blank" rel="noopener noreferrer">{selecionado.categoria === "icligo" ? "Ir para a formação" : selecionado.id === "convencao-2027" ? "Comprar bilhetes" : "Ver evento"} <span aria-hidden="true">↗</span></a>}
          {selecionado.id === "teambuilding-2026" && <>
            <button type="button" className={`${estilos.botao} ${s.botaoAcao}`} disabled={!selecionado.inscricoesAbertas || mostrarInscricaoEvento} onClick={() => setMostrarInscricaoEvento(true)}>{selecionado.inscricoesAbertas ? "Inscrever-me no evento" : "Inscrições encerradas"}</button>
            {mostrarInscricaoEvento && <EventoForm email={email} nome={nome} />}
          </>}
          {confirmado && <p role="status" className={s.confirmado}>✓ Inscrição confirmada. Já podes usar o botão para entrar.</p>}
          {erroAcao && <p role="alert" className={s.erroAcao}>{erroAcao}</p>}
        </div>
      </div>}
    </dialog>
  </section>;
}
