"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { progressoCoreDireto, type DadosCoreDiretos } from "@/lib/core-rank-diretos";

const euros = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const data = (s: string) => s.split("-").reverse().join("/");

export function CoreRankDiretosCliente({ dados }: { dados: DadosCoreDiretos | null }) {
  const router = useRouter();
  const grupo = dados?.grupo;
  const pendentes = grupo?.membros.filter(m => !m.username) ?? [];
  const [conta, setConta] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [inativos, setInativos] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const linhas = (dados?.consultores ?? []).filter(c => (!conta || c.conta === conta)
    && (grupo || inativos || /^(ativo|active)$/i.test(c.estado))
    && `${c.nome} ${c.email} ${c.username} ${c.nomesWhatsapp?.join(" ") ?? ""}`.toLowerCase().includes(pesquisa.toLowerCase()))
    .map(c => ({ c, p: progressoCoreDireto(c) }))
    .sort((a, b) => Number(b.p.concluido) - Number(a.p.concluido) || b.p.ativos - a.p.ativos || b.p.novos - a.p.novos || b.p.reservas - a.p.reservas || a.c.nome.localeCompare(b.c.nome, "pt"));

  async function importar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOcupado(true); setMensagem("");
    try {
      const response = await fetch("/api/admin/dashboard-negocio/core-rank-diretos", { method: "POST", body: new FormData(event.currentTarget) });
      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.erro ?? "Não foi possível importar.");
      setMensagem(`${resultado.consultores} consultores atualizados.`); router.refresh();
    } catch (e) { setMensagem(e instanceof Error ? e.message : "Não foi possível importar."); }
    finally { setOcupado(false); }
  }

  async function associar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const valores = new FormData(form);
    setOcupado(true); setMensagem("");
    try {
      const response = await fetch("/api/admin/dashboard-negocio/core-rank-diretos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indice: Number(valores.get("indice")), nome: valores.get("nome"), email: valores.get("email") }),
      });
      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.erro ?? "Não foi possível associar.");
      setMensagem(`${valores.get("nome")} associado à conta indicada.${resultado.atualizar ? " Usa a ferramenta Atualizar dados para recolher os seus números." : ""}`);
      form.reset(); router.refresh();
    } catch (e) { setMensagem(e instanceof Error ? e.message : "Não foi possível associar."); }
    finally { setOcupado(false); }
  }

  return <section className="crd">
    <style>{`
      .crd { margin-bottom: 2rem; }
      .crd h2 { margin: 0 0 .5rem; font-size: 1.3rem; }
      .crd-controls { display:flex; gap:.75rem; flex-wrap:wrap; align-items:center; margin:1rem 0; }
      .crd-controls > label { display:flex; align-items:center; gap:.5rem; }
      .crd-controls input[type=checkbox] { width:auto; margin:0; }
      .crd input,.crd select,.crd textarea { padding:.65rem; border:1px solid #cdd0bf; border-radius:8px; max-width:100%; background:white; color:#111; font:inherit; }
      .crd-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr)); gap:1rem; }
      .crd-card { border:1px solid #daddce; border-radius:12px; padding:1.1rem; background:#fff; }
      .crd-card h3 { font-size:1rem; margin:0 0 .3rem; }
      .crd-account { color:#6b6a63; font-size:.8rem; overflow-wrap:anywhere; }
      .crd-card ul { padding-left:1.1rem; margin:.9rem 0; line-height:1.85; }
      .crd-ok { color:#4b5320; font-weight:700; }
      .crd-card summary,.crd-import summary { cursor:pointer; color:#4b5320; }
      .crd-new { border-top:1px solid #eceee3; margin-top:.6rem; padding-top:.6rem; font-size:.85rem; }
      .crd-import { margin:1rem 0 1.5rem; border:1px solid #daddce; padding:1rem; border-radius:10px; }
      .crd-import form { display:grid; gap:.8rem; margin-top:1rem; }
      .crd-import label { display:grid; gap:.3rem; }
      .crd button { background:#4b5320; color:white; border:0; padding:.75rem 1rem; border-radius:8px; cursor:pointer; }
      .crd button:disabled { opacity:.6; cursor:wait; }
    `}</style>
    <p role="status" aria-live="polite">{mensagem}</p>
    <h2>{grupo ? `Core Rank · ${grupo.nome}` : "Core Rank · Os nossos diretos"}</h2>
    <p className="dn-nota">{grupo ? "Novos Travel Partners, ativos e faturação pessoal dos membros deste grupo, independentemente da sua posição na árvore. Os novos TPs angariados por cada membro contam mesmo que não estejam no grupo." : "Novos Travel Partners, ativos e faturação pessoal desde o início do período. Só entram os TPs imediatamente abaixo das contas selecionadas; as próprias contas ficam excluídas."}</p>
    {dados ? <>
      <p className="dn-nota"><b>{data(dados.desde)} a {data(dados.ate)}</b> · Consultado em {new Date(dados.atualizadoEm).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}. Fonte da árvore: exportação do Analisador de Organização do MyOffice. {dados.consultores.length > 0 && dados.consultores.every(c => c.verificacaoCore) && "Reservas e subscrições conferidas também nos cartões Core Rank do MyOffice."}</p>
      {grupo && <p className="dn-nota">Lista de {grupo.membros.length} membros conferida no WhatsApp em {new Date(grupo.consultadoEm).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}. Entradas e saídas posteriores exigem nova conferência da lista.</p>}
      <div className="crd-controls">
        {!grupo && <label>Conta <select value={conta} onChange={e => setConta(e.target.value)}><option value="">Todas as contas</option>{dados.contas.map(c => <option key={c.email} value={c.email}>{c.nome} · {c.email}</option>)}</select></label>}
        <input aria-label={grupo ? "Pesquisar membros do grupo" : "Pesquisar diretos"} placeholder="Pesquisar um TP…" value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
        {!grupo && <label><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar também inativos</label>}
      </div>
      <div className="dn-stats">
        {grupo && <div className="dn-stat"><div className="dn-stat-v">{grupo.membros.length}</div><div className="dn-stat-l">membros no WhatsApp · {pendentes.length} por identificar</div></div>}
        <div className="dn-stat"><div className="dn-stat-v">{linhas.length}</div><div className="dn-stat-l">{grupo ? "consultores identificados nesta vista" : "TPs diretos nesta vista"}</div></div>
        <div className="dn-stat"><div className="dn-stat-v">{linhas.reduce((s, l) => s + l.p.novos, 0)}</div><div className="dn-stat-l">novos TPs angariados</div></div>
        <div className="dn-stat"><div className="dn-stat-v">{linhas.filter(l => l.p.concluido).length}</div><div className="dn-stat-l">atingiram o Core Rank</div></div>
      </div>
      {pendentes.length > 0 && <details className="crd-import" open><summary>Por identificar no MyOffice ({pendentes.length})</summary><p className="dn-nota">Indica o email exato da conta MyOffice e clica em Associar. A correspondência fica guardada. Os números são recolhidos pela ferramenta Atualizar dados.</p>{grupo!.membros.map((m, i) => !m.username && <form key={`${i}-${m.nome}`} onSubmit={associar}>
        <input type="hidden" name="indice" value={i} /><input type="hidden" name="nome" value={m.nome} />
        <div className="crd-controls"><b>{m.nome}</b><input type="email" name="email" aria-label={`Email de ${m.nome}`} placeholder="Email da conta MyOffice" required disabled={ocupado} /><button disabled={ocupado}>Associar</button></div>
        <small>{m.motivo ?? "Identidade por confirmar."}</small>
      </form>)}</details>}
      {grupo && <details className="crd-import"><summary>Ver a lista de membros ({grupo.membros.length})</summary><ul>{grupo.membros.map((m, i) => <li key={i}>{m.nome} · {m.username ? dados.consultores.find(c => c.username.toLowerCase() === m.username!.toLowerCase())?.nome ?? m.username : "Por identificar"}</li>)}</ul><p className="dn-nota">Se dois contactos corresponderem à mesma conta MyOffice, partilham um único cartão para não duplicar os totais.</p></details>}
      <p className="dn-nota">O cartão Core Rank do MyOffice acompanha reservas próprias e subscrições diretas (metas indicadas em cada cartão). «Ativos» acompanha, separadamente, os novos TPs diretos com pelo menos {euros(1000)} de reservas pessoais na exportação. Os novos TPs dos níveis seguintes pertencem à estrutura, não à contagem direta.</p>
      <div className="crd-list">{linhas.map(({ c, p }) => <article className="crd-card" key={c.email}>
        <h3>{c.nome}</h3><div className="crd-account">@{c.username}{dados.contas.find(a => a.email === c.conta)?.nome && ` · ${dados.contas.find(a => a.email === c.conta)!.nome}`}</div>
        {grupo && c.nomesWhatsapp && <div className="crd-account">No grupo: {c.nomesWhatsapp.join(" · ")}</div>}
        {!/^(ativo|active)$/i.test(c.estado) && <div className="crd-account">{c.estado}</div>}
        <ul>
          <li className={p.novos >= p.metaNovos ? "crd-ok" : undefined}>{p.novos}/{p.metaNovos} Travel Partners {p.novos >= p.metaNovos ? "✓" : ""}</li>
          <li className={p.ativos >= p.metaNovos ? "crd-ok" : undefined}>{p.ativos}/{p.metaNovos} ativos {p.ativos >= p.metaNovos ? "✓" : ""}</li>
          <li className={p.reservasOk ? "crd-ok" : undefined}>{euros(p.reservas)} de faturação {p.reservasOk ? "✓" : ""}</li>
        </ul>
        {p.concluido && <p className="crd-ok">Core Rank · objetivos atingidos ✓</p>}
        {c.verificacaoCore && <p className="dn-nota">Conferido no MyOffice em {new Date(c.verificacaoCore.consultadoEm).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · meta de reservas: {euros(p.metaReservas)}.</p>}
        {c.verificacaoCore && Math.abs(c.verificacaoCore.reservas - c.reservas) >= 0.01 && <p className="dn-nota">A exportação indica {euros(c.reservas)} em reservas pessoais. Acima aparece o valor do cartão Core Rank do MyOffice.</p>}
        {c.verificacaoCore && c.verificacaoCore.subscricoes !== c.novos.length && <p className="dn-nota">O cartão Core Rank indica {c.verificacaoCore.subscricoes} subscrições; a árvore identifica {c.novos.length} novos TPs diretos por data de entrada. Confirmar a diferença.</p>}
        {c.subscricoes !== p.novos && <p className="dn-nota">O MyOffice indica {c.subscricoes} novas subscrições no filtro; a árvore identifica {p.novos} novos TPs por data de entrada. Confirmar esta diferença.</p>}
        {c.novos.length > 0 && <details><summary>Ver os novos TPs ({c.novos.length})</summary>{c.novos.map(n => <div className="crd-new" key={n.email}><b>{n.nome}</b><br />Entrada: {n.entrada && data(n.entrada)}<br />{euros(n.reservas)} em reservas {n.reservas >= 1000 ? "✓ Ativado" : `· faltam ${euros(1000 - n.reservas)}`}</div>)}</details>}
      </article>)}</div>
      {linhas.length === 0 && <p>Nenhum TP corresponde aos filtros selecionados.</p>}
    </> : <p className="dn-nota">Ainda não foi carregada a exportação do MyOffice para esta vista.</p>}
    {grupo ? <p className="dn-nota"><a href="/admin/dashboard-negocio/atualizar">Atualizar dados →</a> Usa a ferramenta existente para atualizar os números do grupo. Não é necessário importar ficheiros.</p> : <details className="crd-import" open={!dados}>
      <summary>Atualizar dados do MyOffice</summary>
      <form onSubmit={importar}>
        <input type="hidden" name="ambito" value={grupo ? "grupo" : "diretos"} />
        <p className="dn-nota">No Analisador de Organização, seleciona o período e exporta a árvore completa em Excel. Indica abaixo exatamente o mesmo período: o ficheiro não permite verificar o filtro de datas das reservas.</p>
        <label>Exportação da organização<input type="file" name="ficheiro" accept=".xlsx" required /></label>
        {!grupo && <label>Emails das contas a agregar<textarea name="contas" rows={3} defaultValue={dados?.contas.map(c => c.email).join("\n")} required /></label>}
        {grupo && <p className="dn-nota">Esta importação atualiza os números das contas já identificadas e mantém a lista do grupo acima.</p>}
        <div className="crd-controls"><label>Desde<input type="date" name="desde" defaultValue={dados?.desde ?? "2026-10-01"} required /></label><label>Até<input type="date" name="ate" defaultValue={dados?.ate ?? "2026-10-31"} required /></label></div>
        <button disabled={ocupado}>{ocupado ? "A atualizar…" : "Importar e atualizar"}</button>
      </form>
    </details>}
  </section>;
}
