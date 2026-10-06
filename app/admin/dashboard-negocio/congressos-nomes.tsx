import { dataEvento, eventoPrincipal, type DadosEventos } from "@/lib/eventos-dashboard";

export function CongressosNomes({ dados }: { dados: DadosEventos }): React.JSX.Element {
  const hoje = new Date().toISOString().slice(0, 10);
  const eventos = dados.eventos.filter(e => e.pessoas !== null && e.inicio.slice(0, 10) <= hoje).sort((a, b) => b.inicio.localeCompare(a.inicio));
  const porPessoa = new Map<string, { nome: string; eventos: string[] }>();
  for (const e of eventos.filter(eventoPrincipal)) for (const p of e.pessoas ?? []) {
    const chave = (p.email || p.id).toLowerCase();
    if (!porPessoa.has(chave)) porPessoa.set(chave, { nome: p.nome, eventos: [] });
    porPessoa.get(chave)!.eventos.push(e.nome + " · " + dataEvento(e));
  }
  const pessoas = [...porPessoa.entries()].sort((a, b) => b[1].eventos.length - a[1].eventos.length || a[1].nome.localeCompare(b[1].nome, "pt"));
  return <div>
    <h2 className="dn-h2">Inscritos por evento</h2>
    <p className="dn-sub">Nomes recuperados no MyOffice, sem as tuas contas. ✓ indica check-in registado; a falta de check-in não prova ausência. Os titulares identificados dos packs contam uma vez por evento. Take Off, seminários e complementos são apresentados, mas não entram na comparação dos eventos principais.</p>
    <div className="dn-cartao">{eventos.map(e => <details key={e.id} style={{ padding: "0.8rem 0", borderBottom: "1px solid #eee" }}>
      <summary style={{ cursor: "pointer" }}><strong>{e.nome}</strong> · {dataEvento(e)} · {e.pessoas!.length} consultores · {e.pessoas!.filter(p => p.checkin).length} com check-in <span className="dn-sub">({e.tipo})</span></summary>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.75rem" }}>{e.pessoas!.map(p => <span key={p.id} style={{ background: p.checkin ? "#e6f1dc" : "#f3f4ec", borderRadius: 12, padding: "0.3rem 0.6rem" }}>{p.nome}{p.checkin ? " ✓" : ""}</span>)}</div>
      {e.clientes > 0 && <p className="dn-sub">Também foram localizadas {e.clientes} inscrições de clientes, fora da contagem de consultores.</p>}
      {e.nota && <p className="dn-nota">{e.nota}</p>}
    </details>)}</div>
    <h2 className="dn-h2">Inscrições por consultor nos eventos principais</h2>
    <p className="dn-sub">{pessoas.length} consultores identificados nas listas recuperadas. Inclui congressos, convenções e bootcamps.</p>
    <div className="dn-cartao"><table className="dn-tabela"><thead><tr><th>Consultor</th><th className="dn-num">Eventos</th><th>Quais</th></tr></thead><tbody>{pessoas.map(([id, p]) => <tr key={id}><td><strong>{p.nome}</strong></td><td className="dn-num">{p.eventos.length}</td><td>{p.eventos.join("; ")}</td></tr>)}</tbody></table></div>
  </div>;
}
