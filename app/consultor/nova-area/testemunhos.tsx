"use client";

import { useEffect, useRef, useState } from "react";
import testemunhos from "@/lib/testemunhos.json";
import estilos from "./nova-area.module.css";
import css from "./testemunhos.module.css";

const PLAYLIST = "PLcjLwMW086tk0KgJ3LbNvy0fLsXqQ6rjv";
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function TestemunhosNovaArea() {
  const [pesquisa, setPesquisa] = useState("");
  const [selecionado, setSelecionado] = useState<typeof testemunhos[number] | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const palavras = normalizar(pesquisa).trim().split(/\s+/).filter(Boolean);
  const resultados = testemunhos.filter(t => palavras.every(p => normalizar(t.titulo).includes(p)));

  useEffect(() => {
    if (selecionado && !dialogo.current?.open) dialogo.current?.showModal();
  }, [selecionado]);

  function abrir(video: typeof testemunhos[number], botao: HTMLButtonElement) {
    botao.focus({ preventScroll: true });
    setSelecionado(video);
  }

  return <section id="testemunhos" aria-label="Testemunhos">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>FORMAÇÃO</span>
      <h1>Testemunhos<span>.</span></h1>
      <p>Histórias de consultores iCliGo: das primeiras dúvidas à decisão de começar.</p>
    </div>
    <div className={css.pesquisa}>
      <label htmlFor="pesquisa-testemunhos">Procurar testemunhos</label>
      <div className={css.campo}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input id="pesquisa-testemunhos" type="search" value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Ex.: tempo, família, dinheiro…" />
        {pesquisa && <button type="button" onClick={() => setPesquisa("")} aria-label="Limpar pesquisa">×</button>}
      </div>
      <p role="status">{resultados.length} {resultados.length === 1 ? "testemunho" : "testemunhos"}{pesquisa.trim() ? " encontrados" : " disponíveis"}</p>
    </div>
    {resultados.length ? <div className={css.grade}>
      {resultados.map(video => <button key={video.id} type="button" className={css.cartao} onClick={e => abrir(video, e.currentTarget)} aria-label={`Ver testemunho: ${video.titulo}`} aria-haspopup="dialog">
        <span className={css.miniatura}>
          <img src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`} alt="" loading="lazy" width="88" height="50" />
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#4b5320" /><path d="m10 7 7 5-7 5Z" fill="white" /></svg>
        </span>
        <span className={css.texto}><strong>{video.titulo}</strong><span>{video.duracao && `${video.duracao} · `}Ver testemunho</span></span>
      </button>)}
    </div> : <div className={estilos.vazioOrganizacao}><strong>Nenhum testemunho corresponde à pesquisa</strong><p>Experimenta outras palavras ou limpa a pesquisa para ver todos.</p></div>}
    <a className={css.playlist} href={`https://www.youtube.com/playlist?list=${PLAYLIST}`} target="_blank" rel="noopener noreferrer">Ver a playlist no YouTube ↗</a>
    <dialog ref={dialogo} className={css.dialogo} aria-labelledby="titulo-testemunho" onClose={() => setSelecionado(null)} onClick={e => { if (e.target === e.currentTarget) dialogo.current?.close(); }}>
      {selecionado && <div className={css.player}>
        <div className={css.cabecalho}><h2 id="titulo-testemunho">{selecionado.titulo}</h2><button type="button" onClick={() => dialogo.current?.close()} aria-label="Fechar testemunho" autoFocus>×</button></div>
        <iframe src={`https://www.youtube-nocookie.com/embed/${selecionado.id}?rel=0`} title={selecionado.titulo} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <a href={`https://www.youtube.com/watch?v=${selecionado.id}&list=${PLAYLIST}`} target="_blank" rel="noopener noreferrer">Ver no YouTube ↗</a>
      </div>}
    </dialog>
  </section>;
}
