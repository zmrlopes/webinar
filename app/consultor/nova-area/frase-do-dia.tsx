"use client";

import { useEffect, useState } from "react";
import { obterFraseDoDia } from "@/lib/frase-do-dia";
import estilos from "./frase-do-dia.module.css";

export function FraseDoDia() {
  const [frase, setFrase] = useState<ReturnType<typeof obterFraseDoDia> | null>(null);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    function atualizar() {
      clearTimeout(temporizador);
      const atual = obterFraseDoDia();
      setFrase(anterior => anterior?.data === atual.data ? anterior : atual);
      // Verifica na mudança de minuto, incluindo a meia-noite de Lisboa.
      temporizador = setTimeout(atualizar, 60_000 - (Date.now() % 60_000) + 50);
    }
    atualizar();
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, []);

  if (!frase) return null;
  return <section className={estilos.cartao} aria-labelledby="titulo-frase-do-dia">
    <div className={estilos.topo}>
      <h2 id="titulo-frase-do-dia">Frase do dia</h2>
      <time dateTime={frase.data}>{new Intl.DateTimeFormat("pt-PT", {
        timeZone: "Europe/Lisbon", day: "numeric", month: "long",
      }).format(new Date(`${frase.data}T12:00:00Z`))}</time>
    </div>
    <span className={estilos.tema}>{frase.tema}</span>
    <p className={estilos.frase}>{frase.texto}</p>
    <p className={estilos.referencia}>Reflexão original · Inspirada em <a href={frase.referencia.url} target="_blank" rel="noopener noreferrer">{frase.referencia.nome}<span className={estilos.srOnly}> (abre num novo separador)</span> <span aria-hidden="true">↗</span></a></p>
  </section>;
}
