"use client";

import { useEffect, useRef, useState } from "react";
import { diaEmPortugal, diasDoMes } from "@/lib/calendario-consultor";
import {
  DIAS_CALENDARIO_CRIATIVO, FORMATOS_CONTEUDO, NOMES_FASES, NOMES_FORMATOS, NOTAS_CALENDARIO_CRIATIVO,
  idPublicacao, limparPublicados, type DiaCalendarioCriativo, type FaseCalendario, type IdeiaConteudo,
} from "@/lib/calendario-criativo";
import s from "./calendario-criativo.module.css";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const FASES = Object.keys(NOMES_FASES) as FaseCalendario[];
const POR_DATA = new Map(DIAS_CALENDARIO_CRIATIVO.map(d => [d.data, d]));
const MESES = [...new Set(DIAS_CALENDARIO_CRIATIVO.map(d => d.data.slice(0, 7)))];
const TOTAL_PUBLICACOES = DIAS_CALENDARIO_CRIATIVO.length * FORMATOS_CONTEUDO.length;

function dataLonga(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" });
}

function dataCurta(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Lisbon" });
}

function nomeMes(mes: string): string {
  return new Date(`${mes}-01T12:00:00Z`).toLocaleDateString("pt-PT", { month: "long", timeZone: "Europe/Lisbon" });
}

/** Só as semanas do mês com temas, para não mostrar semanas vazias antes de 22/10. */
function semanasComTemas(mes: string): string[] {
  const dias = diasDoMes(mes);
  return dias.filter((_, i) => {
    const semana = dias.slice(i - i % 7, i - i % 7 + 7);
    return semana.some(d => d.startsWith(mes) && POR_DATA.has(d));
  });
}

function textoParaCopiar(dia: DiaCalendarioCriativo, ideia: IdeiaConteudo): string {
  return [`${NOMES_FORMATOS[ideia.formato]} — ${dia.tema}`, ...ideia.campos.map(c => `${c.rotulo}: ${c.texto}`)].join("\n");
}

