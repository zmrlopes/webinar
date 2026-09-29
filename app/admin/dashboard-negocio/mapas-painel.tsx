import {
  METRICA_EUROS,
  METRICAS,
  obterNegocioMensal,
  obterProximoPatamar,
  ROTULO_METRICA,
  type Metrica,
  type SerieMetrica,
} from "@/lib/dashboard-negocio";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COR_ANO: Record<number, string> = {}; // preenchido consoante os anos presentes
const PALETA = ["#bfc7a0", "#8e9963", "#4b5320", "#2f3416"];

function compacto(v: number, euros: boolean, decimais: number): string {
  if (euros) {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}M €`;
    if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k €`;
    return `${Math.round(v)} €`;
  }
  return v.toLocaleString("pt-PT", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

function completo(v: number, euros: boolean): string {
  const n = Math.round(v).toLocaleString("pt-PT");
  return euros ? `${n} €` : n;
}

/** Gráfico de barras agrupadas: um grupo por mês, uma barra por ano. */
function GraficoBarras({ serie, anos, through }: { serie: SerieMetrica; anos: number[]; through: number }): React.JSX.Element {
  const euros = METRICA_EUROS[serie.metrica];
  const decimais = serie.metrica === "pontos" ? 0 : 0;
  const W = 720;
  const H = 150;
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let maxV = 0;
  for (const ano of anos) for (const v of serie.porAno[ano] ?? []) maxV = Math.max(maxV, v);
  if (maxV <= 0) maxV = 1;

  const grupoW = plotW / 12;
  const gap = 2;
  const barW = (grupoW - gap * (anos.length + 1)) / anos.length;

  return (
    <svg className="dn-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ROTULO_METRICA[serie.metrica]} por mês`}>
      {MESES.map((mes, mi) => {
        const gx = padL + mi * grupoW;
        return (
          <g key={mes}>
            {anos.map((ano, ai) => {
              const v = serie.porAno[ano]?.[mi] ?? 0;
              const bh = (v / maxV) * plotH;
              const bx = gx + gap + ai * (barW + gap);
              const by = padT + plotH - bh;
              return (
                <rect
                  key={ano}
                  x={bx}
                  y={by}
                  width={Math.max(0, barW)}
                  height={Math.max(0, bh)}
                  rx={1}
                  fill={COR_ANO[ano]}
                >
                  <title>{`${mes} ${ano}: ${completo(v, euros)}`}</title>
                </rect>
              );
            })}
            <text x={gx + grupoW / 2} y={H - 5} textAnchor="middle" className="dn-eixo">
              {mes[0]}
            </text>
          </g>
        );
      })}
      {through >= 0 && through < 11 && (
        <line
          x1={padL + (through + 1) * grupoW}
          y1={padT}
          x2={padL + (through + 1) * grupoW}
          y2={padT + plotH}
          className="dn-linha-corte"
        />
      )}
    </svg>
  );
}

/** Servidor: lê a base de dados ao vivo. */
export async function MapasPainel(): Promise<React.JSX.Element> {
  const negocio = await obterNegocioMensal();
  const patamar = await obterProximoPatamar(10);

  const anos = negocio.anos.slice(-3); // até 3 anos recentes, como no artefacto
  anos.forEach((ano, i) => {
    COR_ANO[ano] = PALETA[Math.max(0, PALETA.length - anos.length) + i] ?? "#4b5320";
  });
  const anoAtual = negocio.anoAtual;
  const mesAtual = negocio.mesAtualIdx >= 0 ? MESES[negocio.mesAtualIdx] : null;

  // Fator de crescimento por omissão = média das variações das 4 métricas.
  const deltas = negocio.series.map((s) => s.deltaPct).filter((d): d is number => d !== null);
  const mediaDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const fator = 1 + mediaDelta / 100;

  const serieDe = (m: Metrica): SerieMetrica | undefined => negocio.series.find((s) => s.metrica === m);

  return (
    <div>
      {!negocio.temDados ? (
        <div className="dn-embreve">
          Ainda não há histórico carregado. Assim que os números mensais forem importados para a base de dados, os
          cartões, os gráficos e as projeções aparecem aqui.
        </div>
      ) : (
        <>
          <p className="dn-nota">
            Totais do teu negócio, mês a mês. O acumulado vai de janeiro a {mesAtual} de {anoAtual} e é comparado com
            exatamente os mesmos meses do ano anterior, para a percentagem ser justa. O último mês está a decorrer, por
            isso a barra dele aparece mais curta — não é uma queda.
          </p>

          <div className="dn-stats">
            {METRICAS.map((m) => {
              const s = serieDe(m);
              if (!s) return null;
              const euros = METRICA_EUROS[m];
              const subiu = s.deltaPct !== null && s.deltaPct >= 0;
              return (
                <div key={m} className="dn-stat">
                  <div className="dn-stat-l">{ROTULO_METRICA[m]}</div>
                  <div className="dn-stat-v">{compacto(s.ytdAtual, euros, 0)}</div>
                  <div className={`dn-stat-delta${subiu ? " sobe" : ""}`}>
                    {s.deltaPct === null
                      ? "sem ano anterior"
                      : `${subiu ? "+" : ""}${s.deltaPct.toFixed(1).replace(".", ",")}% vs ${(anoAtual ?? 0) - 1}`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dn-legenda-anos">
            {anos.map((ano) => (
              <span key={ano} className="dn-legenda-item">
                <span className="dn-swatch" style={{ background: COR_ANO[ano] }} />
                {ano}
                {ano === anoAtual ? " (atual)" : ""}
              </span>
            ))}
          </div>

          {METRICAS.map((m) => {
            const s = serieDe(m);
            if (!s) return null;
            return (
              <div key={m} className="dn-cartao dn-cartao-chart">
                <div className="dn-chart-titulo">{ROTULO_METRICA[m]} por mês</div>
                <GraficoBarras serie={s} anos={anos} through={negocio.mesAtualIdx} />
              </div>
            );
          })}

          <h2 className="dn-h2">Projeção a 5 anos</h2>
          <p className="dn-sub">
            Ao ritmo a que o negócio está a crescer este ano (fator de {fator.toFixed(2).replace(".", ",")}× ao ano,
            média das quatro métricas). É uma projeção em linha reta, não uma promessa.
          </p>
          <div className="dn-cartao">
            <table className="dn-tabela">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th className="dn-num">{anoAtual} (base)</th>
                  <th className="dn-num">{(anoAtual ?? 0) + 3}</th>
                  <th className="dn-num">{(anoAtual ?? 0) + 5}</th>
                </tr>
              </thead>
              <tbody>
                {METRICAS.map((m) => {
                  const s = serieDe(m);
                  if (!s) return null;
                  const euros = METRICA_EUROS[m];
                  const base = s.ytdAtual;
                  return (
                    <tr key={m}>
                      <td>
                        <strong>{ROTULO_METRICA[m]}</strong>
                      </td>
                      <td className="dn-num">{compacto(base, euros, 0)}</td>
                      <td className="dn-num">{compacto(base * fator ** 3, euros, 0)}</td>
                      <td className="dn-num">{compacto(base * fator ** 5, euros, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="dn-h2">Próximo patamar — quem está mais perto</h2>
      <p className="dn-sub">
        Os consultores ativos com mais pontos e quanto falta a cada um para o patamar seguinte. Os pontos são acumulados
        de sempre — nunca se volta atrás.
      </p>
      {patamar.linhas.length === 0 ? (
        <div className="dn-embreve">Sem pontos na base de dados ainda. Importa o CSV da equipa para preencher.</div>
      ) : (
        <div className="dn-cartao">
          <table className="dn-tabela">
            <thead>
              <tr>
                <th>Consultor</th>
                <th className="dn-num">Pontos</th>
                <th>Patamar</th>
                <th>Falta para</th>
                <th className="dn-num">Pontos em falta</th>
              </tr>
            </thead>
            <tbody>
              {patamar.linhas.map((l) => (
                <tr key={l.nome}>
                  <td>
                    <strong>{l.nome}</strong>
                  </td>
                  <td className="dn-num">{l.pontos.toLocaleString("pt-PT")}</td>
                  <td>{l.patamarAtual}</td>
                  <td>{l.proximoPatamar ?? <span className="dn-nivel">no topo</span>}</td>
                  <td className="dn-num">
                    {l.faltam === null ? "—" : l.faltam.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
