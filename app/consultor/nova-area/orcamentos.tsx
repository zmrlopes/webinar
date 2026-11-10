"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diaEmPortugal } from "@/lib/calendario-consultor";
import {
  CANAIS_ORCAMENTO, ESTADOS_FECHADOS_ORCAMENTO, ESTADOS_ORCAMENTO, nomeEstadoOrcamento, pedidoOrcamentoVazio, pedidoPendenteHoje,
  PRIORIDADES_ORCAMENTO, REGIMES_ORCAMENTO, TIPOS_VIAGEM_ORCAMENTO,
  type DadosPedidoOrcamento, type EstadoOrcamento, type PedidoOrcamento,
} from "@/lib/orcamentos";
import s from "./orcamentos.module.css";

const API = "/api/consultor/nova-area/orcamentos";

function adicionarDias(base: string, dias: number): string {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function dataCurta(data: string): string {
  if (!data) return "";
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
}
function euro(n: number | null): string {
  return (n ?? 0).toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " €";
}

type Filtro = "todos" | "hoje" | EstadoOrcamento;
type Ficha = { id: string | null; dados: DadosPedidoOrcamento };

export function PedidosOrcamentoNovaArea({ email }: { email: string }) {
  const hoje = diaEmPortugal();
  const [pedidos, setPedidos] = useState<PedidoOrcamento[] | null>(null);
  const [estadoLista, setEstadoLista] = useState<"carregar" | "pronto" | "erro">("carregar");
  const [erroLista, setErroLista] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [procura, setProcura] = useState("");
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erroFicha, setErroFicha] = useState("");
  const [aApagar, setAApagar] = useState(false);
  const [aviso, setAviso] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setEstadoLista("carregar");
    void fetch(API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, acao: "listar" }), signal: controller.signal,
    }).then(async resposta => {
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível carregar os teus pedidos.");
      if (controller.signal.aborted) return;
      setPedidos(corpo.pedidos);
      setEstadoLista("pronto");
    }).catch(falha => {
      if (controller.signal.aborted) return;
      setErroLista(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
      setEstadoLista("erro");
    });
    return () => controller.abort();
  }, [email, tentativa]);

  useEffect(() => {
    if (ficha && !dialogo.current?.open) dialogo.current?.showModal();
    if (!ficha && dialogo.current?.open) dialogo.current.close();
  }, [ficha]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  const todos = pedidos ?? [];
  const aguardamHoje = useMemo(
    () => todos.filter(p => pedidoPendenteHoje(p, hoje)).sort((a, b) => a.proximo.localeCompare(b.proximo)),
    [todos, hoje],
  );
  const estatisticas = useMemo(() => {
    const enviados = todos.filter(p => p.enviadoEm || ["enviado", "acompanhamento", "alteracoes", "reservado"].includes(p.estado)).length;
    const reservados = todos.filter(p => p.estado === "reservado");
    return { total: todos.length, enviados, reservados: reservados.length, valor: reservados.reduce((soma, p) => soma + (p.valor ?? 0), 0) };
  }, [todos]);

  const lista = useMemo(() => {
    const termo = procura.trim().toLowerCase();
    const filtrados = todos.filter(p => {
      if (filtro === "hoje" && !pedidoPendenteHoje(p, hoje)) return false;
      if (filtro !== "todos" && filtro !== "hoje" && p.estado !== filtro) return false;
      if (termo && !`${p.nome} ${p.destino}`.toLowerCase().includes(termo)) return false;
      return true;
    });
    return filtrados.sort((a, b) => {
      const fa = ESTADOS_FECHADOS_ORCAMENTO.has(a.estado), fb = ESTADOS_FECHADOS_ORCAMENTO.has(b.estado);
      if (fa !== fb) return fa ? 1 : -1;
      if (a.proximo && b.proximo && a.proximo !== b.proximo) return a.proximo.localeCompare(b.proximo);
      if (a.proximo && !b.proximo) return -1;
      if (!a.proximo && b.proximo) return 1;
      return b.atualizadoEm.localeCompare(a.atualizadoEm);
    });
  }, [todos, filtro, procura, hoje]);

  function abrirNovo() {
    setErroFicha("");
    setAApagar(false);
    setFicha({ id: null, dados: pedidoOrcamentoVazio() });
  }
  function abrirExistente(p: PedidoOrcamento) {
    setErroFicha("");
    setAApagar(false);
    setFicha({ id: p.id, dados: p });
  }
  function fechar() { setFicha(null); }
  function alterar<K extends keyof DadosPedidoOrcamento>(campo: K, valor: DadosPedidoOrcamento[K]) {
    setFicha(f => f && { ...f, dados: { ...f.dados, [campo]: valor } });
  }
  function definirEstado(estado: EstadoOrcamento) {
    setFicha(f => {
      if (!f) return f;
      let dados = { ...f.dados, estado };
      if (estado === "enviado" && !dados.enviadoEm) dados = { ...dados, enviadoEm: hoje, proximo: dados.proximo || adicionarDias(hoje, 1) };
      return { ...f, dados };
    });
  }

  async function guardar() {
    if (!ficha || aGuardar) return;
    if (!ficha.dados.nome.trim() || !ficha.dados.destino.trim()) { setErroFicha("Preenche pelo menos o nome e o destino."); return; }
    setAGuardar(true); setErroFicha("");
    try {
      const corpo: Record<string, unknown> = { email, acao: "guardar", pedido: { ...ficha.dados, id: ficha.id ?? undefined } };
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível guardar.");
      const pedido = c.pedido as PedidoOrcamento;
      setPedidos(atual => {
        const outros = (atual ?? []).filter(p => p.id !== pedido.id);
        return [pedido, ...outros];
      });
      setFicha(null);
      setAviso("Pedido guardado.");
    } catch (e) { setErroFicha(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente."); }
    finally { setAGuardar(false); }
  }
  async function apagar() {
    if (!ficha?.id || aApagar) return;
    if (!window.confirm(`Apagar o pedido de ${ficha.dados.nome || "este cliente"}? Não se pode desfazer.`)) return;
    setAApagar(true); setErroFicha("");
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, acao: "apagar", id: ficha.id }) });
      const c = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível apagar.");
      setPedidos(atual => (atual ?? []).filter(p => p.id !== ficha.id));
      setFicha(null);
      setAviso("Pedido apagado.");
    } catch (e) { setErroFicha(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente."); }
    finally { setAApagar(false); }
  }

  function exportar() {
    if (!todos.length) { setAviso("Ainda não há pedidos para exportar."); return; }
    const colunas: [keyof PedidoOrcamento, string][] = [
      ["nome", "Nome"], ["contacto", "Contacto"], ["canal", "Como chegou"], ["destino", "Destino"], ["partida", "Partida"], ["datas", "Datas"],
      ["noites", "Noites"], ["adultos", "Adultos"], ["criancas", "Crianças"], ["regime", "Regime"], ["plafond", "Plafond por pessoa"], ["tipo", "Tipo"],
      ["prioridade", "Prioridade"], ["estado", "Estado"], ["enviadoEm", "Orçamento enviado em"], ["proximo", "Próximo contacto"], ["valor", "Valor reserva"], ["notas", "Notas"],
    ];
    const escapar = (v: unknown) => { const t = v == null ? "" : String(v); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const linhas = [colunas.map(([, titulo]) => titulo).join(";"), ...todos.map(p => colunas.map(([campo]) => escapar(campo === "estado" ? nomeEstadoOrcamento(p.estado) : p[campo])).join(";"))];
    const csv = "﻿" + linhas.join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `pedidos-orcamento-${hoje}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const CHIPS: { chave: Filtro; titulo: string }[] = [{ chave: "todos", titulo: "Todos" }, { chave: "hoje", titulo: "Para hoje" },
    ...ESTADOS_ORCAMENTO.map(e => ({ chave: e.chave as Filtro, titulo: e.titulo }))];
  const contagem = (c: Filtro) => c === "todos" ? todos.length : c === "hoje" ? aguardamHoje.length : todos.filter(p => p.estado === c).length;

  return <section className={s.raiz} aria-label="Pedidos de orçamento">
    <div className={s.cabecalho}>
      <div><span className={s.etiqueta}>RESERVAS</span><h1>Pedidos de orçamento</h1><p>Regista cada pedido assim que chega e acompanha-o até à reserva.</p></div>
      <button type="button" className={s.ghost} onClick={exportar}>Exportar</button>
    </div>

    {estadoLista === "erro" && <div className={s.erro} role="alert"><p>{erroLista}</p><button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>}
    {aviso && <p className={s.sucesso} role="status">{aviso}</p>}

    <section className={s.hoje} aria-live="polite">
      <div className={s.contagem}>{aguardamHoje.length}</div>
      <div className={s.rotuloHoje}>{aguardamHoje.length === 1 ? "cliente para acompanhar hoje" : "clientes para acompanhar hoje"}</div>
      <p className={s.dica}>Pede feedback 24 horas depois de enviares o orçamento e volta a falar a cada 2 a 3 dias até fechar.</p>
      {!!aguardamHoje.length && <ul className={s.listaHoje}>{aguardamHoje.slice(0, 5).map(p => <li key={p.id}>
        <button type="button" onClick={() => abrirExistente(p)}>
          <span>{p.nome || "Sem nome"} · {p.destino}</span>
          <span className={s.quando}>{p.proximo < hoje ? "atrasado" : "hoje"}</span>
        </button>
      </li>)}</ul>}
    </section>

    <div className={s.estatisticas}>
      <div className={s.estatistica}><b>{estatisticas.total}</b><span>pedidos</span></div>
      <div className={s.estatistica}><b>{estatisticas.enviados}</b><span>orçamentos enviados</span></div>
      <div className={s.estatistica}><b>{estatisticas.reservados}</b><span>reservas</span></div>
      <div className={s.estatistica}><b>{euro(estatisticas.valor)}</b><span>valor reservado</span></div>
    </div>

    <div className={s.barraFerramentas}>
      <input className={s.procura} type="search" placeholder="Procurar por nome ou destino" aria-label="Procurar por nome ou destino" value={procura} onChange={e => setProcura(e.target.value)} />
      <div className={s.chips} role="group" aria-label="Filtrar por estado">
        {CHIPS.map(c => <button key={c.chave} type="button" className={s.chip} aria-pressed={filtro === c.chave} onClick={() => setFiltro(c.chave)}>{c.titulo} ({contagem(c.chave)})</button>)}
      </div>
    </div>

    {estadoLista === "carregar" && <p className={s.nota}>A carregar os teus pedidos…</p>}
    {estadoLista === "pronto" && !todos.length && <div className={s.vazio}><h2>Ainda não tens pedidos registados</h2><p>Regista aqui cada pedido assim que chega, mesmo que ainda não tenhas todos os dados.</p></div>}
    {estadoLista === "pronto" && !!todos.length && !lista.length && <div className={s.vazio}><p>Nenhum pedido neste filtro.</p></div>}
    {!!lista.length && <div className={s.lista}>{lista.map(p => {
      const pendente = pedidoPendenteHoje(p, hoje);
      const pax = [p.adultos ? `${p.adultos} ad.` : "", p.criancas ? `${p.criancas} cr.` : ""].filter(Boolean).join(" + ");
      return <button key={p.id} type="button" className={s.ticket} onClick={() => abrirExistente(p)} aria-label={`${p.destino}, ${p.nome}, ${nomeEstadoOrcamento(p.estado)}`}>
        <div className={s.principal}>
          <div className={s.destino}>{p.destino || "Destino por definir"}</div>
          <div className={s.quem}>{[p.nome, p.canal].filter(Boolean).join(" · ")}</div>
          <div className={s.meta}>
            {!!p.partida && <span>✈ {p.partida}</span>}
            {!!p.datas && <span>📅 {p.datas}</span>}
            {!!pax && <span>👥 {pax}</span>}
            {!!p.noites && <span>{p.noites} noites</span>}
            {!!p.regime && <span>{p.regime}</span>}
            {!!p.tipo && <span>{p.tipo}</span>}
          </div>
        </div>
        <div className={s.talao}>
          <div className={s.plafond}>{p.plafond ? euro(p.plafond) : "—"}<small>por pessoa</small></div>
          <span className={s.pilula} data-estado={p.estado}>{nomeEstadoOrcamento(p.estado)}</span>
          {pendente ? <span className={s.atrasado}>{p.proximo < hoje ? "Contacto atrasado" : "Contactar hoje"}</span>
            : p.proximo && !ESTADOS_FECHADOS_ORCAMENTO.has(p.estado) ? <span className={s.proximo}>Próx.: {dataCurta(p.proximo)}</span> : null}
        </div>
      </button>;
    })}</div>}

    <button type="button" className={s.novo} onClick={abrirNovo}>+ Novo pedido</button>

    <dialog ref={dialogo} className={s.sheet} aria-labelledby="titulo-ficha-orcamento" onCancel={fechar} onClick={e => { if (e.target === e.currentTarget) fechar(); }}>
      {ficha && <form onSubmit={e => { e.preventDefault(); void guardar(); }}>
        <h2 id="titulo-ficha-orcamento">{ficha.id ? "Editar pedido" : "Novo pedido"}</h2>
        <p className={s.subtitulo}>Os campos com * são obrigatórios. O resto podes preencher depois.</p>

        <fieldset disabled={aGuardar || aApagar}>
          <legend>Cliente</legend>
          <div className={s.grelha}>
            <label><span className={s.obrigatorio}>Nome</span><input value={ficha.dados.nome} onChange={e => alterar("nome", e.target.value)} /></label>
            <label>Contacto<input value={ficha.dados.contacto} placeholder="Telemóvel ou email" onChange={e => alterar("contacto", e.target.value)} /></label>
            <label>Como chegou
              <select value={ficha.dados.canal} onChange={e => alterar("canal", e.target.value)}><option value="" />{CANAIS_ORCAMENTO.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </label>
            <label>Prioridade
              <select value={ficha.dados.prioridade} onChange={e => alterar("prioridade", e.target.value as typeof ficha.dados.prioridade)}>{PRIORIDADES_ORCAMENTO.map(p => <option key={p} value={p}>{p}</option>)}</select>
            </label>
          </div>
        </fieldset>

        <fieldset disabled={aGuardar || aApagar}>
          <legend>Viagem</legend>
          <div className={s.grelha}>
            <label><span className={s.obrigatorio}>Destino</span><input value={ficha.dados.destino} placeholder="Ex.: Punta Cana" onChange={e => alterar("destino", e.target.value)} /></label>
            <label>Partida (aeroporto)<input value={ficha.dados.partida} placeholder="Ex.: Porto" onChange={e => alterar("partida", e.target.value)} /></label>
            <label>Datas ou intervalo<input value={ficha.dados.datas} placeholder="Ex.: julho, 2.ª quinzena" onChange={e => alterar("datas", e.target.value)} /></label>
            <label>N.º de noites<input type="number" min={0} value={ficha.dados.noites ?? ""} onChange={e => alterar("noites", e.target.value === "" ? null : Number(e.target.value))} /></label>
            <label>Adultos<input type="number" min={0} value={ficha.dados.adultos ?? ""} onChange={e => alterar("adultos", e.target.value === "" ? null : Number(e.target.value))} /></label>
            <label>Crianças (e idades)<input value={ficha.dados.criancas} placeholder="Ex.: 2 (4 e 7 anos)" onChange={e => alterar("criancas", e.target.value)} /></label>
            <label>Regime
              <select value={ficha.dados.regime} onChange={e => alterar("regime", e.target.value)}><option value="" />{REGIMES_ORCAMENTO.map(r => <option key={r} value={r}>{r}</option>)}</select>
            </label>
            <label>Plafond por pessoa (€)<input type="number" min={0} value={ficha.dados.plafond ?? ""} onChange={e => alterar("plafond", e.target.value === "" ? null : Number(e.target.value))} /></label>
            <label className={s.completo}>Tipo de viagem
              <select value={ficha.dados.tipo} onChange={e => alterar("tipo", e.target.value)}><option value="" />{TIPOS_VIAGEM_ORCAMENTO.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </label>
          </div>
        </fieldset>

        <fieldset disabled={aGuardar || aApagar}>
          <legend>Estado</legend>
          <div className={s.estados} role="group" aria-label="Estado do pedido">
            {ESTADOS_ORCAMENTO.map(e => <button key={e.chave} type="button" aria-pressed={ficha.dados.estado === e.chave} onClick={() => definirEstado(e.chave)}>{e.titulo}</button>)}
          </div>
          {!ESTADOS_FECHADOS_ORCAMENTO.has(ficha.dados.estado) && <div className={s.rapido}>
            <button type="button" onClick={() => { alterar("enviadoEm", hoje); alterar("proximo", adicionarDias(hoje, 1)); definirEstado("enviado"); }}>Enviei o orçamento hoje</button>
            <button type="button" onClick={() => { alterar("proximo", adicionarDias(hoje, 3)); if (ficha.dados.estado === "novo" || ficha.dados.estado === "enviado") definirEstado("acompanhamento"); }}>Falei hoje · próximo em 3 dias</button>
          </div>}
          <div className={s.grelha} style={{ marginTop: 12 }}>
            <label>Orçamento enviado em<input type="date" value={ficha.dados.enviadoEm} onChange={e => alterar("enviadoEm", e.target.value)} /></label>
            <label>Próximo contacto<input type="date" value={ficha.dados.proximo} onChange={e => alterar("proximo", e.target.value)} /></label>
            {ficha.dados.estado === "reservado" && <label className={s.completo}>Valor da reserva (€)<input type="number" min={0} value={ficha.dados.valor ?? ""} onChange={e => alterar("valor", e.target.value === "" ? null : Number(e.target.value))} /></label>}
            <label className={s.completo}>Notas<textarea value={ficha.dados.notas} placeholder="Ex.: prefere hotel adults only, decide com o marido" onChange={e => alterar("notas", e.target.value)} /></label>
          </div>
        </fieldset>

        <div className={s.erroFicha} role="alert">{erroFicha}</div>
        <div className={s.acoes}>
          {ficha.id && <button type="button" className={s.perigo} disabled={aGuardar || aApagar} onClick={() => void apagar()}>{aApagar ? "A apagar…" : "Apagar pedido"}</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className={s.ghost} disabled={aGuardar || aApagar} onClick={fechar}>Cancelar</button>
          <button type="submit" className={s.primario} disabled={aGuardar || aApagar}>{aGuardar ? "A guardar…" : "Guardar pedido"}</button>
        </div>
      </form>}
    </dialog>
  </section>;
}
