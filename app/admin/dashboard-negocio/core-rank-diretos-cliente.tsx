"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { progressoCoreDireto, type DadosCoreDiretos } from "@/lib/core-rank-diretos";

const euros = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const data = (s: string) => s.split("-").reverse().join("/");

export function CoreRankDiretosCliente({ dados }: { dados: DadosCoreDiretos | null }) {
  const router = useRouter();
  const [conta, setConta] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [inativos, setInativos] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const linhas = (dados?.consultores ?? []).filter(c => (!conta || c.conta === conta)
    && (inativos || /^(ativo|active)$/i.test(c.estado))
    && `${c.nome} ${c.email} ${c.username}`.toLowerCase().includes(pesquisa.toLowerCase()))
    .map(c => ({ c, p: progressoCoreDireto(c) }))
    .sort((a, b) => Number(b.p.concluido) - Number(a.p.concluido) || b.p.ativos - a.p.ativos || b.p.novos - a.p.novos || b.c.reservas - a.c.reservas || a.c.nome.localeCompare(b.c.nome, "pt"));

  async function importar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOcupado(true); setMensagem("");
    try {
      const response = await fetch("/api/admin/dashboard-negocio/core-rank-diretos", { method: "POST", body: new FormData(event.currentTarget) });
      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.erro ?? "Não foi possível importar.");
      setMensagem(`${resultado.consultores} diretos atualizados.`); router.refresh();
    } catch (e) { setMensagem(e instanceof Error ? e.message : "Não foi possível importar."); }
    finally { setOcupado(false); }
  }

  return <section className="crd">
    <style>{`
      .crd { margin-bottom: 2rem; }
      .crd h2 { margin: 0 0 .5rem; font-size: 1.3rem; }
      .crd-controls { display:flex; gap:.75rem; flex-wrap:wrap; align-items:center; margin:1rem 0; }
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
    <h2>Core Rank · Os nossos diretos</h2>
    <p className="dn-nota">Novos Travel Partners, ativos e faturação pessoal desde o início do período. Só entram os TPs imediatamente abaixo das contas selecionadas; as próprias contas ficam excluídas.</p>
    {dados ? <>
      <p className="dn-nota"><b>{data(dados.desde)} a {data(dados.ate)}</b> · Consultado em {new Date(dados.atualizadoEm).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}. Fonte: exportação do Analisador de Organização do MyOffice.</p>
      <div className="crd-controls">
        <label>Conta <select value={conta} onChange={e => setConta(e.target.value)}><option value="">Todas as contas</option>{dados.contas.map(c => <option key={c.email} value={c.email}>{c.nome} · {c.email}</option>)}</select></label>
        <input aria-label="Pesquisar diretos" placeholder="Pesquisar um TP…" value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
        <label><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar também inativos</label>
      </div>
      <div className="dn-stats">
        <div className="dn-stat"><div className="dn-stat-v">{linhas.length}</div><div className="dn-stat-l">TPs diretos nesta vista</div></div>
        <div className="dn-stat"><div className="dn-stat-v">{linhas.reduce((s, l) => s + l.p.novos, 0)}</div><div className="dn-stat-l">novos TPs angariados</div></div>
        <div className="dn-stat"><div className="dn-stat-v">{linhas.filter(l => l.p.concluido).length}</div><div className="dn-stat-l">atingiram os três objetivos</div></div>
      </div>
      <p className="dn-nota">Objetivos: 3 novos TPs diretos, 3 desses TPs com pelo menos {euros(1000)} de reservas pessoais e {euros(3000)} de reservas próprias. «Ativos» refere-se a esse volume de reservas dos novos TPs. Os valores de reservas respeitam o filtro aplicado na exportação.</p>
      <div className="crd-list">{linhas.map(({ c, p }) => <article className="crd-card" key={c.email}>
        <h3>{c.nome}</h3><div className="crd-account">@{c.username} · {dados.contas.find(a => a.email === c.conta)?.nome}</div>
        {!/^(ativo|active)$/i.test(c.estado) && <div className="crd-account">{c.estado}</div>}
        <ul>
          <li className={p.novos >= 3 ? "crd-ok" : undefined}>{p.novos}/3 Travel Partners {p.novos >= 3 ? "✓" : ""}</li>
          <li className={p.ativos >= 3 ? "crd-ok" : undefined}>{p.ativos}/3 ativos {p.ativos >= 3 ? "✓" : ""}</li>
          <li className={p.reservasOk ? "crd-ok" : undefined}>{euros(c.reservas)} de faturação {p.reservasOk ? "✓" : ""}</li>
        </ul>
        {p.concluido && <p className="crd-ok">Core Rank · objetivos atingidos ✓</p>}
        {c.subscricoes !== p.novos && <p className="dn-nota">O MyOffice indica {c.subscricoes} novas subscrições no filtro; a árvore identifica {p.novos} novos TPs por data de entrada. Confirmar esta diferença.</p>}
        {c.novos.length > 0 && <details><summary>Ver os novos TPs ({c.novos.length})</summary>{c.novos.map(n => <div className="crd-new" key={n.email}><b>{n.nome}</b><br />Entrada: {n.entrada && data(n.entrada)}<br />{euros(n.reservas)} em reservas {n.reservas >= 1000 ? "✓ Ativado" : `· faltam ${euros(1000 - n.reservas)}`}</div>)}</details>}
      </article>)}</div>
      {linhas.length === 0 && <p>Nenhum TP corresponde aos filtros selecionados.</p>}
    </> : <p className="dn-nota">Ainda não foi carregada a exportação do MyOffice para esta vista.</p>}
    <details className="crd-import" open={!dados}>
      <summary>Atualizar dados do MyOffice</summary>
      <form onSubmit={importar}>
        <p className="dn-nota">No Analisador de Organização, seleciona o período e exporta a árvore completa em Excel. Indica abaixo exatamente o mesmo período: o ficheiro não permite verificar o filtro de datas das reservas.</p>
        <label>Exportação da organização<input type="file" name="ficheiro" accept=".xlsx" required /></label>
        <label>Emails das contas a agregar<textarea name="contas" rows={3} defaultValue={dados?.contas.map(c => c.email).join("\n")} required /></label>
        <div className="crd-controls"><label>Desde<input type="date" name="desde" defaultValue={dados?.desde ?? "2026-10-01"} required /></label><label>Até<input type="date" name="ate" defaultValue={dados?.ate ?? "2026-10-31"} required /></label></div>
        <button disabled={ocupado}>{ocupado ? "A atualizar…" : "Importar e atualizar"}</button>
        <p role="status">{mensagem}</p>
      </form>
    </details>
  </section>;
}
