"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {ETAPAS_MENTOR, TOTAL_TAREFAS_MENTOR, type TPMentorado} from "@/lib/mentor-checklist";
import base from "./nova-area.module.css";
import css from "./mentor-checklist.module.css";

const API = "/api/consultor/nova-area/mentor-checklist";
type Filtro = "pendentes" | "concluidos" | "todos";
function dataCurta(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", {timeZone: "Europe/Lisbon"});
}
function estadoTP(tp: TPMentorado) {
  return tp.feitos.length === TOTAL_TAREFAS_MENTOR ? "Concluído" : tp.feitos.length ? "Em acompanhamento" : "Por começar";
}
function Progresso({tp}: {tp: TPMentorado}) {
  return <div className={css.progresso}>
    <div><span>{tp.feitos.length} de {TOTAL_TAREFAS_MENTOR} tarefas</span><strong>{Math.round(tp.feitos.length / TOTAL_TAREFAS_MENTOR * 100)}%</strong></div>
    <progress aria-label={`Progresso de ${tp.nome}`} max={TOTAL_TAREFAS_MENTOR} value={tp.feitos.length}/>
  </div>;
}

export function ChecklistMentor({email}: {email: string}) {
  const [membros, setMembros] = useState<TPMentorado[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendentes"), [pesquisa, setPesquisa] = useState("");
  const [aCarregar, setACarregar] = useState(true), [carregado, setCarregado] = useState(false);
  const [aGuardar, setAGuardar] = useState<string | null>(null), [erro, setErro] = useState(""), [mensagem, setMensagem] = useState("");
  const ocupado = useRef(false), versao = useRef(0), tituloDetalhe = useRef<HTMLHeadingElement>(null);

  const carregar = useCallback(async (signal?: AbortSignal) => {
    if (ocupado.current) return;
    const pedido = ++versao.current;
    setACarregar(true); setErro("");
    try {
      const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "listar"}), signal});
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro || "Não foi possível carregar os teus TPs.");
      if (pedido !== versao.current || signal?.aborted) return;
      setMembros(c.membros); setCarregado(true);
      setSelecionado(atual => atual && c.membros.some((m: TPMentorado) => m.email === atual) ? atual : null);
    } catch (e) {
      if (!signal?.aborted && pedido === versao.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar os teus TPs.");
    } finally {
      if (!signal?.aborted && pedido === versao.current) setACarregar(false);
    }
  }, [email]);
  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    const atualizar = () => {if (document.visibilityState === "visible") void carregar(controller.signal);};
    window.addEventListener("focus", atualizar);
    return () => {controller.abort(); window.removeEventListener("focus", atualizar);};
  }, [carregar]);
  useEffect(() => {if (selecionado) tituloDetalhe.current?.focus();}, [selecionado]);

  async function marcar(tp: TPMentorado, tarefa: string, concluido: boolean) {
    if (ocupado.current) return;
    ocupado.current = true; ++versao.current;
    setAGuardar(tarefa); setACarregar(false); setErro(""); setMensagem("");
    try {
      const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "marcar", tpEmail: tp.email, tarefa, concluido})});
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro || "Não foi possível guardar esta tarefa.");
      setMembros(atuais => atuais.map(m => m.email === tp.email ? {...m, feitos: c.feitos, atualizadoEm: new Date().toISOString()} : m));
      setMensagem(concluido ? "Tarefa concluída e guardada." : "Tarefa desmarcada e guardada.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível guardar. A tarefa mantém o estado anterior.");
    } finally {ocupado.current = false; setAGuardar(null);}
  }

  const tp = membros.find(m => m.email === selecionado);
  const pendentes = membros.filter(m => m.estado === "ACTIVE" && m.feitos.length < TOTAL_TAREFAS_MENTOR).length;
  const concluidos = membros.filter(m => m.feitos.length === TOTAL_TAREFAS_MENTOR).length;
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visiveis = membros.filter(m => (filtro === "todos" || (filtro === "concluidos" ? m.feitos.length === TOTAL_TAREFAS_MENTOR : m.estado === "ACTIVE" && m.feitos.length < TOTAL_TAREFAS_MENTOR))
    && normalizar(`${m.nome} ${m.email}`).includes(normalizar(pesquisa.trim())));

  return <section aria-labelledby="titulo-mentor-checklist">
    <div className={base.intro}>
      <span className={base.etiqueta}>A MINHA ORGANIZAÇÃO</span>
      <h1 id="titulo-mentor-checklist">Tenho um novo TP, e agora?</h1>
      <p>Um bom arranque começa com acompanhamento. Escolhe o Travel Partner e segue o checklist do mentor, um passo de cada vez.</p>
    </div>
    <div className={css.avisos}>
      {erro && <p role="alert" className={css.erro}>{erro}</p>}
      <p role="status" className={css.estado}>{aGuardar ? "A guardar a tarefa…" : mensagem}</p>
    </div>
    {tp ? <>
      <button type="button" className={css.voltar} disabled={!!aGuardar} onClick={() => {setSelecionado(null); setMensagem("");}}>← Voltar aos meus TPs</button>
      <header className={css.detalhe}>
        <div><span className={css.selo}>{estadoTP(tp)}</span><h2 ref={tituloDetalhe} tabIndex={-1}>{tp.nome}</h2><p>{tp.email}</p><small>{tp.dataRegisto ? `Entrou em ${dataCurta(tp.dataRegisto)}` : "Data de entrada ainda não disponível"}</small></div>
        <Progresso tp={tp}/>
      </header>
      <p className={css.nota}>Este checklist é o teu acompanhamento de {tp.nome}. As marcas ficam guardadas e podes desmarcá-las quando precisares.</p>
      <div className={css.etapas}>{ETAPAS_MENTOR.map((etapa, i) => {
        const feitos = etapa.tarefas.filter(t => tp.feitos.includes(t.id)).length;
        return <details key={`${tp.email}:${etapa.id}`} className={css.etapa} open={i === 0}>
          <summary><span className={css.numero} data-feito={feitos === etapa.tarefas.length}>{feitos === etapa.tarefas.length ? "✓" : i + 1}</span><h3>{etapa.titulo}</h3><span className={css.contagem}>{feitos}/{etapa.tarefas.length}</span><span className={css.seta} aria-hidden="true">⌄</span></summary>
          <div className={css.tarefas}>{etapa.tarefas.map(tarefa => <label key={tarefa.id} className={css.tarefa} data-feito={tp.feitos.includes(tarefa.id)}>
            <input type="checkbox" checked={tp.feitos.includes(tarefa.id)} disabled={!!aGuardar} onChange={e => void marcar(tp, tarefa.id, e.target.checked)}/><span>{tarefa.texto}</span>
          </label>)}</div>
        </details>;
      })}</div>
      <p className={css.fonte}>Fonte: Checklist do mentor — Novo Travel Partner · Tropa de Elite.</p>
    </> : <>
      <div className={css.resumo}><div><strong>{pendentes}</strong><span>Por acompanhar</span></div><div><strong>{concluidos}</strong><span>Checklists concluídos</span></div></div>
      <div className={css.ferramentas}>
        <div className={css.filtros} aria-label="Filtrar TPs">{([["pendentes", "Por acompanhar"], ["concluidos", "Concluídos"], ["todos", "Todos"]] as const).map(([valor, texto]) => <button type="button" key={valor} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{texto}</button>)}</div>
        <button type="button" className={css.atualizar} disabled={aCarregar} onClick={() => void carregar()}>{aCarregar ? "A atualizar…" : "Atualizar lista"}</button>
      </div>
      <label className={css.pesquisa}><span>Procurar um TP</span><input type="search" placeholder="Nome ou email" value={pesquisa} onChange={e => setPesquisa(e.target.value)}/></label>
      <p className={css.nota}>Os teus TPs diretos aparecem automaticamente depois de serem adicionados à plataforma e associados a ti na árvore da equipa. Os mais recentes aparecem primeiro.</p>
      {aCarregar && !carregado ? <p role="status">A procurar os teus TPs na equipa…</p> : !carregado ? <div className={css.vazio}><h2>Não foi possível carregar a lista</h2><p>Usa “Atualizar lista” para tentar novamente.</p></div> : visiveis.length ? <div className={css.lista}>{visiveis.map(m => <button type="button" key={m.email} className={css.card} onClick={() => {setSelecionado(m.email); setErro(""); setMensagem("");}} aria-label={`Abrir checklist de ${m.nome}`}>
        <span className={css.selo}>{m.estado === "ACTIVE" ? estadoTP(m) : "Inativo"}</span><h2>{m.nome}</h2><p>{m.email}</p><small>{m.dataRegisto ? `Entrou em ${dataCurta(m.dataRegisto)}` : "Data de entrada ainda não disponível"}</small>
        <Progresso tp={m}/><span className={css.abrir}>Abrir checklist <span aria-hidden="true">→</span></span>
      </button>)}</div> : <div className={css.vazio}><h2>{pesquisa.trim() ? "Não encontrámos esse TP" : filtro === "concluidos" ? "Ainda não há checklists concluídos" : filtro === "pendentes" && membros.length ? "Não tens acompanhamentos por concluir" : "Ainda não há TPs associados a ti"}</h2><p>{pesquisa.trim() ? "Experimenta outro nome ou email." : "Quando um novo consultor estiver associado a ti na árvore da equipa, aparece aqui com o seu próprio checklist."}</p></div>}
    </>}
  </section>;
}