export function CalendarioCriativo({ email }: { email: string }) {
  const hoje = diaEmPortugal();
  const [mes, setMes] = useState(MESES.includes(hoje.slice(0, 7)) ? hoje.slice(0, 7) : hoje < MESES[0]! ? MESES[0]! : MESES.at(-1)!);
  const [publicados, setPublicados] = useState<string[]>([]);
  const [estado, setEstado] = useState<"carregar" | "pronto" | "erro">("carregar");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [aberto, setAberto] = useState<DiaCalendarioCriativo | null>(null);
  const [aGuardar, setAGuardar] = useState<string | null>(null);
  const [erroMarcar, setErroMarcar] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setEstado("carregar");
    void fetch("/api/consultor/calendario-criativo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, acao: "consultar" }), signal: controller.signal,
    }).then(async resposta => {
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível carregar o teu progresso.");
      if (controller.signal.aborted) return;
      setPublicados(limparPublicados(corpo.publicados));
      setEstado("pronto");
    }).catch(falha => {
      if (controller.signal.aborted) return;
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
      setEstado("erro");
    });
    return () => controller.abort();
  }, [email, tentativa]);

  useEffect(() => {
    if (aberto && !dialogo.current?.open) dialogo.current?.showModal();
    if (!aberto && dialogo.current?.open) dialogo.current.close();
  }, [aberto]);

  function abrir(dia: DiaCalendarioCriativo) {
    setErroMarcar("");
    setCopiado(null);
    setAberto(dia);
    setMes(dia.data.slice(0, 7));
  }

  async function alternarPublicado(id: string) {
    if (aGuardar) return;
    setAGuardar(id);
    setErroMarcar("");
    try {
      const resposta = await fetch("/api/consultor/calendario-criativo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, acao: "marcar", id, publicado: !publicados.includes(id) }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível guardar. Tenta novamente.");
      setPublicados(limparPublicados(corpo.publicados));
    } catch (falha) {
      setErroMarcar(falha instanceof Error ? falha.message : "Não foi possível guardar. Tenta novamente.");
    } finally { setAGuardar(null); }
  }

  async function copiar(dia: DiaCalendarioCriativo, ideia: IdeiaConteudo) {
    const id = idPublicacao(dia.data, ideia.formato);
    try {
      await navigator.clipboard.writeText(textoParaCopiar(dia, ideia));
      setCopiado(id);
      setTimeout(() => setCopiado(atual => atual === id ? null : atual), 2000);
    } catch { setErroMarcar("Não foi possível copiar. Seleciona o texto e copia manualmente."); }
  }

  const feitosNoDia = (dia: DiaCalendarioCriativo) => FORMATOS_CONTEUDO.filter(f => publicados.includes(idPublicacao(dia.data, f))).length;
  const diasDoMesAtual = DIAS_CALENDARIO_CRIATIVO.filter(d => d.data.startsWith(mes));
  const indiceAberto = aberto ? DIAS_CALENDARIO_CRIATIVO.indexOf(aberto) : -1;

  function Progresso({ dia }: { dia: DiaCalendarioCriativo }) {
    if (estado !== "pronto") return null;
    const feitos = feitosNoDia(dia);
    return <span className={s.progresso} data-completo={feitos === 4}>{feitos === 4 ? "✓ 4/4" : `${feitos}/4`}</span>;
  }

  return <section id="calendario-criativo" className={s.raiz} aria-label="Calendário criativo">
    <div className={s.intro}>
      <span className={s.etiqueta}>BLACK FRIDAY · REDES SOCIAIS</span>
      <h1>Calendário criativo<span>.</span></h1>
      <p>Um tema por dia, de 22 de outubro a 30 de novembro. Clica num dia para veres as 4 ideias: Reel, Carrossel, Fotografia e Post estático.</p>
      <p className={s.total} aria-live="polite">{estado === "pronto" ? <><strong>{publicados.length} de {TOTAL_PUBLICACOES}</strong> publicações feitas</> : estado === "carregar" ? "A carregar o teu progresso…" : null}</p>
    </div>

    {estado === "erro" && <div className={s.erro} role="alert"><p>{erro}</p><button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>}

    <div className={s.notas}>
      <div className={s.nota} data-fase="black-friday"><h2>Black Friday</h2><p>{NOTAS_CALENDARIO_CRIATIVO.blackFriday}</p></div>
      <div className={s.nota}><h2>Música e trends</h2><p>{NOTAS_CALENDARIO_CRIATIVO.musica}</p></div>
    </div>

    <div className={s.contentor}>
      <div className={s.barra}>
        <div className={s.meses} role="group" aria-label="Escolher mês">
          {MESES.map(m => <button key={m} type="button" aria-pressed={mes === m} onClick={() => setMes(m)}>{nomeMes(m)}</button>)}
        </div>
        <ul className={s.legenda} aria-label="Fases da campanha">
          {FASES.map(f => <li key={f} data-fase={f}><span className={s.ponto} aria-hidden="true" />{NOMES_FASES[f]}</li>)}
        </ul>
      </div>

      <div className={s.grelha} role="group" aria-label={`Calendário criativo de ${nomeMes(mes)}`}>
        {DIAS_SEMANA.map(d => <div className={s.diaSemana} key={d} aria-hidden="true">{d}</div>)}
        {semanasComTemas(mes).map(data => {
          const dia = POR_DATA.get(data);
          const fora = !data.startsWith(mes);
          if (!dia || fora) return <div key={data} className={s.dia} data-vazio="true" data-fora={fora}><span className={s.numero}>{Number(data.slice(-2))}</span></div>;
          return <button key={data} type="button" className={s.dia} data-fase={dia.fase} data-hoje={data === hoje} data-passado={data < hoje} aria-haspopup="dialog" aria-label={`${dataLonga(data)}: ${dia.tema}`} onClick={() => abrir(dia)}>
            <span className={s.cabecalhoDia}><span className={s.numero}>{Number(data.slice(-2))}</span><Progresso dia={dia} /></span>
            <span className={s.tema}>{dia.tema}</span>
          </button>;
        })}
      </div>

      <ol className={s.lista} aria-label={`Temas de ${nomeMes(mes)}`}>
        {diasDoMesAtual.map(dia => <li key={dia.data}>
          <button type="button" className={s.itemLista} data-fase={dia.fase} data-hoje={dia.data === hoje} data-passado={dia.data < hoje} aria-haspopup="dialog" onClick={() => abrir(dia)}>
            <span className={s.dataLista}>{dia.data === hoje ? "Hoje" : dataCurta(dia.data)}</span>
            <span className={s.temaLista}>{dia.tema}</span>
            <Progresso dia={dia} />
            <span className={s.seta} aria-hidden="true">›</span>
          </button>
        </li>)}
      </ol>
    </div>

    <dialog ref={dialogo} className={s.dialogo} aria-labelledby="titulo-dia-criativo" onCancel={() => setAberto(null)} onClick={e => { if (e.target === e.currentTarget) setAberto(null); }}>
      {aberto && <div>
        <div className={s.topoDialogo}>
          <span className={s.fase} data-fase={aberto.fase}><span className={s.ponto} aria-hidden="true" />{NOMES_FASES[aberto.fase]}</span>
          <button type="button" className={s.fechar} onClick={() => setAberto(null)} aria-label="Fechar">×</button>
        </div>
        <p className={s.dataDialogo}>{dataLonga(aberto.data)}</p>
        <h2 id="titulo-dia-criativo">{aberto.tema}</h2>
        {aberto.fase === "black-friday" && <p className={s.avisoBlackFriday}>Mantém «Black Friday — em breve». Não anuncies descontos, datas ou preços sem confirmação oficial.</p>}
        {erroMarcar && <p role="alert" className={s.erroMarcar}>{erroMarcar}</p>}
        <div className={s.ideias}>
          {aberto.ideias.map((ideia, i) => {
            const id = idPublicacao(aberto.data, ideia.formato);
            const feito = publicados.includes(id);
            return <article key={ideia.formato} className={s.ideia} data-feito={feito}>
              <header>
                <span className={s.numeroIdeia}>0{i + 1}</span>
                <div><h3>{NOMES_FORMATOS[ideia.formato]}</h3><p>{ideia.objetivo}</p></div>
              </header>
              <dl>{ideia.campos.map(c => <div key={c.rotulo}><dt>{c.rotulo}</dt><dd>{c.texto}</dd></div>)}</dl>
              <div className={s.acoesIdeia}>
                <button type="button" className={s.copiar} onClick={() => void copiar(aberto, ideia)}>{copiado === id ? "✓ Copiado" : "Copiar textos"}</button>
                <button type="button" className={s.publicado} aria-pressed={feito} disabled={estado !== "pronto" || aGuardar !== null} onClick={() => void alternarPublicado(id)}>
                  <span className={s.caixa} aria-hidden="true">{feito && "✓"}</span>
                  {aGuardar === id ? "A guardar…" : feito ? "Publicado" : "Já publiquei"}
                </button>
              </div>
            </article>;
          })}
        </div>
        <nav className={s.navegarDias} aria-label="Outros dias">
          <button type="button" disabled={indiceAberto <= 0} onClick={() => abrir(DIAS_CALENDARIO_CRIATIVO[indiceAberto - 1]!)}>‹ Dia anterior</button>
          <button type="button" disabled={indiceAberto >= DIAS_CALENDARIO_CRIATIVO.length - 1} onClick={() => abrir(DIAS_CALENDARIO_CRIATIVO[indiceAberto + 1]!)}>Dia seguinte ›</button>
        </nav>
      </div>}
    </dialog>
  </section>;
}
