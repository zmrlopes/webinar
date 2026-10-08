"use client";

import Link from "next/link";
import type { AvisoInicio } from "@/lib/consultor-nova-area";
import estilos from "./inicio.module.css";
import comuns from "./nova-area.module.css";

function Icone({ tipo }: { tipo: AvisoInicio["icone"] | "comunicado" }) {
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tipo === "trofeu" ? <><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v5m-4 4h8m-7-4h6v4H9Z" /></>
      : tipo === "hotel" ? <><path d="M4 21V4h11v17M15 10h5v11M2 21h20M7 7h1m3 0h1M7 11h1m3 0h1M7 15h1m3 0h1m-3 6v-3h3v3" /></>
      : tipo === "comunicado" ? <><path d="m4 10 14-6v16L4 14v-4ZM4 10H2v4h2m3 1 1 6h3l-1-5m11-7 2-1m-2 8 2 1" /></>
      : <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2h6v4H9V2ZM9 11h6m-6 4h6m-6 3h3" /></>}
  </svg>;
}

function CartaoQuestionario({ aviso }: { aviso: AvisoInicio }) {
  return <article className={estilos.cartao} data-aviso={aviso.id}>
    <Link className={estilos.cartaoLink} href={`${aviso.href}?origem=nova-area`}>
      <div className={estilos.cartaoTopo}>
        <span className={estilos.icone}><Icone tipo={aviso.icone} /></span>
        <span className={estilos.etiqueta}>{aviso.anonimo ? "Anónimo" : "Por responder"}</span>
      </div>
      <div className={estilos.cartaoTexto}><h3>{aviso.titulo}</h3><p>{aviso.texto}</p></div>
      <span className={estilos.responder}>
        <span className={estilos.responderTexto}>Responder ao questionário</span> <span aria-hidden="true">→</span>
      </span>
    </Link>
  </article>;
}

export function InicioNovaArea({ avisos, erroAvisos, feitos, aoComecar, acabadoAgora }: {
  avisos: AvisoInicio[];
  erroAvisos: boolean;
  feitos: number;
  aoComecar: () => void;
  acabadoAgora: boolean;
}) {
  const evento = avisos.filter(a => a.categoria === "evento");
  const equipa = avisos.filter(a => a.categoria === "equipa");
  return <section id="inicio-nova-area" aria-labelledby="titulo-inicio">
    <div className={comuns.intro}>
      <span className={comuns.etiqueta}>A TUA EQUIPA, NUM SÓ LUGAR</span>
      <h1 id="titulo-inicio">Início<span>.</span></h1>
      <p>Os teus avisos, questionários e novidades da equipa.</p>
    </div>

    {acabadoAgora && <div role="status" className={estilos.concluido}>
      <span aria-hidden="true">✓</span>
      <div><strong>Primeiros passos concluídos!</strong><p>O teu arranque está feito. A partir de agora, encontras aqui as novidades e os avisos da equipa.</p></div>
    </div>}

    {feitos < 5 && <div className={estilos.arranque}>
      <div><span className={comuns.etiqueta}>ESTÁS A COMEÇAR?</span><h2>Vamos dar os primeiros passos.</h2>
        <p>Segue as tarefas do “Começa aqui” e marca cada uma quando a concluíres.</p>
        <span className={estilos.progresso}>{feitos} de 5 tarefas concluídas</span>
      </div>
      <button type="button" className={comuns.botao} onClick={aoComecar}>{feitos ? "Continuar os primeiros passos" : "Começar agora"} <span aria-hidden="true">→</span></button>
    </div>}

    <section className={estilos.seccao} aria-labelledby="titulo-questionarios-inicio">
      <div className={estilos.cabecalho}>
        <div><span className={comuns.etiqueta}>AVISOS PARA TI</span><h2 id="titulo-questionarios-inicio">Questionários por responder</h2></div>
        {!erroAvisos && avisos.length > 0 && <span className={estilos.contador}>{avisos.length} {avisos.length === 1 ? "pendente" : "pendentes"}</span>}
      </div>
      {erroAvisos && <p role="alert" className={comuns.erroOrganizacao}>Não foi possível carregar todos os avisos. Atualiza a página para tentar novamente.</p>}
      {evento.length > 0 && <div className={`${estilos.grupo} ${estilos.importantes}`}>
        <div className={estilos.importantesCabecalho}>
          <span className={estilos.importantesIcone} aria-hidden="true">!</span>
          <div><span className={estilos.importantesEtiqueta}>Avisos importantes</span>
            <h3>{evento.length === 1 ? "Tens 1 questionário do evento por responder" : `Tens ${evento.length} questionários do evento por responder`}</h3>
          </div>
        </div>
        <div className={estilos.evento}><span aria-hidden="true">●</span><strong>Teambuilding Tropa de Elite</strong><span>14 de novembro de 2026</span></div>
        <div className={estilos.grelha}>{evento.map(aviso => <CartaoQuestionario key={aviso.id} aviso={aviso} />)}</div>
      </div>}
      {equipa.length > 0 && <div className={estilos.grupo}>
        <h3 className={estilos.tituloGrupo}>A nossa equipa</h3>
        <div className={estilos.grelha}>{equipa.map(aviso => <CartaoQuestionario key={aviso.id} aviso={aviso} />)}</div>
      </div>}
      {!erroAvisos && avisos.length === 0 && <div className={estilos.vazio}>
        <span className={estilos.icone} aria-hidden="true">✓</span><div><strong>Está tudo em dia.</strong><p>Não tens questionários por responder neste momento.</p></div>
      </div>}
    </section>

    <section className={estilos.seccao} aria-labelledby="titulo-comunicados-inicio">
      <div className={estilos.cabecalho}><div><span className={comuns.etiqueta}>NOVIDADES DA EQUIPA</span><h2 id="titulo-comunicados-inicio">Comunicados</h2></div></div>
      <div className={estilos.vazio}><span className={estilos.icone}><Icone tipo="comunicado" /></span>
        <div><strong>Sem comunicados de momento.</strong><p>Os comunicados da equipa vão aparecer aqui.</p></div>
      </div>
    </section>
  </section>;
}
