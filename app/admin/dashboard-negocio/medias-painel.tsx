import { ehContaPropria, lerConfig } from "@/lib/dashboard-negocio";
import { db } from "@/lib/db";
import { type DadosMapas } from "./mapas-cliente";

interface LinhaAno {
  ano: number;
  vendas: number;
  meses: number;
  consultores: number;
  parcial: boolean;
}

const eur = (v: number) => `${Math.round(v).toLocaleString("pt-PT")} €`;
const num = (v: number, d = 1) => v.toLocaleString("pt-PT", { maximumFractionDigits: d });

/**
 * Servidor: médias de venda (reservas) por ano — da equipa inteira e de um
 * consultor da equipa. As vendas mês a mês vêm do snapshot dos Mapas; o número
 * de consultores de cada ano conta-se em equipa_afiliados (quem já se tinha
 * registado até ao fim desse ano, sem as contas próprias). Nada no código.
 */
export async function MediasPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosMapas>("mapas");
  const fat = dados?.metrics.faturacao;
  if (!dados || !fat) return <p className="dn-nota">Ainda não há snapshot dos Mapas carregado.</p>;

  const { rows } = await db().query<{ nome: string; data_registo: string | null }>(
    "select nome, data_registo from equipa_afiliados",
  );
  const registos = rows
    .filter((r) => !ehContaPropria(r.nome) && r.data_registo)
    .map((r) => new Date(r.data_registo!).getUTCFullYear());

  const anoAtual = dados.years_recent[dados.years_recent.length - 1]!;
  const anos = Object.keys(fat.monthly_recent).map(Number).sort((a, b) => a - b);
  const linhas: LinhaAno[] = [];
  for (const ano of anos) {
    const m = fat.monthly_recent[String(ano)] ?? [];
    const parcial = ano === anoAtual;
    const valores = parcial ? m.slice(0, dados.ytd_through_idx + 1) : m;
    // Os meses contam a partir da primeira venda (o 1.º ano pode não ser completo).
    const primeiro = linhas.length ? 0 : Math.max(0, valores.findIndex((v) => v > 0));
    const vendas = valores.reduce((a, b) => a + b, 0);
    if (vendas <= 0) continue;
    const meses = parcial ? dados.pat_meses_2026 - primeiro : valores.length - primeiro;
    const consultores = registos.filter((a) => a <= ano).length;
    linhas.push({ ano, vendas, meses, consultores, parcial });
  }

  const total = linhas.reduce((a, l) => a + l.vendas, 0);
  const mesesTotal = linhas.reduce((a, l) => a + l.meses, 0);
  const porConsultor = linhas.reduce((a, l) => a + (l.consultores ? l.vendas / l.consultores : 0), 0);
  const fechados = linhas.filter((l) => !l.parcial);
  const mediaAnualEquipa = fechados.length ? fechados.reduce((a, l) => a + l.vendas, 0) / fechados.length : 0;
  const mediaAnualConsultor = fechados.length
    ? fechados.reduce((a, l) => a + (l.consultores ? l.vendas / l.consultores : 0), 0) / fechados.length
    : 0;
  const primeiroAno = linhas[0]?.ano;

  return (
    <div>
      <p className="dn-nota">
        Quanto a equipa vende em reservas, em média, em cada ano — e quanto vende, em média, um consultor da equipa. A
        venda é a faturação da equipa dos Mapas; o consultor médio é essa venda dividida pelos consultores que já
        estavam na equipa nesse ano (registados até 31 de dezembro, sem as contas próprias).
        {linhas.some((l) => l.parcial) && ` ${anoAtual} ainda vai a meio: conta até hoje.`}
      </p>

      <div className="dn-stats">
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(mediaAnualEquipa)}</div>
          <div className="dn-stat-l">Média por ano da equipa (anos fechados)</div>
        </div>
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(mediaAnualConsultor)}</div>
          <div className="dn-stat-l">Média por ano de um consultor (anos fechados)</div>
        </div>
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(mesesTotal ? total / mesesTotal : 0)}</div>
          <div className="dn-stat-l">Média por mês da equipa, desde {primeiroAno}</div>
        </div>
      </div>

      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Ano</th>
              <th className="dn-num">Vendas da equipa</th>
              <th className="dn-num">Média por mês (equipa)</th>
              <th className="dn-num">Consultores</th>
              <th className="dn-num">Média de um consultor no ano</th>
              <th className="dn-num">Média de um consultor por mês</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const consultor = l.consultores ? l.vendas / l.consultores : 0;
              return (
                <tr key={l.ano}>
                  <td>
                    <strong>{l.ano}</strong>
                    {l.parcial && <span className="dn-nivel"> · até hoje</span>}
                  </td>
                  <td className="dn-num">{eur(l.vendas)}</td>
                  <td className="dn-num">{eur(l.meses ? l.vendas / l.meses : 0)}</td>
                  <td className="dn-num">{l.consultores || "—"}</td>
                  <td className="dn-num">{l.consultores ? eur(consultor) : "—"}</td>
                  <td className="dn-num">{l.consultores && l.meses ? eur(consultor / l.meses) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <strong>Desde sempre</strong>
                <span className="dn-nivel"> · {num(mesesTotal)} meses</span>
              </td>
              <td className="dn-num">
                <strong>{eur(total)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(mesesTotal ? total / mesesTotal : 0)}</strong>
              </td>
              <td className="dn-num">—</td>
              <td className="dn-num">
                <strong>{eur(linhas.length ? porConsultor / linhas.length : 0)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(mesesTotal ? porConsultor / mesesTotal : 0)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="dn-rodape">
        Na linha «Desde sempre», a média de um consultor no ano é a média dos anos da tabela (incluindo o ano em curso,
        ainda parcial). Consultores que entretanto saíram contam nos anos em que já estavam registados.
      </p>
    </div>
  );
}
