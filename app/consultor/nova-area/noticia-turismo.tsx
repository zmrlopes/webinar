"use client";

import { useEffect, useState } from "react";
import { dataLisboa } from "@/lib/data-lisboa";
import type { DestaqueTurismo } from "@/lib/noticia-turismo";
import estilos from "./noticia-turismo.module.css";

export function NoticiaTurismo({ email }: { email: string }) {
  const [destaque, setDestaque] = useState<DestaqueTurismo | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let diaCarregado = "";
    let emCurso = false;
    let novaTentativaEm = 0;
    async function atualizar() {
      const dia = dataLisboa();
      if (emCurso || (diaCarregado === dia && Date.now() < novaTentativaEm)) return;
      emCurso = true;
      diaCarregado = dia;
      setDestaque(null);
      setErro("");
      try {
        const resposta = await fetch("/api/consultor/nova-area/noticia-turismo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }), signal: controller.signal,
        });
        if (!resposta.ok) throw new Error("Notícia indisponível");
        const dados: DestaqueTurismo = await resposta.json();
        if (controller.signal.aborted) return;
        setDestaque(dados);
        novaTentativaEm = Infinity;
      } catch {
        if (controller.signal.aborted) return;
        setErro("Não foi possível obter uma notícia recente. Tenta novamente dentro de alguns minutos.");
        novaTentativaEm = Date.now() + 15 * 60_000;
      } finally { emCurso = false; }
    }
    void atualizar();
    const temporizador = setInterval(() => { void atualizar(); }, 60_000);
    const aoVoltar = () => { if (document.visibilityState === "visible") void atualizar(); };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      controller.abort();
      clearInterval(temporizador);
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [email, tentativa]);

  const noticia = destaque?.noticia;
  return <section className={estilos.cartao} aria-labelledby="titulo-noticia-turismo">
    <div className={estilos.topo}>
      <span className={estilos.icone} aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10M7 11h4v6H7zM14 11h3m-3 3h3m-3 3h3" /></svg></span>
      <div><span className={estilos.etiqueta}>TURISMO EM DIA</span><h2 id="titulo-noticia-turismo">Notícia do dia</h2></div>
    </div>
    {noticia ? <>
      <p className={estilos.meta}>{noticia.fonte}<span aria-hidden="true"> · </span> Publicada em <time dateTime={noticia.publicadaEm}>{new Intl.DateTimeFormat("pt-PT", {
        timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric",
      }).format(new Date(noticia.publicadaEm))}</time></p>
      <h3 className={estilos.titulo}><a href={noticia.url} target="_blank" rel="noopener noreferrer">{noticia.titulo}</a></h3>
      {dataLisboa(new Date(noticia.publicadaEm)) !== destaque.dia && <p className={estilos.nota}>Última notícia disponível nas fontes consultadas.</p>}
      <a className={estilos.ler} href={noticia.url} target="_blank" rel="noopener noreferrer">Ler notícia em {noticia.fonte}<span aria-label="(abre num novo separador)">↗</span></a>
    </> : <div className={estilos.estado} role="status">
      <p>{erro || "A procurar a notícia de turismo…"}</p>
      {erro && <button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button>}
    </div>}
  </section>;
}
