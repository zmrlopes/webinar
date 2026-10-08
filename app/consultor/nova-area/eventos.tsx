"use client";

import { useEffect, useRef, useState } from "react";
import type { DadosEventosPresenciais } from "@/lib/consultor-nova-area";
import { EventoForm } from "../evento-form";
import { ConvencaoCartao } from "../convencao-cartao";
import estilos from "./nova-area.module.css";
import s from "./eventos.module.css";

function dataEvento(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
}

export function EventosPresenciais({ email, nome }: { email: string; nome: string }) {
  const [dados, setDados] = useState<DadosEventosPresenciais | null>(null);
  const [estado, setEstado] = useState<"carregar" | "pronto" | "erro">("carregar");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [acao, setAcao] = useState<"teambuilding" | null>(null);
  const detalhes = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setEstado("carregar");
    setErro("");
    async function carregar() {
      try {
        const r = await fetch("/api/consultor/nova-area/eventos", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), signal: controller.signal,
        });
        const corpo = await r.json();
        if (controller.signal.aborted) return;
        if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível carregar os eventos.");
        setDados(corpo);
        setEstado("pronto");
      } catch (falha) {
        if (controller.signal.aborted) return;
        setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
        setEstado("erro");
      }
    }
    void carregar();
    return () => controller.abort();
  }, [email, tentativa]);

  useEffect(() => {
    if (!acao || estado !== "pronto") return;
    detalhes.current?.focus({ preventScroll: true });
    detalhes.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [acao, estado]);

  return <section id="eventos-presenciais" aria-labelledby="titulo-eventos-presenciais">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>ENCONTRA A EQUIPA</span>
      <h1 id="titulo-eventos-presenciais">Eventos presenciais<span>.</span></h1>
      <p>Os próximos encontros da equipa e da iCliGo. Consulta as datas e prepara a tua participação.</p>
    </div>
    {estado === "carregar" && <p className={s.aviso} role="status">A carregar os eventos…</p>}
    {estado === "erro" && <div className={s.erro} role="alert"><p>{erro}</p><button type="button" className={estilos.botaoSecundario} onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>}
    {estado === "pronto" && dados && <>
      <div className={s.grade}>
        <article className={s.cartao}>
          <span className={estilos.etiqueta}>EVENTO DA EQUIPA</span>
          <h2>{dados.teambuilding.titulo}</h2>
          <p className={s.data}><time dateTime={dados.teambuilding.data}>{dataEvento(dados.teambuilding.data)}</time></p>
          <p className={s.local}>{dados.teambuilding.local} <span>·</span> Horário a confirmar</p>
          <p className={s.descricao}>Um dia presencial com a Tropa de Elite. Inscreve-te e indica quem vai contigo.</p>
          <p className={s.nota}>Adultos: {dados.teambuilding.precoAdulto} € · Crianças com mais de 10 anos: {dados.teambuilding.precoCrianca} €</p>
          <button type="button" className={estilos.botao} disabled={!dados.teambuilding.inscricoesAbertas} aria-expanded={acao === "teambuilding"} aria-controls="detalhes-evento-presencial" onClick={() => setAcao("teambuilding")}>{dados.teambuilding.inscricoesAbertas ? "Inscrever-me" : "Inscrições encerradas"}</button>
        </article>
        <article className={s.cartao}>
          <span className={estilos.etiqueta}><img className={s.logo} src="/icligo-logo.png" alt="" width={20} height={20} />EVENTO ICLIGO</span>
          <h2>{dados.convencao.titulo}</h2>
          <p className={s.data}><time dateTime={dados.convencao.data}>{dataEvento(dados.convencao.data)}</time></p>
          <p className={s.local}>Local e horário a confirmar</p>
          <p className={s.lembrete}><strong>Lembra-te:</strong> se quiseres um bilhete para a Convenção, fala diretamente com a Sara.</p>
          {dados.convencao.erroPedido ? <div className={s.erro} role="alert"><p>Não foi possível consultar o teu pedido.</p><button type="button" className={estilos.botaoSecundario} onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>
            : dados.convencao.pedido ? <div className={s.pedido}><ConvencaoCartao email={email} pedido={dados.convencao.pedido} mostrarLinkBilhetes={false} mostrarCabecalho={false} /></div> : <p className={s.nota}>Depois de o teu pedido estar registado, podes anexar aqui os comprovativos de pagamento.</p>}
        </article>
      </div>
      {acao && <div id="detalhes-evento-presencial" ref={detalhes} className={s.detalhes} tabIndex={-1}>
        <div className={s.cabecalhoDetalhes}><h2>Inscrição no Teambuilding</h2><button type="button" className={estilos.botaoSecundario} onClick={() => setAcao(null)}>Fechar</button></div>
        {acao === "teambuilding" && dados.teambuilding.inscricoesAbertas && <EventoForm email={email} nome={nome} />}
      </div>}
    </>}
  </section>;
}
