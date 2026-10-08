"use client";

import { useEffect, useRef, useState } from "react";
import type { DadosEventosPresenciais } from "@/lib/consultor-nova-area";
import { EventoForm } from "../evento-form";
import { ConvencaoCartao } from "../convencao-cartao";
import FormularioBilhetes from "../../bilhetes-convencao/formulario";
import estilos from "./nova-area.module.css";
import s from "./eventos.module.css";

const OPCOES_PAGAMENTO = ["Só uma parte, para bloquear o lugar", "O valor total"];

function dataEvento(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
}

export function EventosPresenciais({ email, nome }: { email: string; nome: string }) {
  const [dados, setDados] = useState<DadosEventosPresenciais | null>(null);
  const [estado, setEstado] = useState<"carregar" | "pronto" | "erro">("carregar");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [acao, setAcao] = useState<"teambuilding" | "bilhetes" | "pedido" | null>(null);
  const [pedidoGravado, setPedidoGravado] = useState(false);
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
      {pedidoGravado && <p className={s.confirmado} role="status">✓ Pedido de bilhetes gravado.</p>}
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
          <p className={s.descricao}>Reserva o teu lugar no pack de bilhetes comprado pela equipa e acompanha o teu pedido.</p>
          {dados.convencao.erroPedido ? <div className={s.erro} role="alert"><p>Não foi possível consultar o teu pedido.</p><button type="button" className={estilos.botaoSecundario} onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>
            : dados.convencao.pedido ? <p className={s.nota}>O teu pedido: <strong>{dados.convencao.pedido.bilhetes} {dados.convencao.pedido.bilhetes === 1 ? "bilhete" : "bilhetes"}</strong>.</p> : <p className={s.nota}>Ainda não tens um pedido de bilhetes registado.</p>}
          <button type="button" className={estilos.botao} disabled={dados.convencao.erroPedido} aria-expanded={acao === "pedido" || acao === "bilhetes"} aria-controls="detalhes-evento-presencial" onClick={() => setAcao(dados.convencao.pedido ? "pedido" : "bilhetes")}>{dados.convencao.pedido ? "Ver pedido e comprovativos" : "Pedir bilhetes"}</button>
        </article>
      </div>
      {acao && <div id="detalhes-evento-presencial" ref={detalhes} className={s.detalhes} tabIndex={-1}>
        <div className={s.cabecalhoDetalhes}><h2>{acao === "teambuilding" ? "Inscrição no Teambuilding" : acao === "bilhetes" ? "Pedido de bilhetes da Convenção" : "O teu pedido da Convenção"}</h2><button type="button" className={estilos.botaoSecundario} onClick={() => setAcao(null)}>Fechar</button></div>
        {acao === "teambuilding" && dados.teambuilding.inscricoesAbertas && <EventoForm email={email} nome={nome} />}
        {acao === "pedido" && dados.convencao.pedido && <div className={s.pedido}><ConvencaoCartao email={email} pedido={dados.convencao.pedido} aoAcrescentar={() => setAcao("bilhetes")} /></div>}
        {acao === "bilhetes" && <div className={s.formularioBilhetes}>
          <p className={s.nota}>O teu bilhete faz parte do pack comprado pela equipa. {dados.convencao.pedido ? "Indica apenas os bilhetes que queres acrescentar e os nomes de quem os vai usar." : "Preenche os teus dados e escolhe a forma de pagamento."}</p>
          <FormularioBilhetes opcoesPagamento={OPCOES_PAGAMENTO} nomeInicial={nome} emailInicial={email} embutido aoGravar={() => { setPedidoGravado(true); setAcao(null); setTentativa(n => n + 1); }} />
        </div>}
      </div>}
    </>}
  </section>;
}
