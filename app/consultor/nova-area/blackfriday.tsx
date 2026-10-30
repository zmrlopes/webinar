"use client";
import {useEffect, useRef, useState, type CSSProperties, type FormEvent} from "react";
import {CASAS_BF, META_BF, resumirBF, type DadosBF, type InscricaoBF} from "@/lib/blackfriday";
import {podeVerNovaArea} from "@/lib/consultor-nova-area";
import {detetarNovasLinhasBF, type MemoriaLinhasBF} from "@/lib/blackfriday-celebracao";
import css from "./blackfriday.module.css";

const euros = (v: number) => new Intl.NumberFormat("pt-PT", {style: "currency", currency: "EUR", maximumFractionDigits: 0}).format(v);
const data = (v: string) => new Intl.DateTimeFormat("pt-PT", {day: "numeric", month: "long", timeZone: "Europe/Lisbon"}).format(new Date(v + "T12:00:00Z"));
export function BarraBlackFriday({dados}: {dados: DadosBF}) {
  const valor = dados.faturacao?.valor ?? 0;
  const percentagem = Math.min(100, Math.max(0, valor / META_BF * 100));
  return <div className={css.meta}>
    <div className={css.metaTopo}><span>UMA EQUIPA. UM OBJETIVO.</span><span>{percentagem.toLocaleString("pt-PT", {maximumFractionDigits: 1})}%</span></div>
    <div className={css.numeros}><strong>{dados.faturacao ? euros(valor) : "À espera do arranque"}</strong><span> / {euros(META_BF)}</span></div>
    <div className={css.barra} role="progressbar" aria-label="Faturação da equipa" aria-valuemin={0} aria-valuemax={META_BF} aria-valuenow={Math.min(META_BF, Math.max(0, valor))} aria-valuetext={`${euros(valor)} de ${euros(META_BF)}`}><span style={{width: `${percentagem}%`}} /></div>
    <p>{valor >= META_BF ? "Meta atingida! Todos os bingos validados dão acesso ao prémio." : <>Faltam <b>{euros(Math.max(0, META_BF - valor))}</b> para desbloquear o prémio para todos os bingos.</>}</p>
    <small>{dados.config.periodoFaturacao === "anual" ? "Acumulado anual da equipa" : `Faturação da equipa de ${data(dados.config.inicio)} a ${data(dados.config.fim)}`}{dados.faturacao ? ` · Dados até ${data(dados.faturacao.fim)} · Atualizado em ${new Intl.DateTimeFormat("pt-PT", {dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon"}).format(new Date(dados.faturacao.atualizadoEm))}` : " · Atualiza com os dados do dashboard"}</small>
  </div>;
}
function Aviao() {return <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4L22 2Z" strokeLinejoin="round"/><path d="m11 13 6-6" strokeLinecap="round"/></svg>;}
// Decorativos: cada casa mantém o nome acessível e o estado da reserva.
// Os restantes desenhos foram vetorizados diretamente da referencia bingo.jpeg.
function IconeCasa({casa}: {casa: number}) {
  if (casa === 21) return <svg className={css.iconeDestino} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 21 10 5l9 16H2Zm8-16 2 16m4-6 3-9 4 15h-4M2 23h21"/></svg>;
  if (casa === 13) return <svg className={css.iconeDestino} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 15c2-5 6-5 8 0 4 5 0 7-4 5-4 2-8 0-4-5ZM7 8a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm6-3a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm6 1a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm4 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0Z"/></svg>;
  return <span className={`${css.iconeDestino} ${css.iconeReferencia}`} style={{maskImage: `url(/blackfriday/icones/casa-${casa}.svg)`, WebkitMaskImage: `url(/blackfriday/icones/casa-${casa}.svg)`}} aria-hidden="true"/>;
}

type CelebracaoBF = {id: number; linhas: number[]; emValidacao: boolean; previsualizacao?: boolean};
function ParabensLinha({conquista}: {conquista: CelebracaoBF}) {
  return <div className={css.celebracao} role="status" aria-live="polite" aria-atomic="true">
    <div className={css.confetes} aria-hidden="true">{Array.from({length: 16}, (_, n) => <i key={n} style={{"--bf-angulo": `${n * 22.5}deg`, "--bf-distancia": `${70 + n % 4 * 20}px`, "--bf-atraso": `${n % 5 * 35}ms`} as CSSProperties}/>)}</div>
    <div className={css.conquista}>
      <span className={css.medalha} aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" strokeLinejoin="round"/></svg></span>
      <span className={css.conquistaEtiqueta}>UMA NOVA CONQUISTA</span><h3>Parabéns!<br/>Linha completa.</h3><p>Mais um passo até ao bingo.</p>
      <small>{conquista.previsualizacao ? "Pré-visualização · o cartão não é alterado" : conquista.emValidacao ? "O prémio fica sujeito à validação dos comprovativos." : "A tua linha está validada. Continua assim!"}</small>
    </div>
  </div>;
}

export function BlackFriday({email}: {email: string}) {
  const [dados, setDados] = useState<DadosBF | null>(null);
  const [simulacao, setSimulacao] = useState(false);
  const pedidoAtual = useRef(0);
  const aGuardarRef = useRef(false);
  const [erro, setErro] = useState("");
  const [casa, setCasa] = useState<number | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [joker, setJoker] = useState(false);
  const [aviso, setAviso] = useState("");
  const [celebracao, setCelebracao] = useState<CelebracaoBF | null>(null);
  const linhasCelebradas = useRef<MemoriaLinhasBF | null>(null);
  const numeroCelebracao = useRef(0);
  const cartaoBingo = useRef<HTMLDivElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botaoCasa = useRef<HTMLButtonElement | null>(null);
  async function carregar(signal?: AbortSignal) {
    if (aGuardarRef.current) return;
    const pedido = ++pedidoAtual.current;
    try {
      const r = await fetch("/api/consultor/nova-area/blackfriday", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "consultar", simulacao}), signal});
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      if (!signal?.aborted && pedido === pedidoAtual.current) {setDados(d); setErro("");}
    } catch (e) {if (!signal?.aborted && pedido === pedidoAtual.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar o bingo.");}
  }
  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    const atualizar = () => {if (!document.hidden) void carregar(controller.signal);};
    const intervalo = setInterval(atualizar, 10_000);
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    return () => {controller.abort(); clearInterval(intervalo); window.removeEventListener("focus", atualizar); document.removeEventListener("visibilitychange", atualizar);};
    // O email permanece o mesmo durante a visita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, simulacao]);
  function alternarSimulacao() {
    if (aGuardar || !podeVerNovaArea(email)) return;
    ++pedidoAtual.current; setDados(null);
    setSimulacao(!simulacao); setAviso(""); setErro("");
    setCelebracao(null);
  }
  function fechar() {if (aGuardar) return; dialogo.current?.close(); setCasa(null); botaoCasa.current?.focus();}
  function previsualizarAnimacao() {
    cartaoBingo.current?.scrollIntoView({block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    setCelebracao({id: ++numeroCelebracao.current, linhas: [], emValidacao: false, previsualizacao: true});
  }
  function abrir(n: number, botao: HTMLButtonElement) {
    botaoCasa.current = botao; setCasa(n); setJoker(n === 12); setErro("");
    dialogo.current?.showModal();
  }
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (aGuardar || casa === null) return;
    const form = new FormData(e.currentTarget);
    form.set("email", email); form.set("acao", "enviar"); form.set("casa", String(casa)); form.set("curinga", String(joker));
    form.set("simulacao", String(simulacao));
    aGuardarRef.current = true; ++pedidoAtual.current;
    setAGuardar(true); setErro("");
    try {
      const r = await fetch("/api/consultor/nova-area/blackfriday", {method: "POST", body: form});
      const d = await r.json(); if (!r.ok) throw new Error(d.erro);
      setDados(d); setAviso(simulacao ? "Comprovativo de teste enviado para o admin. A casa já conta no cartão de simulação e aguarda revisão." : "Reserva enviada! Esta casa já conta no teu cartão e aguarda validação.");
      dialogo.current?.close(); setCasa(null); botaoCasa.current?.focus();
    } catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível enviar a reserva.");}
    finally {aGuardarRef.current = false; setAGuardar(false);}
  }
  async function recomeçarSimulacao() {
    if (!simulacao || aGuardarRef.current) return;
    aGuardarRef.current = true; ++pedidoAtual.current; setAGuardar(true); setErro("");
    try {
      const r = await fetch("/api/consultor/nova-area/blackfriday", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "limpar-simulacao", simulacao: true})});
      const d = await r.json(); if (!r.ok) throw new Error(d.erro);
      setDados(d); linhasCelebradas.current = null; setCelebracao(null); setAviso("Simulação reiniciada. Apenas os envios e comprovativos de teste foram removidos.");
    } catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível recomeçar a simulação.");}
    finally {aGuardarRef.current = false; setAGuardar(false);}
  }
  async function verComprovativo(i: InscricaoBF) {
    const janela = window.open("about:blank", "_blank"); if (janela) janela.opener = null;
    try {
      const r = await fetch("/api/consultor/nova-area/blackfriday", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "comprovativo", id: i.id, simulacao})});
      if (!r.ok) throw new Error("Não foi possível abrir o comprovativo.");
      const url = URL.createObjectURL(await r.blob());
      if (janela) janela.location.href = url;
      else {const a = document.createElement("a"); a.href = url; a.download = i.ficheiroNome; a.click();}
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {janela?.close(); setErro(e instanceof Error ? e.message : "Falha de ligação.");}
  }
  const resumo = dados ? resumirBF(dados.inscricoes, dados.config) : null;
  const confirmado = dados ? resumirBF(dados.inscricoes, dados.config, true) : null;
  const chaveLinhas = resumo ? resumo.linhas.join(",") : null;
  const chaveValidadas = confirmado ? confirmado.linhas.join(",") : "";
  useEffect(() => {
    if (chaveLinhas === null) return;
    const contexto = `${email}:${simulacao ? "simulacao" : "real"}`;
    const atuais = chaveLinhas ? chaveLinhas.split(",").map(Number) : [];
    setCelebracao(ativa => ativa && !ativa.previsualizacao && ativa.linhas.some(l => !atuais.includes(l)) ? null : ativa);
    const resultado = detetarNovasLinhasBF(linhasCelebradas.current, contexto, atuais);
    linhasCelebradas.current = resultado.memoria;
    if (!resultado.novas.length) return;
    const validadas = chaveValidadas ? chaveValidadas.split(",").map(Number) : [];
    setCelebracao({id: ++numeroCelebracao.current, linhas: resultado.novas, emValidacao: resultado.novas.some(l => !validadas.includes(l))});
  }, [chaveLinhas, chaveValidadas, email, simulacao]);
  useEffect(() => {
    if (!celebracao) return;
    const temporizador = setTimeout(() => setCelebracao(null), 4_800);
    return () => clearTimeout(temporizador);
  }, [celebracao]);
  const aberto = dados && dados.hoje >= dados.config.inicio && dados.hoje <= dados.config.fim;
  const reserva = casa !== null ? dados?.inscricoes.filter(i => i.casa === casa).at(-1) : null;
  return <section className={css.pagina} aria-label="Desafio Black Friday">
    <header className={css.cabecalho}><span className={css.selo}>TROPA DE ELITE · DESAFIO {dados?.config.inicio.slice(0, 4) ?? "2026"}</span><h1>BLACK<span>FRIDAY</span></h1><p>Cada reserva, uma conquista.<br/>A próxima casa pode ser tua.</p><div className={css.datas}>{dados ? `${data(dados.config.inicio)} — ${data(dados.config.fim)}` : "A preparar o desafio…"}</div></header>
    {erro && casa === null && <p role="alert" className={css.erro}>{erro} <button type="button" onClick={() => void carregar()}>Tentar novamente</button></p>}
    {aviso && <p role="status" className={css.aviso}>{aviso}</p>}
    {dados && podeVerNovaArea(email) && <div className={css.simulacao}>
      <div><strong>{simulacao ? "SIMULAÇÃO LIGADA AO ADMIN" : "Experimenta o envio de um comprovativo"}</strong><p>{simulacao ? "Anexa um print numa casa e revê-o no admin, em Simulação. O cartão atualiza ao regressares e a cada 10 segundos. Os testes ficam guardados à parte até recomeçares a simulação e não contam para o desafio." : "Podes testar o envio, a aprovação e a recusa pelo admin antes do arranque do desafio."}</p></div>
      <div className={css.acoesSimulacao}>{simulacao && <><a href="/admin/blackfriday?modo=simulacao" target="_blank" rel="noreferrer">Abrir simulação no admin ↗</a><button type="button" onClick={previsualizarAnimacao}>Ver animação de linha</button><button type="button" disabled={aGuardar} onClick={() => void recomeçarSimulacao()}>Recomeçar simulação</button></>}<button type="button" disabled={aGuardar} onClick={alternarSimulacao}>{simulacao ? "Sair da simulação" : "Experimentar simulação"}</button></div>
    </div>}
    {dados && resumo && confirmado && <>
      <BarraBlackFriday dados={dados}/>
      <div className={css.layout}>
        <div className={css.cartao} ref={cartaoBingo}>
          {celebracao && <ParabensLinha key={celebracao.id} conquista={celebracao}/>}
          <div className={css.cartaoTopo}><div><span className={css.selo}>{simulacao ? "CARTÃO DE SIMULAÇÃO" : "O TEU CARTÃO"}</span><h2>Próxima paragem: bingo.</h2></div><span className={css.contador}>{resumo.casas}<small>/25</small></span></div>
          <div className={css.letras} aria-hidden="true">{"BINGO".split("").map(l => <span key={l}>{l}</span>)}</div>
          <div className={css.grelha}>
            {CASAS_BF.map((titulo, n) => {
              const i = dados.inscricoes.filter(r => r.casa === n).at(-1);
              const e = i?.estado ?? "vazia";
              return <button key={n} type="button" className={css.casa} data-estado={e} data-cor={n % 6} data-linha={resumo.linhas.includes(Math.floor(n / 5))} data-celebrar={celebracao?.linhas.includes(Math.floor(n / 5)) ?? false} aria-label={`${titulo}: ${e === "vazia" ? "por preencher" : e}. Ver detalhes.`} onClick={ev => abrir(n, ev.currentTarget)}>
                {e === "aprovada" && <span className={css.check} aria-hidden="true">✓</span>}
                {n === 12 ? <Aviao/> : <><IconeCasa casa={n}/><span className={css.destino}>{titulo}</span></>}
                <small>{e === "pendente" ? "◷ Em validação" : e === "aprovada" ? "Validada" : e === "recusada" ? "Rever envio" : n === 12 ? "Reserva ≥ 5.000 €" : "+ Reserva"}</small>
                {i?.curinga && e !== "recusada" && <span className={css.joker}>5K</span>}
              </button>;
            })}
          </div>
          <div className={css.legenda}><span>○ Por preencher</span><span>◷ Em validação</span><span>✓ Validada</span></div>
          <p className={css.resultado}>{resumo.bingo ? confirmado.bingo ? "BINGO VALIDADO! Cartão completo." : "BINGO! O teu cartão está completo e aguarda validação." : resumo.linhas.length ? confirmado.linhas.length ? "Primeira linha validada! Continua até ao bingo." : "Linha completa! O prémio aguarda validação." : "Completa uma linha horizontal para conquistar o primeiro prémio."}</p>
          {!aberto && <p className={css.nota}>{dados.hoje < dados.config.inicio ? `O desafio começa a ${data(dados.config.inicio)}. Até lá, prepara a tua estratégia.` : "O período de envio terminou. Podes continuar a acompanhar a validação do teu cartão."}</p>}
        </div>
        <aside className={css.premios}>
          <div className={css.premio}><span className={css.selo}>01 / A PRIMEIRA LINHA</span><h3>Cinco casas.<br/>Uma conquista.</h3><p>Completa a tua primeira linha horizontal.</p><strong>{dados.config.premioLinha}</strong><small>Um prémio de linha por TP.</small></div>
          <div className={`${css.premio} ${css.premioPrincipal}`}>
            <span className={css.selo}>02 / O GRANDE BINGO</span><h3>Um ano de<br/>eventos contigo.</h3>
            <strong>{dados.config.premioBingo}</strong>
            <p>O prémio inclui os bilhetes pagos para:</p>
            <ul className={css.eventosPremio}><li>Be a Rock</li><li>Be a Pro</li><li>Convenção Nacional</li><li>Be a Leader</li><li>Mindset Elite</li><li>Evento Natal Tropa de Elite</li></ul>
            <small>Apenas as entradas nestes eventos.</small>
            <p>Se a equipa atingir <b>3 milhões de euros</b>, <b>todos os TPs com bingo validado</b> recebem o prémio.</p>
            <p>Se a meta não for atingida, recebe o prémio <b>apenas o primeiro TP a completar um bingo válido</b>.</p>
          </div>
          <div className={css.premio}><span className={css.selo}>O TEU JOKER</span><h3>Uma reserva de 5K.<br/>A casa que quiseres.</h3><p>Uma única reserva de pelo menos 5.000 € pode preencher qualquer casa à tua escolha.</p><small>A reserva e o comprovativo só podem ser usados numa casa.</small></div>
        </aside>
      </div>
      <details className={css.regras}><summary>Como funciona o desafio</summary><ol><li>Faz uma reserva durante o desafio e escolhe a casa correspondente.</li><li>Anexa o comprovativo com a referência, a data e o valor da reserva. A casa começa logo a contar, pendente de revisão.</li><li>Cada reserva preenche uma única casa, mesmo quando corresponde a vários destinos ou categorias.</li><li>Uma reserva de pelo menos 5.000 € pode ser usada como joker numa única casa.</li><li>Só as linhas horizontais contam. Cada TP recebe prémio apenas pela primeira linha.</li><li>Os prémios dependem da validação dos comprovativos. Uma recusa retira a casa do progresso e permite um novo envio.</li><li>A ordem dos bingos é determinada pela hora de envio do último comprovativo necessário, desde que todos sejam aprovados.</li><li>O desafio decorre até às 23h59 de {data(dados.config.fim)}, no horário de Lisboa. A data da viagem pode ser posterior.</li></ol></details>
    </>}
    <dialog ref={dialogo} className={css.dialogo} aria-labelledby="bf-casa-titulo" onCancel={e => {e.preventDefault(); fechar();}} onClose={() => {setCasa(null); botaoCasa.current?.focus();}}>
      {casa !== null && dados && <div><button type="button" className={css.fechar} aria-label="Fechar" disabled={aGuardar} onClick={fechar}>×</button><span className={css.selo}>{simulacao && "SIMULAÇÃO · "}CASA {casa + 1} / 25</span><h2 id="bf-casa-titulo">{CASAS_BF[casa]}</h2>
        <>
          {reserva && <div className={css.detalhe}><strong>{reserva.estado === "pendente" ? "Em validação · já conta no cartão" : reserva.estado === "aprovada" ? "Reserva validada" : "Comprovativo recusado"}</strong><p>{reserva.referencia} · {euros(reserva.valorCentimos / 100)} · {data(reserva.dataReserva)}{reserva.curinga && " · Joker 5K"}</p>{reserva.motivo && <p>Motivo: {reserva.motivo}</p>}<button type="button" onClick={() => void verComprovativo(reserva)}>Ver comprovativo</button></div>}
          {simulacao && reserva && <div className={css.revisaoSimulada}>
            <strong>Revisão no painel admin</strong><p>Abre o comprovativo no admin, aprova ou recusa e regressa a esta janela para veres o resultado.</p>
            <a href="/admin/blackfriday?modo=simulacao" target="_blank" rel="noreferrer">Rever comprovativo no admin ↗</a>
          </div>}
          {(!reserva || reserva.estado === "recusada") && (aberto ? <form key={casa} onSubmit={enviar} className={css.formulario}>
            <p>Escolhe esta casa para a tua reserva e envia o comprovativo. Cada reserva só pode ser utilizada uma vez.</p>
            <label>Referência da reserva<input name="referencia" required minLength={3} maxLength={80} autoComplete="off" defaultValue={simulacao ? `TESTE-${casa + 1}` : undefined}/></label>
            <div className={css.campos}><label>Valor total (€)<input name="valor" required type="number" min={joker ? "5000" : "0.01"} max="99999999" step="0.01" inputMode="decimal" defaultValue={simulacao ? "5000" : undefined}/></label><label>Data da reserva<input name="dataReserva" type="date" required min={dados.config.inicio} max={dados.hoje < dados.config.fim ? dados.hoje : dados.config.fim} defaultValue={simulacao ? dados.hoje : undefined}/></label></div>
            <label className={css.opcao}><input type="checkbox" checked={joker} disabled={casa === 12} onChange={e => setJoker(e.target.checked)}/> Usar como joker de 5.000 €</label>
            <label>Print ou comprovativo<input name="ficheiro" type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e => {if (e.target.files?.[0] && e.target.files[0].size > 3 * 1024 * 1024) e.target.setCustomValidity("Escolhe um ficheiro até 3 MB."); else e.target.setCustomValidity("");}}/><small>PNG, JPG, WebP ou PDF · Até 3 MB</small></label>
            <button type="submit" className={css.botao} disabled={aGuardar}>{aGuardar ? "A preparar…" : simulacao ? "Simular envio e assinalar casa" : "Enviar e assinalar casa"}</button>
          </form> : <p>O envio está disponível de {data(dados.config.inicio)} a {data(dados.config.fim)}.</p>)}
        </>{erro && <p className={css.erro} role="alert">{erro}</p>}</div>}
    </dialog>
  </section>;
}
