"use client";
import { useEffect, useRef, useState } from "react";
import { favoritoFAQs } from "@/lib/operadores-favorito";
import type { CatalogoOperadores } from "@/lib/operadores-destinos";
import s from "./painel.module.css";

interface Estado {catalogo: CatalogoOperadores; historico: {id: string; criado_em: string; publicado_em?: string; concluidos: string[]}[]}
interface Revisao {id: string; criadoEm: string; publicadoEm?: string; completo: boolean; etapasPendentes: string[]; diferencas: {nome: string; antes: unknown; depois: unknown}[]; fontes: {url: string; texto: string; imagens: number}[]}
const API = "/api/admin/operadores";
async function pedir<T>(corpo?: object): Promise<T> {
  const r = await fetch(API, corpo ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo)} : {cache: "no-store"});
  const v = await r.json(); if (!r.ok) throw new Error(v.erro ?? "Pedido não concluído."); return v;
}
const data = (v: string) => new Date(v).toLocaleString("pt-PT", {timeZone: "Europe/Lisbon"});
export default function PainelFAQs() {
  const [estado, setEstado] = useState<Estado>(), [revisao, setRevisao] = useState<Revisao>(), [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState(""), [erro, setErro] = useState(""), [confirmado, setConfirmado] = useState(false);
  const [codigoFavorito, setCodigoFavorito] = useState("");
  const favorito = useRef<HTMLAnchorElement>(null), nonce = useRef(""), aRecolher = useRef(false), timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  async function carregar() {setEstado(await pedir<Estado>());}
  useEffect(() => {
    const codigo = favoritoFAQs(window.location.origin);
    favorito.current?.setAttribute("href", codigo);
    setCodigoFavorito(codigo);
    void carregar().catch(e => setErro(e.message));
    return () => clearTimeout(timeout.current);
  }, []);
  useEffect(() => {
    async function receber(e: MessageEvent) {
      if (e.origin !== "https://help.icligo.com" || e.source !== window.opener || !nonce.current || e.data?.nonce !== nonce.current || !aRecolher.current) return;
      if (e.data.tipo === "faq-progresso") {setMensagem(e.data.texto); return;}
      if (!["faq-erro", "faq-paginas"].includes(e.data.tipo)) return;
      clearTimeout(timeout.current); nonce.current = ""; aRecolher.current = false;
      try {
        if (e.data.tipo === "faq-erro") throw new Error(e.data.erro);
        setMensagem("A guardar a recolha…");
        const r = await pedir<{id: string; etapas: string[]}>({acao: "recolher", paginas: e.data.paginas});
        await analisar(r.id, r.etapas);
      } catch (e) {setErro((e as Error).message);} finally {setOcupado(false);}
    }
    window.addEventListener("message", receber);
    return () => window.removeEventListener("message", receber);
  }, []);
  async function analisar(id: string, etapas: string[]) {
    try {
      for (let i = 0; i < etapas.length; i++) {
        setMensagem(`A analisar ${etapas[i]} (${i+1}/${etapas.length})… Podes retomar pelo histórico se houver uma falha.`);
        await pedir({acao: "analisar", id, etapa: etapas[i]});
      }
      setMensagem("Recolha analisada. Revê as alterações e as fontes antes de publicar.");
    } finally {await abrir(id); await carregar();}
  }
  function recolher() {
    if (!estado || ocupado) return;
    setErro(""); setConfirmado(false); setRevisao(undefined);
    if (!window.opener) {setErro("Abre esta página através do favorito no Centro de Ajuda para recolher as FAQs."); return;}
    setOcupado(true); aRecolher.current = true; nonce.current = crypto.randomUUID();
    setMensagem("A contactar o Centro de Ajuda…");
    window.opener.postMessage({tipo: "faq-recolher", nonce: nonce.current, urls: ["https://help.icligo.com/suporte-operacional/operadores-turisticos", ...estado.catalogo.operadores.map(o => o.faq)]}, "https://help.icligo.com");
    timeout.current = setTimeout(() => {nonce.current=""; aRecolher.current=false; setOcupado(false); setErro("A recolha não respondeu a tempo. Volta ao Centro de Ajuda e clica novamente no favorito.");}, 600000);
  }
  async function abrir(id: string) {setConfirmado(false); setRevisao(await pedir<Revisao>({acao:"rever",id}));}
  async function acao(fn: () => Promise<void>) {setOcupado(true); setErro(""); try {await fn();} catch(e) {setErro((e as Error).message);} finally {setOcupado(false);}}
  async function copiarFavorito() {
    try {await navigator.clipboard.writeText(codigoFavorito); setMensagem("Endereço copiado. Edita o favorito e cola-o no campo URL/endereço, substituindo tudo o que lá estiver.");}
    catch {setErro("Seleciona e copia o endereço na caixa abaixo. Depois cola-o no campo URL/endereço do favorito.");}
  }
  return <main className={s.pagina}>
    <h1>Atualizar FAQs · Onde posso vender?</h1>
    <p>Última revisão publicada: <strong>{estado?.catalogo.revistoEm ?? "A carregar…"}</strong>. A atualização é independente dos números do MyOffice.</p>
    <section><h2>1. Recolher no Centro de Ajuda</h2>
      <ol><li>Arrasta este botão para a barra de favoritos: <a ref={favorito} className={s.favorito} href="#" draggable onDragStart={e=>{e.dataTransfer.setData("text/uri-list",codigoFavorito);e.dataTransfer.setData("text/plain",codigoFavorito);}} onClick={e=>{e.preventDefault();setMensagem("Arrasta este botão para a barra de favoritos ou usa a instalação manual abaixo. Depois executa o favorito no Centro de Ajuda.");}}>Instalar favorito FAQs</a>. Usa este botão dentro das instruções.</li>
      <li>Abre o <a href="https://help.icligo.com/suporte-operacional/operadores-turisticos" target="_blank" rel="noreferrer">Centro de Ajuda iCliGo</a> e entra na tua conta.</li>
      <li>Clica no favorito. Nesta janela, inicia a recolha e aguarda a análise.</li></ol>
      <details open><summary>Instalar ou corrigir o favorito manualmente</summary>
        <ol><li>Cria um favorito qualquer e escolhe “Editar”.</li><li>No nome escreve “Atualizar FAQs”.</li><li>Copia o endereço abaixo e cola-o no campo URL/endereço do favorito, substituindo todo o conteúdo. Deve começar por <code>javascript:</code>.</li><li>Guarda, abre o Centro de Ajuda com a sessão iniciada e clica no favorito guardado. Deve aparecer o aviso “Favorito FAQs ativo” e abrir a janela de atualização.</li></ol>
        <button disabled={!codigoFavorito} onClick={()=>void copiarFavorito()}>Copiar endereço do favorito</button>
        <label htmlFor="faq-favorito">Endereço completo do favorito</label>
        <textarea id="faq-favorito" className={s.codigo} readOnly value={codigoFavorito} rows={3} spellCheck={false} onFocus={e=>e.currentTarget.select()} />
        <p>Se guardaste o link do menu ou usaste a estrela do navegador, o favorito pode conter apenas o endereço desta página. Nesse caso, substitui-o pelo código acima.</p>
      </details>
      <p>A sessão permanece no Centro de Ajuda. São recolhidos apenas os textos e imagens das FAQs dos operadores. A análise usa o serviço de IA já configurado na plataforma.</p>
      <button disabled={ocupado || !estado} onClick={recolher}>Recolher e comparar FAQs</button>
    </section>
    <p role="status" aria-live="polite">{mensagem}</p>{erro && <p role="alert" className={s.erro}>{erro}</p>}
    {revisao && <section><h2>2. Rever alterações</h2><p>Recolha de {data(revisao.criadoEm)} · {revisao.completo ? "Análise completa" : "Análise por concluir"}</p>
      {revisao.etapasPendentes.length > 0 && <button disabled={ocupado} onClick={()=>void acao(()=>analisar(revisao.id,revisao.etapasPendentes))}>Retomar análise</button>}
      <p>{revisao.diferencas.length} campos com diferenças. As linhas incluem destinos, partidas, datas e condições.</p>
      {revisao.diferencas.map(d=><details key={d.nome}><summary>{d.nome}</summary><div className={s.colunas}><div>Publicado<pre>{JSON.stringify(d.antes,null,2)}</pre></div><div>Proposto<pre>{JSON.stringify(d.depois,null,2)}</pre></div></div></details>)}
      <h3>Fontes recolhidas</h3>{revisao.fontes.map(f=><details key={f.url}><summary>{f.url.split("/").pop()} · {f.imagens} imagens</summary><a href={f.url} target="_blank" rel="noreferrer">Abrir original</a><pre>{f.texto}</pre></details>)}
      {!revisao.publicadoEm && revisao.completo && <><label><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/>Revi as diferenças e confirmei as regras nas fontes originais.</label>
      <button disabled={ocupado || !confirmado} onClick={()=>void acao(async()=>{await pedir({acao:"publicar",id:revisao.id});setMensagem("FAQs publicadas. A pesquisa já usa a nova versão.");await abrir(revisao.id);await carregar();})}>Confirmar e publicar FAQs</button></>}
      {revisao.publicadoEm && <p>Publicada em {data(revisao.publicadoEm)}.</p>}
    </section>}
    <h2>Histórico de recolhas</h2>{estado?.historico.length === 0 && <p>Ainda não existem recolhas.</p>}
    {estado?.historico.map(h=><p key={h.id}><button disabled={ocupado} onClick={()=>void acao(()=>abrir(h.id))}>{data(h.criado_em)}</button> {h.publicado_em ? `Publicada em ${data(h.publicado_em)}` : `${h.concluidos.length}/13 etapas · por publicar`}</p>)}
  </main>;
}
