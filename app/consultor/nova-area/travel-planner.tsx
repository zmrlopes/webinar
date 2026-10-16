"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import type { DadosReserva } from "@/lib/reservas";
import {
  dataPlanner, diasDaViagem, ESTILOS_PLANNER, INTERESSES_PLANNER, MAX_DIAS_PLANNER, pendentesPlanner, RITMOS_PLANNER, TIPOS_VIAGEM,
  type DiaPlanner, type ResumoPlanner, type TravelPlanner,
} from "@/lib/travel-planner";
import css from "./travel-planner.module.css";

const API = "/api/consultor/nova-area/travel-planner";
const API_RESERVAS = "/api/consultor/nova-area/reservas";
type Passo = "proposta" | "perfil" | "roteiro" | "entregar";
const PASSOS: [Passo, string][] = [["proposta", "1. Proposta"], ["perfil", "2. Perfil"], ["roteiro", "3. Roteiro e dicas"], ["entregar", "4. Entregar"]];
interface Foto { titulo: string; url: string; credito: string }

function Campo({titulo, valor, alterar, tipo = "text", grande = false}: {titulo: string; valor: string | number | null; alterar: (v: string) => void; tipo?: "text" | "date" | "number"; grande?: boolean}) {
  return <label className={css.campo}><span>{titulo}</span>{grande
    ? <textarea value={valor ?? ""} rows={3} onChange={e => alterar(e.target.value)} />
    : <input type={tipo} value={valor ?? ""} min={tipo === "number" ? 1 : undefined} onChange={e => alterar(e.target.value)} />}</label>;
}

function Chip({ativo, onClick, children}: {ativo: boolean; onClick: () => void; children: ReactNode}) {
  return <button type="button" className={ativo ? css.chipAtivo : css.chip} aria-pressed={ativo} onClick={onClick}>{children}</button>;
}

