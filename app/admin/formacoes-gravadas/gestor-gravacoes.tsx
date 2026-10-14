"use client";

import { useRef, useState, type FormEvent } from "react";
import type { GravacaoAdmin } from "@/lib/formacoes-gravadas-servidor";
import css from "./gravadas.module.css";

interface OpcaoCurso {titulo: string; modulos: string[]}
interface OpcaoCategoria {id: string; titulo: string; cursos: OpcaoCurso[]; icligo: OpcaoCurso[]}
const API = "/api/admin/formacoes-gravadas";
const hoje = () => new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Lisbon"}).format(new Date());
const vazia = () => ({titulo: "", link: "", categoria: "essenciais", origem: "tropa-elite" as GravacaoAdmin["origem"], curso: "Sessões ao Vivo da Equipa", modulo: "Novas formações", data: hoje(), min: "", formador: "", visivel: true});

export function GestorGravacoes({iniciais, categorias}: {iniciais: GravacaoAdmin[]; categorias: OpcaoCategoria[]}) {
  const [gravacoes, setGravacoes] = useState(iniciais), [dados, setDados] = useState(vazia);
  const [id, setId] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(""), [mensagem, setMensagem] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const categoria = categorias.find(c => c.id === dados.categoria);
  const cursosBase = dados.origem === "icligo" ? categoria?.icligo ?? [] : categoria?.cursos ?? [];
  const cursos = [...new Set([...cursosBase.map(c => c.titulo), ...gravacoes.filter(g => g.categoria === dados.categoria && g.origem === dados.origem).map(g => g.curso)])];
  const modulos = [...new Set([...(cursosBase.find(c => c.titulo === dados.curso)?.modulos ?? []), ...gravacoes.filter(g => g.categoria === dados.categoria && g.origem === dados.origem && g.curso === dados.curso).map(g => g.modulo)])];
  function campo<K extends keyof typeof dados>(nome: K, valor: typeof dados[K]) {setDados(d => ({...d, [nome]: valor}));}
  async function pedido(method: string, corpo: unknown) {
    const r = await fetch(API, {method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo)});
    const resposta = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(resposta.erro || "Não foi possível guardar. Tenta novamente.");
    return resposta;
  }
  function atualizar(gravacao: GravacaoAdmin) {
    setGravacoes(atuais => [gravacao, ...atuais.filter(g => g.id !== gravacao.id)].sort((a, b) => b.data.localeCompare(a.data)));
  }
  async function guardar(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setErro(""); setMensagem("");
    try {
      const {gravacao} = await pedido("POST", {...dados, ...(id ? {id} : {}), min: dados.min ? Number(dados.min) : null});
      atualizar(gravacao); setDados(vazia()); setId(null);
      setMensagem(gravacao.visivel ? "Gravação guardada e disponível nas formações gravadas dos consultores." : "Gravação guardada como oculta.");
    } catch (e) {setErro(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente.");}
    finally {setOcupado(false);}
  }
  function editar(g: GravacaoAdmin) {
    setId(g.id); setDados({...g, min: g.min === null ? "" : String(g.min)}); setErro(""); setMensagem("");
    formulario.current?.scrollIntoView({behavior: "smooth", block: "start"});
    formulario.current?.querySelector<HTMLInputElement>("input")?.focus({preventScroll: true});
  }
  async function visibilidade(g: GravacaoAdmin) {
    setOcupado(true); setErro(""); setMensagem("");
    try {const {gravacao} = await pedido("POST", {...g, visivel: !g.visivel}); atualizar(gravacao); if (id === g.id) campo("visivel", gravacao.visivel); setMensagem(gravacao.visivel ? "Gravação publicada." : "Gravação ocultada aos consultores.");}
    catch (e) {setErro(e instanceof Error ? e.message : "Falha de ligação.");} finally {setOcupado(false);}
  }
  async function remover(g: GravacaoAdmin) {
    if (!window.confirm(`Remover a gravação “${g.titulo}”?`)) return;
    setOcupado(true); setErro(""); setMensagem("");
    try {await pedido("DELETE", {id: g.id}); setGravacoes(atuais => atuais.filter(a => a.id !== g.id)); if (id === g.id) {setId(null); setDados(vazia());} setMensagem("Gravação removida.");}
    catch (e) {setErro(e instanceof Error ? e.message : "Falha de ligação.");} finally {setOcupado(false);}
  }
  return <>
    {erro && <p role="alert" className={css.erro}>{erro}</p>}
    {mensagem && <p role="status" className={css.sucesso}>{mensagem}</p>}
    <form className={css.cartao} onSubmit={guardar} ref={formulario}>
      <h2>{id ? "Editar gravação" : "Adicionar gravação"}</h2>
      <fieldset disabled={ocupado} className={css.campos}>
        <label>Título da formação<input value={dados.titulo} onChange={e => campo("titulo", e.target.value)} required maxLength={200} placeholder="Ex.: Como preparar uma proposta de viagem" /></label>
        <label>Link da gravação<input type="url" value={dados.link} onChange={e => campo("link", e.target.value)} required maxLength={2048} placeholder="https://www.youtube.com/watch?v=…" /><small>YouTube ou outro link direto para a gravação.</small></label>
        <div className={css.grade}>
          <label>Categoria<select value={dados.categoria} onChange={e => campo("categoria", e.target.value)}>{categorias.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select></label>
          <label>Formação de<select value={dados.origem} onChange={e => campo("origem", e.target.value as GravacaoAdmin["origem"])}><option value="tropa-elite">Tropa de Elite</option><option value="icligo">iCliGo</option></select></label>
          <label>Curso<input list="cursos-gravacoes" value={dados.curso} onChange={e => campo("curso", e.target.value)} required maxLength={160} /><datalist id="cursos-gravacoes">{cursos.map(c => <option value={c} key={c} />)}</datalist><small>Escolhe um existente ou escreve um novo.</small></label>
          <label>Módulo<input list="modulos-gravacoes" value={dados.modulo} onChange={e => campo("modulo", e.target.value)} required maxLength={160} /><datalist id="modulos-gravacoes">{modulos.map(m => <option value={m} key={m} />)}</datalist></label>
          <label>Data da formação<input type="date" value={dados.data} onChange={e => campo("data", e.target.value)} required /></label>
          <label>Duração em minutos (opcional)<input type="number" min={1} max={1440} step={1} value={dados.min} onChange={e => campo("min", e.target.value)} /></label>
        </div>
        <label>Formador (opcional)<input value={dados.formador} onChange={e => campo("formador", e.target.value)} maxLength={160} /></label>
        <label className={css.checkbox}><input type="checkbox" checked={dados.visivel} onChange={e => campo("visivel", e.target.checked)} />Disponível para os consultores</label>
        <div className={css.acoes}><button type="submit">{ocupado ? "A guardar…" : id ? "Guardar alterações" : "Guardar gravação"}</button>{id && <button type="button" className={css.secundario} onClick={() => {setId(null); setDados(vazia());}}>Cancelar edição</button>}</div>
      </fieldset>
    </form>
    <h2>Gravações adicionadas no admin ({gravacoes.length})</h2>
    <p className={css.nota}>As formações que já existiam continuam disponíveis na biblioteca.</p>
    {!gravacoes.length && <p className={css.nota}>Ainda não adicionaste gravações por aqui.</p>}
    <div className={css.lista}>{gravacoes.map(g => <article className={css.item} key={g.id}>
      <div><span className={g.visivel ? css.publicada : css.oculta}>{g.visivel ? "Publicada" : "Oculta"}</span><h3>{g.titulo}</h3>
        <p>{categorias.find(c => c.id === g.categoria)?.titulo} · {g.origem === "icligo" ? "iCliGo" : "Tropa de Elite"} · {g.curso} · {g.modulo}</p>
        <p>{g.data.split("-").reverse().join("/")}{g.min ? ` · ${g.min} min` : ""}{g.formador ? ` · ${g.formador}` : ""}</p>
        <a href={g.link} target="_blank" rel="noopener noreferrer">Abrir gravação ↗</a>
      </div>
      <div className={css.acoes}><button type="button" disabled={ocupado} className={css.secundario} onClick={() => editar(g)}>Editar</button><button type="button" disabled={ocupado} className={css.secundario} onClick={() => void visibilidade(g)}>{g.visivel ? "Ocultar" : "Publicar"}</button><button type="button" disabled={ocupado} className={css.remover} onClick={() => void remover(g)}>Remover</button></div>
    </article>)}</div>
  </>;
}
