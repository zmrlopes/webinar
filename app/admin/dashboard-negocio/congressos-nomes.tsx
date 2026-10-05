import { lerConfig } from "@/lib/dashboard-negocio";

/**
 * Quem foi a cada congresso, pelo nome — lido de dashboard_config
 * ("congressos_nomes"), nunca do código, porque o repositório é público.
 * Só congressos (a Convenção fica de fora). Presença = bilhete no MyOffice;
 * nos congressos em que houve check-in, assinala-se quem o fez.
 */
interface DadosCongressosNomes {
  atualizadoEm: string;
  congressos: {
    id: string;
    cat: string;
    data: string;
    bilhetes: number;
    compra: string;
    usaCheckin: boolean;
    /** Consultores com bilhete, pelo nome de quem foi (não de quem comprou). */
    pessoas: { u: string; n: string; ci: boolean }[];
    /** Clientes (não consultores) com bilhete comprado pela equipa. */
    clientes?: string[];
  }[];
}

export async function CongressosNomes(): Promise<React.JSX.Element | null> {
  const dados = await lerConfig<DadosCongressosNomes>("congressos_nomes");
  if (!dados) return null;

  const congressos = dados.congressos.filter((c) => c.pessoas.length > 0);
  const recentes = [...congressos].reverse();

  // Por pessoa: a que congressos foi
  const porPessoa = new Map<string, { n: string; u: string; foi: string[] }>();
  for (const c of congressos)
    for (const p of c.pessoas) {
      if (!porPessoa.has(p.u)) porPessoa.set(p.u, { n: p.n, u: p.u, foi: [] });
      porPessoa.get(p.u)!.foi.push(`${c.cat} ${c.data}`);
    }
  const pessoas = [...porPessoa.values()].sort((a, b) => b.foi.length - a.foi.length || a.n.localeCompare(b.n, "pt"));

  return (
    <div>
      <style>{`
        .cn-cong { border-bottom: 1px solid #eeeeee; }
        .cn-cong:last-child { border-bottom: none; }
        .cn-cong summary { cursor: pointer; padding: 0.75rem 0.2rem; display: flex; gap: 0.75rem; align-items: baseline; flex-wrap: wrap; list-style: none; }
        .cn-cong summary::-webkit-details-marker { display: none; }
        .cn-cong summary::before { content: "▸"; color: #4b5320; font-size: 0.8rem; }
        .cn-cong[open] summary::before { content: "▾"; }
        .cn-cong-nome { font-weight: 700; }
        .cn-cong-meta { color: #6b6a63; font-size: 0.82rem; }
        .cn-cong-n { margin-left: auto; font-weight: 700; font-variant-numeric: tabular-nums; }
        .cn-lista { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 0.2rem 0.9rem 1.2rem; }
        .cn-pessoa { background: #f3f4ec; border: 1px solid rgba(75,83,32,0.18); border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.84rem; }
        .cn-pessoa.ci { background: #e6f1dc; border-color: rgba(12,163,12,0.35); }
        .cn-pessoa .cn-ci { color: #0ca30c; font-weight: 700; margin-left: 0.3rem; }
        .cn-foi { color: #6b6a63; font-size: 0.8rem; line-height: 1.5; }
      `}</style>

      <h2 className="dn-h2">Quem foi a cada congresso</h2>
      <p className="dn-sub">
        Pelo nome, do mais recente para o mais antigo. A Convenção fica de fora. Presença = ter bilhete no MyOffice;{" "}
        <span style={{ color: "#0ca30c", fontWeight: 700 }}>✓</span> = o MyOffice tem o check-in registado (às vezes
        falta mesmo a quem esteve lá, por isso não contes com ele para saber quem faltou). Tu ficas de fora. Dados a {dados.atualizadoEm}. Clica num congresso para ver os nomes.
      </p>
      <div className="dn-cartao">
        {recentes.map((c) => (
          <details key={c.id} className="cn-cong">
            <summary>
              <span className="cn-cong-nome">{c.cat}</span>
              <span className="cn-cong-meta">
                {c.data} · bilhetes comprados {c.compra} · {c.bilhetes} bilhetes no total
              </span>
              <span className="cn-cong-n">
                {c.pessoas.length} pessoas
                {c.usaCheckin && (
                  <span className="cn-cong-meta" style={{ fontWeight: 400 }}>
                    {" "}
                    ({c.pessoas.filter((p) => p.ci).length} com check-in)
                  </span>
                )}
              </span>
            </summary>
            <div className="cn-lista">
              {c.pessoas.map((p) => (
                <span key={p.u} className={`cn-pessoa${p.ci ? " ci" : ""}`} title={`@${p.u}`}>
                  {p.n}
                  {p.ci && <span className="cn-ci">✓</span>}
                </span>
              ))}
            </div>
            {c.clientes && c.clientes.length > 0 && (
              <div className="cn-foi" style={{ padding: "0 0.2rem 0.9rem 1.2rem" }}>
                Também foram {c.clientes.length} cliente{c.clientes.length > 1 ? "s" : ""} com bilhete da equipa:{" "}
                {c.clientes.join(", ")}.
              </div>
            )}
          </details>
        ))}
      </div>

      <h2 className="dn-h2">Quem foi a mais congressos</h2>
      <p className="dn-sub">{pessoas.length} pessoas da equipa foram a pelo menos um destes congressos.</p>
      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Consultor</th>
              <th className="dn-num">Congressos</th>
              <th>Quais</th>
            </tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.u}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <strong>{p.n}</strong>
                </td>
                <td className="dn-num">
                  <strong>{p.foi.length}</strong>
                </td>
                <td className="cn-foi">{[...p.foi].reverse().join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
