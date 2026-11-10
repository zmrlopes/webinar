"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CASAS_BF, resumirBF, type ConfiguracaoBF, type FaturacaoBF, type InscricaoBF } from "@/lib/blackfriday";
import { podeVerAreaEquipa } from "@/lib/lideres-equipa";
import { favoritoEquipaNegocio, MYOFFICE_EQUIPA } from "@/lib/equipa-negocio-ponte";
import type { EstatisticasEquipa } from "@/lib/lideres-equipa-servidor";
import { lerEmailGuardado } from "../../armazenamento";
import css from "./equipa.module.css";

const euros = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const dataHora = (v: string) => new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(new Date(v));
const NOMES_ESTADO: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada" };

interface DadosEquipaBF { nome: string; meta: number; config: ConfiguracaoBF; reservas: InscricaoBF[]; faturacao: FaturacaoBF | null; estatisticas: EstatisticasEquipa; hoje: string }

export default function PaginaEquipaBlackfriday() {
  const [email, setEmail] = useState("");
  const [acesso, setAcesso] = useState<"a-confirmar" | "negado" | "autorizado">("a-confirmar");
  const [dados, setDados] = useState<DadosEquipaBF | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pesquisaConsultor, setPesquisaConsultor] = useState("");
  const [consultorSelecionado, setConsultorSelecionado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "aprovada" | "recusada">("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const favorito = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const conta = lerEmailGuardado()?.trim().toLowerCase() ?? "";
    if (!podeVerAreaEquipa(conta)) { setAcesso("negado"); return; }
    setEmail(conta); setAcesso("autorizado");
  }, []);
  useEffect(() => { favorito.current?.setAttribute("href", favoritoEquipaNegocio(window.location.origin)); }, [acesso]);

  async function carregar() {
    try {
      const r = await fetch("/api/consultor/blackfriday-equipa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, acao: "listar" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível carregar a equipa.");
      setDados(d); setErro("");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível carregar a equipa."); }
  }
  useEffect(() => {
    if (acesso !== "autorizado" || !email) return;
    void carregar();
    const intervalo = setInterval(() => { if (!document.hidden) void carregar(); }, 10_000);
    const aoFocar = () => void carregar();
    window.addEventListener("focus", aoFocar);
    return () => { clearInterval(intervalo); window.removeEventListener("focus", aoFocar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acesso, email]);

  async function rever(i: InscricaoBF, estado: "aprovada" | "recusada") {
    if (ocupado) return;
    setOcupado(true); setErro("");
    try {
      const r = await fetch("/api/consultor/blackfriday-equipa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, acao: "rever", id: i.id, estado, motivo: motivos[i.id] ?? "" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível guardar a revisão.");
      setDados(d);
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível guardar a revisão."); }
    finally { setOcupado(false); }
  }
  async function verComprovativo(i: InscricaoBF) {
    const janela = window.open("about:blank", "_blank"); if (janela) janela.opener = null;
    try {
      const r = await fetch("/api/consultor/blackfriday-equipa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, acao: "comprovativo", id: i.id }) });
      if (!r.ok) throw new Error("Não foi possível abrir o comprovativo.");
      const url = URL.createObjectURL(await r.blob());
      if (janela) janela.location.href = url; else { const a = document.createElement("a"); a.href = url; a.download = i.ficheiroNome; a.click(); }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { janela?.close(); setErro(e instanceof Error ? e.message : "Falha de ligação."); }
  }

  if (acesso === "a-confirmar") return <main className={css.pagina}><p role="status">A confirmar a conta…</p></main>;
  if (acesso === "negado") return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área do consultor</Link>
    <p>Esta área é exclusiva de líderes com equipa própria no desafio BLACKFRIDAY.</p>
  </main>;

  const porConsultor = new Map<string, { nome: string; reservas: InscricaoBF[] }>();
  dados?.reservas.forEach(i => {
    if (!porConsultor.has(i.email)) porConsultor.set(i.email, { nome: i.nome, reservas: [] });
    porConsultor.get(i.email)!.reservas.push(i);
  });
  const participantes = dados ? [...porConsultor.entries()].map(([emailMembro, { nome, reservas }]) => {
    const progresso = resumirBF(reservas, dados.config);
    const confirmado = resumirBF(reservas, dados.config, true);
    return { email: emailMembro, nome, pendentes: reservas.filter(r => r.estado === "pendente").length, progresso, confirmado, ultimaEm: reservas.reduce((m, r) => r.enviadoEm > m ? r.enviadoEm : m, "") };
  }).sort((a, b) => {
    if (a.confirmado.bingoEm && b.confirmado.bingoEm) return a.confirmado.bingoEm.localeCompare(b.confirmado.bingoEm);
    if (a.confirmado.bingoEm) return -1; if (b.confirmado.bingoEm) return 1;
    return b.ultimaEm.localeCompare(a.ultimaEm);
  }) : [];
  const termo = pesquisaConsultor.trim().toLowerCase();
  const participantesFiltrados = participantes.filter(p => !termo || p.nome.toLowerCase().includes(termo) || p.email.includes(termo));

  const detalheReservas = (consultorSelecionado && dados ? porConsultor.get(consultorSelecionado)?.reservas ?? [] : [])
    .filter(i => filtro === "todas" || i.estado === filtro)
    .filter(i => { const t = pesquisa.trim().toLowerCase(); return !t || i.referencia.toLowerCase().includes(t) || CASAS_BF[i.casa]!.toLowerCase().includes(t); })
    .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));

  const percentagem = dados ? Math.min(100, Math.max(0, (dados.faturacao?.valor ?? 0) / dados.meta * 100)) : 0;

  return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área do consultor</Link>
    <header className={css.cabecalho}><span className={css.etiqueta}>A TUA EQUIPA · DESAFIO BLACKFRIDAY</span><h1>Equipa de {dados?.nome ?? "…"}</h1></header>
    {erro && <p role="alert" className={css.erro}>{erro} <button type="button" onClick={() => void carregar()}>Tentar novamente</button></p>}

    {dados && <section className={css.meta}>
      <div className={css.metaTopo}><span>Meta da equipa</span><span>{percentagem.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%</span></div>
      <div className={css.numeros}><strong>{dados.faturacao ? euros(dados.faturacao.valor) : "Por atualizar"}</strong><span> / {euros(dados.meta)}</span></div>
      <div className={css.barra}><span style={{ width: `${percentagem}%` }} /></div>
      <small>{dados.faturacao ? `Dados até ${dados.faturacao.fim} · Atualizado em ${dataHora(dados.faturacao.atualizadoEm)}` : "Ainda sem dados — atualiza pelo favorito abaixo."}</small>
      <div className={css.estatisticas}>
        <div><b>{dados.estatisticas.total}</b><span>na equipa</span></div>
        <div><b>{dados.estatisticas.ativos}</b><span>ativos</span></div>
        <div><b>{dados.estatisticas.entradasEsteAno}</b><span>entradas este ano</span></div>
      </div>
    </section>}

    <details className={css.favorito}>
      <summary>Atualizar a faturação da equipa pelo MyOffice</summary>
      <div className={css.favoritoCorpo}>
        <p><strong>Instala uma vez:</strong> arrasta este botão para a barra de favoritos do browser.</p>
        <a ref={favorito} className={css.botao} draggable onClick={e => e.preventDefault()}>Atualizar a minha equipa</a>
        <ol><li>Abre o <a href={MYOFFICE_EQUIPA} target="_blank" rel="noopener noreferrer">MyOffice</a> e entra com a tua conta.</li><li>No separador do MyOffice, clica no favorito <strong>Atualizar a minha equipa</strong>.</li><li>Mantém as duas janelas abertas até terminar.</li></ol>
      </div>
    </details>

    <section className={css.lista}>
      <h2>Consultores da equipa</h2>
      <input className={css.procurar} type="search" placeholder="Procurar por nome ou email" value={pesquisaConsultor} onChange={e => setPesquisaConsultor(e.target.value)} aria-label="Procurar consultor" />
      {!participantesFiltrados.length && <p className={css.vazio}>Ainda não há envios da equipa.</p>}
      <table className={css.tabela}><tbody>
        {participantesFiltrados.map(p => <tr key={p.email}>
          <td><button type="button" onClick={() => { setConsultorSelecionado(p.email); setFiltro("todas"); setPesquisa(""); }}>{p.nome}</button></td>
          <td>{p.progresso.casas}/25 casas</td>
          <td>{p.confirmado.bingo ? "Bingo validado" : p.progresso.bingo ? "Bingo (a validar)" : p.confirmado.linhas.length ? "Linha validada" : "Em progresso"}</td>
          <td>{p.pendentes > 0 ? `${p.pendentes} por rever` : "—"}</td>
        </tr>)}
      </tbody></table>
    </section>

    {consultorSelecionado && <section className={css.detalhe} aria-label={`Reservas de ${porConsultor.get(consultorSelecionado)?.nome ?? consultorSelecionado}`}>
      <div className={css.tituloDetalhe}><h2>Reservas de {porConsultor.get(consultorSelecionado)?.nome ?? consultorSelecionado}</h2><button type="button" onClick={() => setConsultorSelecionado(null)}>Fechar</button></div>
      <div className={css.filtros}>
        <div role="group" aria-label="Filtrar por estado">{(["todas", "pendente", "aprovada", "recusada"] as const).map(f => <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{f === "todas" ? "Todas" : NOMES_ESTADO[f]}</button>)}</div>
        <input type="search" placeholder="Procurar por referência ou casa" value={pesquisa} onChange={e => setPesquisa(e.target.value)} aria-label="Procurar reserva" />
      </div>
      {!detalheReservas.length && <p className={css.vazio}>Nenhuma reserva neste filtro.</p>}
      {detalheReservas.map(i => <article key={i.id} className={css.reserva}>
        <div className={css.reservaTopo}><strong>{CASAS_BF[i.casa]}</strong><span className={css.pilula} data-estado={i.estado}>{NOMES_ESTADO[i.estado]}</span>{i.curinga && <span className={css.joker}>JOKER 5K</span>}</div>
        <p>{i.referencia} · {euros(i.valorCentimos / 100)} · {i.dataReserva} · enviado {dataHora(i.enviadoEm)}</p>
        <button type="button" onClick={() => void verComprovativo(i)}>Abrir comprovativo</button>
        {i.motivo && <p className={css.motivoAnterior}>Última revisão: {i.motivo}</p>}
        <label>Motivo (obrigatório para recusar)<textarea maxLength={1000} value={motivos[i.id] ?? ""} onChange={e => setMotivos(m => ({ ...m, [i.id]: e.target.value }))} /></label>
        <div className={css.acoesReserva}>
          <button type="button" className={css.aprovar} disabled={ocupado} onClick={() => void rever(i, "aprovada")}>Aprovar</button>
          <button type="button" className={css.recusar} disabled={ocupado} onClick={() => void rever(i, "recusada")}>Recusar</button>
        </div>
        {!!i.revisoes.length && <details><summary>Histórico ({i.revisoes.length})</summary><ul>{i.revisoes.map((r, k) => <li key={k}>{NOMES_ESTADO[r.estado]} em {dataHora(r.em)}{r.motivo ? ` · ${r.motivo}` : ""}</li>)}</ul></details>}
      </article>)}
    </section>}
  </main>;
}
