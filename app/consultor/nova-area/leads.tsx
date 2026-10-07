"use client";

import Link from "next/link";
import { useState } from "react";
import { WebinaresPagina } from "../webinares/webinares-pagina";
import estilos from "./nova-area.module.css";

export function LeadsNovaArea({ linkPartilha }: { linkPartilha: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  async function copiarLink() {
    if (!linkPartilha) return;
    setErro("");
    try {
      await navigator.clipboard.writeText(linkPartilha);
      setCopiado(true);
    } catch {
      setCopiado(false);
      setErro("Não foi possível copiar automaticamente. Seleciona o link e copia-o manualmente.");
    }
  }

  return (
    <section id="leads" aria-labelledby="titulo-leads">
      <div className={estilos.intro}>
        <span className={estilos.etiqueta}>A MINHA ORGANIZAÇÃO</span>
        <h1 id="titulo-leads">Leads<span>.</span></h1>
      </div>
      <section className={estilos.linkPartilha} aria-labelledby="titulo-link-partilha">
        <h2 id="titulo-link-partilha">O teu link de partilha</h2>
        <p>Partilha este link para convidares as tuas leads para o webinar. Quem se inscrever por ele fica atribuído a ti.</p>
        {linkPartilha ? <>
          <div className={estilos.linkPartilhaAcoes}>
            <input type="text" value={linkPartilha} readOnly aria-label="Link para partilhar com as leads" onClick={e => e.currentTarget.select()} />
            <button type="button" className={estilos.botao} onClick={() => void copiarLink()}>{copiado ? "Copiado!" : "Copiar link"}</button>
          </div>
          {copiado && <span className={estilos.linkCopiado} role="status">Link copiado. Já podes partilhá-lo.</span>}
          {erro && <p className={estilos.erroOrganizacao} role="alert">{erro}</p>}
        </> : <p>O teu link ainda não está disponível. <Link href="/consultor">Consulta a área atual para o obteres.</Link></p>}
      </section>
      <WebinaresPagina embutida />
    </section>
  );
}
