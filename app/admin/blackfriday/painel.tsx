"use client";
import Link from "next/link";
import {useEffect, useRef, useState, type FormEvent} from "react";
import {BarraBlackFriday} from "../../consultor/nova-area/blackfriday";
import {CASAS_BF, resumirBF, type ConfiguracaoBF, type DadosBF, type InscricaoBF} from "@/lib/blackfriday";
import css from "./painel.module.css";
const euros = (v: number) => new Intl.NumberFormat("pt-PT", {style: "currency", currency: "EUR"}).format(v);
const dataHora = (v: string) => new Intl.DateTimeFormat("pt-PT", {dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Lisbon"}).format(new Date(v));
export function PainelBlackFriday() {
  const [dados, setDados] = useState<DadosBF | null>(null);
  const [simulacao, setSimulacao] = useState<boolean | null>(null);
  const pedidoAtual = useRef(0);
  const aGuardar = useRef(false);
  const aLer = useRef<number | null>(null);
  const [config, setConfig] = useState<ConfiguracaoBF | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState("pendente");
  const [pesquisa, setPesquisa] = useState("");
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  async function carregar(silencioso = false, signal?: AbortSignal) {
    if (simulacao === null || aGuardar.current || aLer.current !== null) return;
    const pedido = ++pedidoAtual.current;
    aLer.current = pedido;
    if (!silencioso) {setOcupado(true); setErro("");}
    try {
      const r = await fetch(`/api/admin/blackfriday?modo=${simulacao ? "simulacao" : "real"}`, {cache: "no-store", signal}); const d = await r.json(); if (!r.ok) throw new Error(d.erro);
      if (!signal?.aborted && pedido === pedidoAtual.current) {setDados(d); setConfig(anterior => silencioso && anterior ? anterior : d.config);}
    } catch (e) {if (!signal?.aborted && pedido === pedidoAtual.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar o desafio.");}
    finally {if (aLer.current === pedido) aLer.current = null; if (!silencioso && pedido === pedidoAtual.current) setOcupado(false);}
  }
  useEffect(() => {setSimulacao(new URLSearchParams(window.location.search).get("modo") === "simulacao");}, []);
  useEffect(() => {
    if (simulacao === null) return;
    const controller = new AbortController(); void carregar(false, controller.signal);
    const atualizar = () => {if (!document.hidden) void carregar(true, controller.signal);};
    const intervalo = setInterval(atualizar, 10_000); window.addEventListener("focus", atualizar); document.addEventListener("visibilitychange", atualizar);
    return () => {controller.abort(); clearInterval(intervalo); window.removeEventListener("focus", atualizar); document.removeEventListener("visibilitychange", atualizar);};
    // O efeito carrega apenas o modo escolhido e cancela respostas do anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulacao]);
  function mudarModo(teste: boolean) {
    if (ocupado || simulacao === teste) return;
    ++pedidoAtual.current; aLer.current = null; setDados(null); setConfig(null); setMotivos({}); setErro(""); setAviso(""); setSimulacao(teste);
    const url = new URL(window.location.href); url.searchParams.set("modo", teste ? "simulacao" : "real"); window.history.replaceState(window.history.state, "", url);
  }
  async function guardar(corpo: unknown, mensagem: string) {
    if (ocupado) return; aGuardar.current = true; ++pedidoAtual.current; setOcupado(true); setErro(""); setAviso("");
    try {const r = await fetch("/api/admin/blackfriday", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...corpo as object, simulacao: simulacao === true})}); const d = await r.json(); if (!r.ok) throw new Error(d.erro); setDados(d); setConfig(d.config); setAviso(mensagem);}
    catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível guardar.");}
    finally {aGuardar.current = false; setOcupado(false);}
  }
  function configurar(e: FormEvent) {e.preventDefault(); void guardar({acao: "configurar", config}, "Configuração guardada. Se alteraste o período da faturação, atualiza os dados do dashboard.");}
  function rever(i: InscricaoBF, estado: "aprovada" | "recusada") {
    const motivo = motivos[i.id] ?? "";
    if (estado === "recusada" && !motivo.trim()) {setErro("Escreve o motivo da recusa junto ao comprovativo."); return;}
    void guardar({acao: "rever", id: i.id, estado, motivo}, estado === "aprovada" ? "Reserva aprovada." : "Reserva recusada. A casa deixou de contar no cartão.");
  }
  const participantes = dados ? [...new Set(dados.inscricoes.map(i => i.email))].map(email => {
    const inscricoes = dados.inscricoes.filter(i => i.email === email);
    return {email, nome: inscricoes[0]!.nome, progresso: resumirBF(inscricoes, dados.config), confirmado: resumirBF(inscricoes, dados.config, true)};
  }).sort((a, b) => a.progresso.bingoEm && b.progresso.bingoEm ? a.progresso.bingoEm.localeCompare(b.progresso.bingoEm) || a.email.localeCompare(b.email) : Number(b.progresso.bingo) - Number(a.progresso.bingo) || b.progresso.casas - a.progresso.casas) : [];
  const primeiroConfirmado = participantes.filter(p => p.confirmado.bingoEm).sort((a, b) => a.confirmado.bingoEm!.localeCompare(b.confirmado.bingoEm!))[0];
  const visiveis = dados?.inscricoes.filter(i => (filtro === "todas" || i.estado === filtro) && `${i.nome} ${i.email} ${i.referencia} ${CASAS_BF[i.casa]}`.toLowerCase().includes(pesquisa.toLowerCase())).sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm)) ?? [];
  return <main className={css.pagina}>
    <Link href="/admin">← Início</Link>
    <header className={css.topo}><div><span className={css.selo}>DESAFIO DA EQUIPA · 2026</span><h1>BLACKFRIDAY</h1><p>Comprovativos, linhas, bingos e objetivo da equipa.</p></div><button type="button" disabled={ocupado} onClick={() => void carregar()}>Atualizar painel</button></header>
    <p className={css.teste}>Em preparação: o cartão e a API continuam exclusivos da nova área da conta de teste.</p>
    <div className={css.modos} aria-label="Modo do painel"><button type="button" disabled={ocupado} aria-pressed={simulacao === false} onClick={() => mudarModo(false)}>Desafio real</button><button type="button" disabled={ocupado} aria-pressed={simulacao === true} onClick={() => mudarModo(true)}>Simulação da conta de teste</button></div>
    {simulacao && <div className={css.aviso}><strong>SIMULAÇÃO · Os envios da conta de teste aparecem aqui.</strong><p>Aprova ou recusa os comprovativos e regressa ao cartão de simulação para veres o resultado. Atualiza a cada 10 segundos enquanto visível. Estes registos não entram nos prémios, no ranking ou na faturação reais.</p><button type="button" disabled={ocupado} onClick={() => void guardar({acao: "limpar-simulacao"}, "Testes removidos. O desafio real mantém-se intacto.")}>Limpar apenas os testes</button></div>}
    {erro && <p role="alert" className={css.erro}>{erro}</p>}{aviso && <p role="status" className={css.aviso}>{aviso}</p>}
    {!dados && !erro && <p>A carregar o desafio…</p>}
    {dados && config && <>
      {!simulacao && <><BarraBlackFriday dados={dados}/><p className={css.nota}>A faturação vem do total geral da equipa no MyOffice para o período escolhido e atualiza com <Link href="/admin/dashboard-negocio/atualizar">Atualizar dados</Link>. Os comprovativos do bingo não são somados à barra.</p></>}
      <div className={css.indicadores}><div><strong>{participantes.length}</strong><span>Participantes</span></div><div><strong>{dados.inscricoes.filter(i => i.estado === "pendente").length}</strong><span>Por validar</span></div><div><strong>{participantes.filter(p => p.confirmado.linhas.length).length}</strong><span>TPs com linha validada</span></div><div><strong>{participantes.filter(p => p.confirmado.bingo).length}</strong><span>Bingos validados</span></div></div>
      {!simulacao && <details className={css.bloco}><summary>Datas, avião e prémios</summary>
        <form onSubmit={configurar} className={css.config}>
          <p className={css.nota}>As datas e a regra do avião podem ser ajustadas até ao primeiro envio. Depois ficam bloqueadas para preservar os cartões.</p>
          <div className={css.campos}><label>Início<input type="date" min="2026-01-01" max="2026-12-31" required value={config.inicio} disabled={dados.inscricoes.length > 0} onChange={e => setConfig({...config, inicio: e.target.value})}/></label><label>Fim (23h59 em Lisboa)<input type="date" min={config.inicio} max="2026-12-31" required value={config.fim} disabled={dados.inscricoes.length > 0} onChange={e => setConfig({...config, fim: e.target.value})}/></label></div>
          <div className={css.campos}><label>Casa central — avião<select value={config.centro} disabled={dados.inscricoes.length > 0} onChange={e => setConfig({...config, centro: e.target.value as ConfiguracaoBF["centro"]})}><option value="livre">Casa livre</option><option value="reserva5k">Exige uma reserva de 5.000 €</option></select></label><label>Faturação para os 3 milhões<select value={config.periodoFaturacao} onChange={e => setConfig({...config, periodoFaturacao: e.target.value as ConfiguracaoBF["periodoFaturacao"]})}><option value="desafio">Durante o desafio</option><option value="anual">Acumulado do ano até ao fim do desafio</option></select></label></div>
          <label>Prémio da primeira linha<input required maxLength={400} value={config.premioLinha} onChange={e => setConfig({...config, premioLinha: e.target.value})}/></label>
          <label>Prémio do bingo<input required maxLength={400} value={config.premioBingo} onChange={e => setConfig({...config, premioBingo: e.target.value})}/></label>
          <button disabled={ocupado} type="submit">Guardar configuração</button>
        </form>
      </details>}
      <section className={css.bloco}><h2>Participantes e ordem dos bingos</h2><p className={css.nota}>O cartão avança com os envios pendentes. Os prémios exigem validação. A hora do bingo corresponde ao envio do último comprovativo necessário, nunca à aprovação. A ordem pode mudar enquanto houver comprovativos por rever.</p>
        {primeiroConfirmado && <p className={css.aviso}>Primeiro bingo validado até agora: <b>{primeiroConfirmado.nome}</b> · {dataHora(primeiroConfirmado.confirmado.bingoEm!)}. A atribuição final depende da revisão dos restantes cartões.</p>}
        {!participantes.length ? <p>Ainda não há reservas enviadas.</p> : <div className={css.tabela}><table><thead><tr><th>TP</th><th>Casas</th><th>Primeira linha</th><th>Bingo</th><th>Hora de conclusão</th></tr></thead><tbody>{participantes.map(p => <tr key={p.email}><td><strong>{p.nome}</strong><small>{p.email}</small></td><td>{p.progresso.casas}/25<small>{p.confirmado.casas} confirmadas{dados.config.centro === "livre" ? " (inclui avião)" : ""}</small></td><td>{p.confirmado.linhas.length ? "Validada · 1 prémio" : p.progresso.linhas.length ? "Em validação" : "Por completar"}</td><td>{p.confirmado.bingo ? "Validado" : p.progresso.bingo ? "Em validação" : "Por completar"}</td><td>{p.progresso.bingoEm ? dataHora(p.progresso.bingoEm) : "—"}</td></tr>)}</tbody></table></div>}
      </section>
      <section className={css.bloco}><h2>Validar comprovativos</h2><div className={css.filtros}><label>Estado<select value={filtro} onChange={e => setFiltro(e.target.value)}><option value="pendente">Em validação</option><option value="aprovada">Aprovadas</option><option value="recusada">Recusadas</option><option value="todas">Todas</option></select></label><label>Pesquisar<input type="search" value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="TP, email, referência ou casa"/></label></div>
        {!visiveis.length && <p>Sem comprovativos nesta seleção.</p>}
        <div className={css.reservas}>{visiveis.map(i => <article className={css.reserva} key={i.id}>
          <div className={css.reservaTopo}><div><span className={css.selo}>CASA {i.casa + 1} · {i.estado.toUpperCase()}</span><h3>{CASAS_BF[i.casa]} {i.curinga && <span className={css.badge}>JOKER 5K</span>}</h3><strong>{i.nome}</strong><small>{i.email}</small></div><strong>{euros(i.valorCentimos / 100)}</strong></div>
          <p>Referência <b>{i.referencia}</b> · Reserva de {i.dataReserva.split("-").reverse().join("/")}<br/>Enviada em {dataHora(i.enviadoEm)}</p>
          <a className={css.comprovativo} href={`/api/admin/blackfriday/comprovativo/${i.id}${simulacao ? "?modo=simulacao" : ""}`} target="_blank" rel="noreferrer">Abrir comprovativo ↗<small>{i.ficheiroNome}</small></a>
          {i.motivo && <p><b>Última revisão:</b> {i.motivo}</p>}
          <label>Motivo / nota de revisão<textarea maxLength={1000} rows={2} value={motivos[i.id] ?? ""} onChange={e => setMotivos({...motivos, [i.id]: e.target.value})} placeholder="Obrigatório ao recusar; o TP verá o motivo"/></label>
          <div className={css.acoes}><button type="button" disabled={ocupado || i.estado === "aprovada"} onClick={() => rever(i, "aprovada")}>Aprovar</button><button type="button" className={css.recusar} disabled={ocupado || i.estado === "recusada"} onClick={() => rever(i, "recusada")}>Recusar</button></div>
          {!!i.revisoes.length && <details className={css.historico}><summary>Histórico de revisões ({i.revisoes.length})</summary>{i.revisoes.map((r, n) => <p key={n}>{dataHora(r.em)} · {r.estado}{r.motivo ? ` · ${r.motivo}` : ""}</p>)}</details>}
        </article>)}</div>
      </section>
    </>}
  </main>;
}