export function TravelPlannerNovaArea({email}: {email: string}) {
  const [lista, setLista] = useState<ResumoPlanner[] | null>(null);
  const [ia, setIa] = useState(false);
  const [p, setP] = useState<TravelPlanner | null>(null);
  const [passo, setPasso] = useState<Passo>("proposta");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [propostas, setPropostas] = useState<DadosReserva[]>([]);
  const [fotos, setFotos] = useState<Foto[] | null>(null);

  async function pedir<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
    const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao, ...extra})});
    const c = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(c.erro ?? "Não foi possível concluir o pedido.");
    return c as T;
  }
  async function executar(mensagem: string, tarefa: () => Promise<void>) {
    setOcupado(mensagem); setErro(""); setAviso("");
    try { await tarefa(); } catch (e) { setErro(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente."); } finally { setOcupado(""); }
  }
  async function carregarLista() {
    const c = await pedir<{planners: ResumoPlanner[]; ia: boolean}>("listar");
    setLista(c.planners); setIa(c.ia);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void executar("A carregar…", carregarLista); }, []);

  async function guardar(atual = p): Promise<TravelPlanner | null> {
    if (!atual) return null;
    const c = await pedir<{planner: TravelPlanner}>("guardar", {planner: atual});
    setP(c.planner);
    return c.planner;
  }
  function irPara(proximo: Passo) {
    void executar("A guardar…", async () => { await guardar(); setPasso(proximo); });
  }

  const alterarViagem = (campo: keyof TravelPlanner["viagem"], valor: string) => setP(atual => atual && {...atual, viagem: {...atual.viagem,
    [campo]: campo === "viajantes" ? (valor ? Math.max(1, Math.round(Number(valor))) || null : null) : valor}});
  const alterarDia = (i: number, campo: keyof DiaPlanner, valor: string) => setP(atual => atual && {...atual, dias: atual.dias.map((d, j) => j === i ? {...d, [campo]: valor} : d)});

  function usarProposta(d: DadosReserva, hotel = 0) {
    const h = d.hoteis[hotel] ?? d.hoteis[0];
    setP(atual => atual && {...atual, viagem: {
      destino: d.destino, partida: d.partida, ida: d.ida, regresso: d.regresso, voo: d.voo, viajantes: d.viajantes,
      bagagem: d.bagagem, transfer: d.transfer, hotel: h?.nome ?? "", quarto: h?.quarto ?? "", regime: h?.regime ?? "",
    }});
    setPropostas([]);
    setAviso("Dados da proposta preenchidos. Confirma e completa o que faltar.");
  }

  function importarPDF(e: ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0];
    e.target.value = "";
    if (!ficheiro) return;
    void executar("A ler a proposta… pode demorar até um minuto.", async () => {
      const form = new FormData(); form.set("email", email); form.set("ficheiro", ficheiro);
      const r = await fetch(API_RESERVAS, {method: "POST", body: form}), c = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível ler o PDF.");
      const lidas = (c.propostas ?? []) as DadosReserva[];
      if (lidas.length === 1 && lidas[0]!.hoteis.length <= 1) usarProposta(lidas[0]!);
      else { setPropostas(lidas); setAviso("Encontrámos várias opções. Escolhe a que o cliente reservou."); }
    });
  }

  function gerar() {
    if (!p) return;
    if (p.dias.some(d => d.manha || d.tarde || d.noite) && !window.confirm("Gerar de novo substitui o roteiro e as dicas atuais. Continuar?")) return;
    void executar("A IA está a preparar o roteiro… pode demorar até um minuto.", async () => {
      const c = await pedir<Pick<TravelPlanner, "dias" | "dicas"> & {emergencia: string}>("gerar", {planner: p});
      await guardar({...p, dias: c.dias, dicas: c.dicas, emergencia: {texto: c.emergencia, confirmado: false}});
      setAviso("Roteiro criado. Revê cada dia e confirma as secções marcadas “A confirmar”.");
    });
  }

  function descarregarPDF() {
    if (!p) return;
    void executar("A criar o PDF…", async () => {
      const guardado = await guardar();
      const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "pdf", id: guardado!.id})});
      if (!r.ok) { const c = await r.json().catch(() => ({})); throw new Error(c.erro ?? "Não foi possível criar o PDF."); }
      const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "travel-planner.pdf";
      const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      setAviso("PDF descarregado. Podes enviá-lo ao cliente por WhatsApp ou email.");
    });
  }

  if (!p) {
    return <section className={css.planner}>
      <div className={css.cabecalho}>
        <div><h2>Travel planner</h2><p>Transforma a proposta reservada num guia da viagem para o cliente: resumo, roteiro dia a dia, dicas e contactos.</p></div>
        <button type="button" className={css.primario} disabled={!!ocupado} onClick={() => void executar("A preparar…", async () => { const c = await pedir<{planner: TravelPlanner}>("novo"); setP(c.planner); setPasso("proposta"); setFotos(null); })}>Novo travel planner</button>
      </div>
      {erro && <p className={css.erro} role="alert">{erro}</p>}
      {ocupado && <p className={css.estado} role="status">{ocupado}</p>}
      {lista && !lista.length && <div className={css.vazio}><strong>Ainda não criaste nenhum travel planner.</strong><p>Começa com o PDF do orçamento ou com os dados da reserva escritos à mão.</p></div>}
      {!!lista?.length && <div className={css.lista}>{lista.map(item => <article key={item.id}>
        <div><h3>{item.nome}</h3><p>{[item.destino, item.ida && dataPlanner(item.ida)].filter(Boolean).join(" · ")} · editado {new Date(item.atualizadoEm).toLocaleDateString("pt-PT")}</p></div>
        <div className={css.acoes}>
          <button type="button" className={css.primario} disabled={!!ocupado} onClick={() => void executar("A abrir…", async () => { const c = await pedir<{planner: TravelPlanner}>("abrir", {id: item.id}); setP(c.planner); setPasso(c.planner.dias.length ? "roteiro" : "proposta"); setFotos(null); })}>Abrir</button>
          <button type="button" className={css.remover} disabled={!!ocupado} onClick={() => { if (window.confirm(`Apagar “${item.nome}”?`)) void executar("A apagar…", async () => { await pedir("apagar", {id: item.id}); await carregarLista(); }); }}>Apagar</button>
        </div>
      </article>)}</div>}
    </section>;
  }

  const total = diasDaViagem(p.viagem.ida, p.viagem.regresso);
  const pendentes = pendentesPlanner(p);

  return <section className={css.planner}>
    <div className={css.cabecalho}>
      <div><h2>{p.nome || (p.viagem.destino ? `Viagem a ${p.viagem.destino}` : "Novo travel planner")}</h2><p>As alterações são guardadas quando mudas de passo.</p></div>
      <button type="button" disabled={!!ocupado} onClick={() => void executar("A guardar…", async () => { await guardar(); setP(null); await carregarLista(); })}>Guardar e voltar à lista</button>
    </div>
    <nav className={css.passos} aria-label="Passos do travel planner">{PASSOS.map(([id, titulo]) =>
      <button key={id} type="button" aria-current={passo === id ? "step" : undefined} className={passo === id ? css.passoAtivo : css.passo} disabled={!!ocupado} onClick={() => irPara(id)}>{titulo}</button>)}</nav>
    {erro && <p className={css.erro} role="alert">{erro}</p>}
    {aviso && <p className={css.sucesso} role="status">{aviso}</p>}
    {ocupado && <p className={css.estado} role="status">{ocupado}</p>}

    <fieldset className={css.painel} disabled={!!ocupado}>
      {passo === "proposta" && <>
        <h3>De onde vem a viagem?</h3>
        <div className={css.origem}>
          <label className={css.ficheiro}>Importar PDF do orçamento<input type="file" accept="application/pdf" onChange={importarPDF} /></label>
          <span>ou preenche os dados à mão aqui em baixo.</span>
        </div>
        {!!propostas.length && <div className={css.escolha}>{propostas.map((d, i) => d.hoteis.map((h, j) =>
          <button type="button" key={`${i}-${j}`} onClick={() => usarProposta(d, j)}><strong>{d.destino || "Proposta"}{h.nome ? ` · ${h.nome}` : ""}</strong><span>{[d.ida && dataPlanner(d.ida), h.regime, h.total ? `${h.total} €` : ""].filter(Boolean).join(" · ")}</span></button>))}</div>}
        <div className={css.grelha}>
          <Campo titulo="Destino" valor={p.viagem.destino} alterar={v => alterarViagem("destino", v)} />
          <Campo titulo="Partida de" valor={p.viagem.partida} alterar={v => alterarViagem("partida", v)} />
          <Campo titulo="Data de ida" tipo="date" valor={p.viagem.ida} alterar={v => alterarViagem("ida", v)} />
          <Campo titulo="Data de regresso" tipo="date" valor={p.viagem.regresso} alterar={v => alterarViagem("regresso", v)} />
          <Campo titulo="Viajantes" tipo="number" valor={p.viagem.viajantes} alterar={v => alterarViagem("viajantes", v)} />
          <Campo titulo="Hotel" valor={p.viagem.hotel} alterar={v => alterarViagem("hotel", v)} />
          <Campo titulo="Quarto" valor={p.viagem.quarto} alterar={v => alterarViagem("quarto", v)} />
          <Campo titulo="Regime" valor={p.viagem.regime} alterar={v => alterarViagem("regime", v)} />
        </div>
        <Campo titulo="Voos (companhia, horários, escalas)" grande valor={p.viagem.voo} alterar={v => alterarViagem("voo", v)} />
        <div className={css.grelha}>
          <Campo titulo="Bagagem" valor={p.viagem.bagagem} alterar={v => alterarViagem("bagagem", v)} />
          <Campo titulo="Transfer" valor={p.viagem.transfer} alterar={v => alterarViagem("transfer", v)} />
        </div>
        <Campo titulo="Nome do travel planner (só para ti)" valor={p.nome} alterar={v => setP({...p, nome: v})} />
        <div className={css.rodape}><button type="button" className={css.primario} disabled={!p.viagem.destino} onClick={() => irPara("perfil")}>Seguinte: perfil da viagem</button></div>
      </>}

      {passo === "perfil" && <>
        <h3>Tipo de viagem</h3>
        <div className={css.chips}>{TIPOS_VIAGEM.map(t => <Chip key={t} ativo={p.perfil.tipo === t} onClick={() => setP({...p, perfil: {...p.perfil, tipo: p.perfil.tipo === t ? "" : t}})}>{t}</Chip>)}</div>
        <h3>Interesses</h3>
        <div className={css.chips}>{INTERESSES_PLANNER.map(t => { const ativo = p.perfil.interesses.includes(t); return <Chip key={t} ativo={ativo} onClick={() => setP({...p, perfil: {...p.perfil, interesses: ativo ? p.perfil.interesses.filter(i => i !== t) : [...p.perfil.interesses, t]}})}>{t}</Chip>; })}</div>
        <h3>Ritmo</h3>
        <div className={css.chips}>{RITMOS_PLANNER.map(r => <Chip key={r.id} ativo={p.perfil.ritmo === r.id} onClick={() => setP({...p, perfil: {...p.perfil, ritmo: r.id}})}>{r.nome}</Chip>)}</div>
        <Campo titulo="Notas para o roteiro (opcional)" grande valor={p.perfil.notas} alterar={v => setP({...p, perfil: {...p.perfil, notas: v}})} />
        <p className={css.ajuda}>Ex.: “aniversário no dia 3”, “crianças de 4 e 8 anos”, “não querem acordar cedo”, “já conhecem a cidade”.</p>
        <div className={css.rodape}><button type="button" onClick={() => irPara("proposta")}>Anterior</button><button type="button" className={css.primario} onClick={() => irPara("roteiro")}>Seguinte: roteiro</button></div>
      </>}

      {passo === "roteiro" && <>
        <div className={css.tituloLinha}>
          <h3>Roteiro dia a dia {total ? `(${total} dias)` : ""}</h3>
          <button type="button" className={css.primario} disabled={!ia || !total || total > MAX_DIAS_PLANNER} onClick={gerar}>{p.dias.length ? "Gerar de novo com IA" : "Gerar roteiro com IA"}</button>
        </div>
        {!total && <p className={css.ajuda}>Indica as datas de ida e regresso no passo 1 para a IA saber quantos dias tem a viagem.</p>}
        {!ia && <p className={css.ajuda}>A IA ainda não está configurada. Podes escrever os dias à mão.</p>}
        {p.dias.map((d, i) => <article key={i} className={css.dia}>
          <div className={css.tituloLinha}>
            <strong>Dia {i + 1}{p.viagem.ida ? ` · ${dataPlanner(new Date(Date.parse(`${p.viagem.ida}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), {weekday: "short", day: "numeric", month: "short"})}` : ""}</strong>
            <button type="button" className={css.remover} onClick={() => setP({...p, dias: p.dias.filter((_, j) => j !== i)})}>Remover dia</button>
          </div>
          <Campo titulo="Título do dia" valor={d.titulo} alterar={v => alterarDia(i, "titulo", v)} />
          <div className={css.grelha3}>
            <Campo titulo="Manhã" grande valor={d.manha} alterar={v => alterarDia(i, "manha", v)} />
            <Campo titulo="Tarde" grande valor={d.tarde} alterar={v => alterarDia(i, "tarde", v)} />
            <Campo titulo="Noite" grande valor={d.noite} alterar={v => alterarDia(i, "noite", v)} />
          </div>
        </article>)}
        {p.dias.length < MAX_DIAS_PLANNER && <button type="button" onClick={() => setP({...p, dias: [...p.dias, {titulo: "", manha: "", tarde: "", noite: ""}]})}>+ Acrescentar dia</button>}

        <h3>Dicas práticas</h3>
        {!p.dicas.length && <p className={css.ajuda}>As dicas aparecem aqui depois de gerar o roteiro com IA.</p>}
        {p.dicas.map((d, i) => <article key={i} className={d.sensivel && !d.confirmado ? css.dicaPendente : css.dica}>
          <div className={css.tituloLinha}>
            <strong>{d.titulo}</strong>
            {d.sensivel && <span className={d.confirmado ? css.etiquetaOk : css.etiqueta}>{d.confirmado ? "Confirmado" : "A confirmar"}</span>}
          </div>
          <textarea rows={4} value={d.texto} aria-label={d.titulo} onChange={e => setP({...p, dicas: p.dicas.map((x, j) => j === i ? {...x, texto: e.target.value} : x)})} />
          {d.sensivel && <label className={css.confirmar}><input type="checkbox" checked={d.confirmado} onChange={e => setP({...p, dicas: p.dicas.map((x, j) => j === i ? {...x, confirmado: e.target.checked} : x)})} /> Confirmei esta informação nas fontes oficiais</label>}
        </article>)}

        <h3>Emergência no destino</h3>
        <article className={p.emergencia.texto && !p.emergencia.confirmado ? css.dicaPendente : css.dica}>
          <textarea rows={3} value={p.emergencia.texto} aria-label="Emergência no destino" onChange={e => setP({...p, emergencia: {...p.emergencia, texto: e.target.value}})} />
          {p.emergencia.texto && <label className={css.confirmar}><input type="checkbox" checked={p.emergencia.confirmado} onChange={e => setP({...p, emergencia: {...p.emergencia, confirmado: e.target.checked}})} /> Confirmei os números e a morada da embaixada</label>}
        </article>
        <div className={css.rodape}><button type="button" onClick={() => irPara("perfil")}>Anterior</button><button type="button" className={css.primario} onClick={() => irPara("entregar")}>Seguinte: entregar</button></div>
      </>}

      {passo === "entregar" && <>
        <h3>Estilo</h3>
        <div className={css.estilos}>{ESTILOS_PLANNER.map(e => <button type="button" key={e.id} aria-pressed={p.estilo === e.id} className={p.estilo === e.id ? css.estiloAtivo : css.estilo} onClick={() => setP({...p, estilo: e.id})}>
          <span className={css[`amostra_${e.id}`]} aria-hidden="true" /><strong>{e.nome}</strong><small>{e.descricao}</small></button>)}</div>

        <div className={css.tituloLinha}>
          <h3>Fotografia da capa</h3>
          <button type="button" disabled={!p.viagem.destino} onClick={() => void executar("A procurar fotografias…", async () => { const c = await pedir<{fotografias: Foto[]}>("fotografias", {destino: p.viagem.destino}); setFotos(c.fotografias); })}>Procurar fotografias de {p.viagem.destino || "destino"}</button>
        </div>
        {fotos && !fotos.length && <p className={css.ajuda}>Não encontrámos fotografias livres para este destino. O PDF sai sem fotografia na capa.</p>}
        {!!fotos?.length && <div className={css.fotos}>{fotos.map(f => <button type="button" key={f.url} aria-pressed={p.foto?.url === f.url} className={p.foto?.url === f.url ? css.fotoAtiva : css.foto} onClick={() => setP({...p, foto: {url: f.url, credito: f.credito}})}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.url} alt={f.titulo} loading="lazy" /></button>)}</div>}
        {p.foto && <p className={css.ajuda}>Fotografia escolhida · {p.foto.credito} <button type="button" className={css.ligacao} onClick={() => setP({...p, foto: null})}>Retirar</button></p>}

        <h3>Descarregar</h3>
        {pendentes.length > 0
          ? <p className={css.erro}>Antes de entregar ao cliente, confirma no passo 3: {pendentes.join(", ")}.</p>
          : <p className={css.ajuda}>O PDF inclui capa, resumo da viagem, roteiro, dicas e contactos, com o teu nome e email.</p>}
        <div className={css.rodape}>
          <button type="button" onClick={() => irPara("roteiro")}>Anterior</button>
          <button type="button" className={css.primario} disabled={pendentes.length > 0} onClick={descarregarPDF}>Descarregar PDF</button>
        </div>
        <p className={css.ajuda}>Em breve: link para o cliente abrir no telemóvel e imagens para WhatsApp/Stories.</p>
      </>}
    </fieldset>
  </section>;
}
