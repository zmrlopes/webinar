import { FATURACAO_TROFEUS, NIVEIS_TROFEUS, obterTrofeus } from "@/lib/dashboard-negocio";

const NOME_NIVEL: Record<string, string> = {
  JUNIOR: "Júnior",
  SENIOR: "Sénior",
  MASTER: "Master",
  COORDENADOR: "Coordenador",
  DIRETOR: "Diretor",
};

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}

/** Servidor: lê a base de dados ao vivo, nada fica escrito no código. */
export async function TrofeusPainel(): Promise<React.JSX.Element> {
  const { linhas, contagem, atualizadoEm } = await obterTrofeus();

  const colunasNivel = NIVEIS_TROFEUS;
  const colunasFat = FATURACAO_TROFEUS.map((m) => m / 1000);

  return (
    <div>
      <p className="dn-nota">
        Cada consultor ativo e os troféus a que tem direito: o do seu patamar e os de baixo, mais cada escalão de
        faturação própria que já passou. Vem da base de dados do site, atualizado a {dataCurta(atualizadoEm)}. Para
        saber quantos encomendar, olha para a linha de totais no fundo.
      </p>

      <div className="dn-cartao">
        <table className="dn-tabela dn-trofeus">
          <thead>
            <tr>
              <th>Consultor</th>
              <th className="dn-num">Faturação própria</th>
              {colunasNivel.map((n) => (
                <th key={n} className="dn-c">
                  {NOME_NIVEL[n]}
                </th>
              ))}
              {colunasFat.map((f) => (
                <th key={f} className="dn-c">
                  {f}K
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.nome}>
                <td>
                  <strong>{l.nome}</strong>
                  {l.nivel && <span className="dn-nivel"> · {NOME_NIVEL[l.nivel]}</span>}
                </td>
                <td className="dn-num">{l.vendas.toLocaleString("pt-PT")} €</td>
                {colunasNivel.map((n) => (
                  <td key={n} className="dn-c">
                    {l.patamares.includes(n) ? <span className="dn-sim">✓</span> : <span className="dn-nao">·</span>}
                  </td>
                ))}
                {colunasFat.map((f) => (
                  <td key={f} className="dn-c">
                    {l.faturacao.includes(f) ? <span className="dn-sim">✓</span> : <span className="dn-nao">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <strong>Total a encomendar</strong>
              </td>
              {colunasNivel.map((n) => (
                <td key={n} className="dn-c">
                  <strong>{contagem[`nivel:${n}`] ?? 0}</strong>
                </td>
              ))}
              {colunasFat.map((f) => (
                <td key={f} className="dn-c">
                  <strong>{contagem[`fat:${f}`] ?? 0}</strong>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="dn-rodape">
        {linhas.length} consultores ativos com pelo menos um troféu. A marca é a que os dados dão (patamar + faturação);
        o cruzamento com quem já declarou tê-lo recebido no questionário fica para juntar a seguir, tal como no artefacto.
      </p>
    </div>
  );
}
