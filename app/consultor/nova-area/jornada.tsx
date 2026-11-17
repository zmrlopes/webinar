"use client";

import { useEffect, useRef, useState } from "react";
import type { JornadaConsultor } from "@/lib/consultor-jornada";
import { nomePatamarQuantidade } from "@/lib/patamares-carreira";
import s from "./jornada.module.css";

const numero = (valor: number) => valor.toLocaleString("pt-PT", {maximumFractionDigits: 2});

export function BarraJornada({email, inicial, aoVerDetalhe}: {email: string; inicial: JornadaConsultor | null; aoVerDetalhe: () => void}) {
  const [jornada, setJornada] = useState(inicial);
  const [erro, setErro] = useState("");
  const [aAtualizar, setAAtualizar] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const inicialRef = useRef(inicial);

  useEffect(() => {
    const controller = new AbortController();
    let ocupado = false;
    async function atualizar() {
      if (ocupado || document.visibilityState === "hidden") return;
      ocupado = true; setAAtualizar(true);
      try {
        const r = await fetch("/api/consultor/nova-area/jornada", {
          method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email}), signal: controller.signal,
        });
        const corpo = await r.json();
        if (!r.ok || !corpo.jornada) throw new Error(corpo.erro ?? "Não foi possível atualizar os teus pontos.");
        if (!controller.signal.aborted) {setJornada(corpo.jornada); setErro("");}
      } catch (falha) {
        if (!controller.signal.aborted) setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar os teus pontos.");
      } finally {
        ocupado = false;
        if (!controller.signal.aborted) setAAtualizar(false);
      }
    }
    const aoVoltar = () => {void atualizar();};
    if (!inicialRef.current || inicialRef.current.estrutura?.estado === "por-atualizar" || tentativa) void atualizar();
    const intervalo = setInterval(aoVoltar, 60_000);
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {controller.abort(); clearInterval(intervalo); window.removeEventListener("focus", aoVoltar); document.removeEventListener("visibilitychange", aoVoltar);};
  }, [email, tentativa]);

  const semDados = !jornada || jornada.estado === "sem-dados";
  const final = jornada?.estado === "ultimo-patamar";
  const metaAtingida = jornada?.estado === "meta-atingida";
  const textoProgresso = jornada?.pontos == null ? "Pontos ainda não disponíveis" : final ? `${numero(jornada.pontos)} pontos. Patamar ${jornada.patamarAtual}.` : `${numero(jornada.pontos)} pontos atuais. Faltam ${numero(jornada.faltam ?? 0)} pontos para ${jornada.proximoPatamar}.`;

  return <section className={s.raiz} aria-labelledby="titulo-jornada">
    <div className={s.cabecalho}>
      <div className={s.identidade}>
        <h2 id="titulo-jornada">A MINHA JORNADA</h2>
        <div className={s.patamares}>
          <strong>{jornada?.patamarAtual ?? "O teu próximo patamar"}</strong>
          {jornada?.proximoPatamar && <><span className={s.seta} aria-hidden="true">→</span><span>Próximo: <strong>{jornada.proximoPatamar}</strong></span></>}
        </div>
      </div>
      <div className={s.pontos}>
        {jornada?.pontos != null && <strong>{numero(jornada.pontos)} <span>pontos atuais</span></strong>}
        {!semDados && !final && <span className={s.faltam}>{metaAtingida ? "Meta de pontos atingida" : <>{jornada!.faltam === 1 ? "Falta" : "Faltam"} <strong>{numero(jornada!.faltam!)} {jornada!.faltam === 1 ? "ponto" : "pontos"}</strong></>}</span>}
        {final && <span className={s.faltam}>Último patamar da escada: {jornada!.patamarAtual}</span>}
      </div>
    </div>
    {semDados ? <p className={s.semDados}>{aAtualizar ? "A consultar os teus pontos…" : "Os pontos ou o patamar ainda não estão disponíveis. A barra aparece assim que os dados da equipa forem atualizados."}</p> : <>
      <div className={s.barra} role="progressbar" aria-label="Pontos para o próximo patamar" aria-valuemin={0} aria-valuemax={jornada!.metaPontos ?? 100}
        aria-valuenow={final ? 100 : Math.min(jornada!.pontos!, jornada!.metaPontos!)} aria-valuetext={textoProgresso}>
        <span className={s.preenchimento} style={{width: `${jornada!.percentagem}%`}} />
      </div>
      <div className={s.rodape}>
        <span>{jornada!.metaPontos !== null ? `Pontos necessários para ${jornada!.proximoPatamar}: ${numero(jornada!.metaPontos)} no total` : "Continua a construir a tua jornada."}</span>
        {jornada!.atualizadoEm && <span>Dados da equipa · <time dateTime={jornada!.atualizadoEm}>{new Date(jornada!.atualizadoEm).toLocaleDateString("pt-PT", {timeZone: "Europe/Lisbon"})}</time></span>}
      </div>
    </>}
    {jornada?.proximoPatamar && <div className={s.criterios}>
      <div>
        {jornada.estrutura?.estado === "por-atualizar" ? <span role="status">A consultar os requisitos da tua organização…</span> : jornada.estrutura ? <>
          {jornada.estrutura.requisitos.map(r => <span key={r.patamar}>{r.faltam === 0 ? <><strong>{r.cumpridos}/{r.necessarios}</strong> linhas com {r.patamar} ou superior</> : <>{r.faltam === 1 ? "Falta" : "Faltam"} <strong>{r.faltam} {nomePatamarQuantidade(r.patamar, r.faltam!)}</strong> em {r.faltam === 1 ? "nova linha" : "linhas distintas"}</>}</span>)}
        </> : <span>Próximo objetivo: <strong>{jornada.proximoPatamar}</strong></span>}
      </div>
      <a href="/consultor/nova-area?seccao=negocio&vista=patamar" onClick={e => {if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {e.preventDefault(); aoVerDetalhe();}}}>Ver em detalhe <span aria-hidden="true">→</span></a>
    </div>}
    {erro && <p className={s.erro} role="status">{erro} <button type="button" disabled={aAtualizar} onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></p>}
  </section>;
}
