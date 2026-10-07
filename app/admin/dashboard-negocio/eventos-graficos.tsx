"use client";

import { useState } from "react";
import { multiplicadorEventos, type ComparacaoEventos } from "@/lib/eventos-dashboard";
import styles from "./eventos.module.css";

type Metrica = "faturacaoMedia" | "diretosMedia";
const numero = (n: number) => n.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
const amostra = (n: number) => `${n} ${n === 1 ? "consultor" : "consultores"}`;
const formatar = (n: number, metrica: Metrica) => metrica === "faturacaoMedia"
  ? n.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
  : numero(n);
const compacto = (n: number, metrica: Metrica) => metrica === "faturacaoMedia"
  ? n.toLocaleString("pt-PT", { notation: "compact", style: "currency", currency: "EUR", maximumFractionDigits: 1 })
  : numero(n);

function Grafico({ titulo, metrica, grupos, linhas, frequencia }: {
  titulo: string; metrica: Metrica; grupos: ComparacaoEventos[]; linhas: ComparacaoEventos[]; frequencia: boolean;
}): React.JSX.Element {
  const base = grupos[0]!;
  const participantes = grupos[1]!;
  const multiplicador = multiplicadorEventos(base, participantes, metrica);
  const valores = frequencia ? linhas : grupos;
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const maximo = Math.max(0, ...valores.filter(g => g.pessoas > 0).map(g => g[metrica]));
  const bruto = (maximo || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].find(n => n * magnitude >= bruto)! * magnitude;
  const teto = passo * 4;
  const esquerda = 52, topo = 30, fundo = 218, largura = 296;
  const intervalo = largura / valores.length;
  const larguraBarra = frequencia ? 28 : 72;
  const delta = multiplicador === null ? null : (multiplicador - 1) * 100;
  let explicacao: string;
  if (!base.pessoas || !participantes.pessoas) explicacao = "É necessário ter consultores nos dois grupos para comparar.";
  else if (base[metrica] === 0) explicacao = participantes[metrica] === 0
    ? "Os dois grupos têm média zero. Não há multiplicador calculável."
    : "O grupo sem inscrição tem média zero. Não há multiplicador calculável.";
  else if (delta === null) explicacao = "Não há uma média de referência válida para calcular o multiplicador.";
  else if (delta === 0) explicacao = "A mesma média nos dois grupos.";
  else explicacao = `${numero(Math.abs(delta))}% ${delta > 0 ? "acima" : "abaixo"} do grupo sem inscrição localizada.`;
  const detalhe = selecionado === null ? null : valores[selecionado];
  return <section className={styles.card} aria-label={titulo}>
    <h3>{titulo}</h3>
    <p className={styles.multiplierContext}>Quem tem inscrição em eventos</p>
    <div className={styles.multiplier}>{multiplicador === null ? "—" : `${numero(multiplicador)}×`}</div>
    <p className={styles.multiplierLabel}>{metrica === "faturacaoMedia" ? "a faturação média" : "o número médio de TPs diretos"} de quem não tem inscrição localizada</p>
    <p className={styles.delta}>{explicacao}</p>
    <figure className={styles.figure}>
      <svg viewBox="0 0 360 300" role="img" aria-label={`${titulo}: ${frequencia ? "médias por número de eventos" : "médias com e sem inscrição"}`} className={styles.columnChart}>
        <title>{titulo} — médias por consultor</title>
        <desc>{valores.map(g => `${g.escalao}: ${g.pessoas ? formatar(g[metrica], metrica) : "sem dados"}, ${amostra(g.pessoas)}`).join("; ")}</desc>
        {[0, 1, 2, 3, 4].map(i => {
          const y = fundo - i / 4 * (fundo - topo);
          return <g key={i}><line x1={esquerda} y1={y} x2={348} y2={y} className={styles.gridline} /><text x={esquerda - 7} y={y + 4} textAnchor="end" className={styles.axis}>{compacto(i * passo, metrica)}</text></g>;
        })}
        {valores.map((g, i) => {
          const centro = esquerda + intervalo * (i + .5);
          const altura = g.pessoas ? Math.max(0, g[metrica]) / teto * (fundo - topo) : 0;
          const fator = multiplicadorEventos(base, g, metrica);
          const rotulo = frequencia ? ["0", "1", "2–3", "4–6", "7+"][i] : i === 0 ? "Sem inscrição" : "Com inscrição";
          const descricao = `${g.escalao}: ${g.pessoas ? formatar(g[metrica], metrica) : "sem dados"} · ${amostra(g.pessoas)}`;
          return <g key={g.escalao} tabIndex={0} className={styles.chartColumn} aria-label={descricao} onMouseEnter={() => setSelecionado(i)} onMouseLeave={() => setSelecionado(null)} onFocus={() => setSelecionado(i)} onBlur={() => setSelecionado(null)}>
            <title>{descricao}{fator === null ? "" : ` · ${numero(fator)}× a referência`}</title>
            <rect x={centro - intervalo / 2 + 3} y={topo} width={intervalo - 6} height={fundo - topo} fill="transparent" />
            <rect x={centro - larguraBarra / 2} y={fundo - altura} width={larguraBarra} height={altura} rx={4} className={i === 0 ? styles.referenceColumn : styles.participantColumn} />
            <text x={centro} y={fundo - altura - 10} textAnchor="middle" className={styles.chartValue}>{g.pessoas ? compacto(g[metrica], metrica) : "—"}</text>
            <text x={centro} y={242} textAnchor="middle" className={styles.chartLabel}>{rotulo}</text>
            <text x={centro} y={260} textAnchor="middle" className={styles.axis}>n={g.pessoas}</text>
            <text x={centro} y={281} textAnchor="middle" className={styles.chartFactor}>{fator === null ? "—" : `${numero(fator)}×`}</text>
          </g>;
        })}
      </svg>
      <figcaption className={styles.chartCaption}>{detalhe
        ? `${detalhe.escalao}: ${detalhe.pessoas ? formatar(detalhe[metrica], metrica) : "sem dados"} · ${amostra(detalhe.pessoas)}`
        : frequencia ? "Número de eventos por consultor · 0 = sem inscrição localizada" : `${amostra(base.pessoas)} sem inscrição · ${amostra(participantes.pessoas)} com inscrição`}</figcaption>
    </figure>
  </section>;
}

export function EventosGraficos({ grupos, linhas }: { grupos: ComparacaoEventos[]; linhas: ComparacaoEventos[] }): React.JSX.Element {
  const [frequencia, setFrequencia] = useState(false);
  return <div>
    <div className={styles.chartToolbar}>
      <span>Comparar a equipa</span>
      <div className={styles.chartModes} role="group" aria-label="Tipo de comparação">
        <button type="button" aria-pressed={!frequencia} onClick={() => setFrequencia(false)}>Com e sem inscrição</button>
        <button type="button" aria-pressed={frequencia} onClick={() => setFrequencia(true)}>Por número de eventos</button>
      </div>
    </div>
    <div className={styles.grid}>
      <Grafico key={`faturacao-${frequencia}`} titulo="Faturação" metrica="faturacaoMedia" grupos={grupos} linhas={linhas} frequencia={frequencia} />
      <Grafico key={`tps-${frequencia}`} titulo="Criação de TPs" metrica="diretosMedia" grupos={grupos} linhas={linhas} frequencia={frequencia} />
    </div>
    <p className={styles.graphNote}>Os multiplicadores usam a média de quem não tem inscrição localizada como referência (1×). TPs = Travel Partners diretos.</p>
  </div>;
}
