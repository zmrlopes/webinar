"use client";

import { useState } from "react";
import { calcularVenda, lerNumeroCalculadora } from "@/lib/calculadora-venda";
import estilos from "./nova-area.module.css";
import css from "./calculadoras.module.css";

const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const numero = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Campo({ id, titulo, unidade, ajuda, valor, alterar, percentagem = false }: {
  id: string; titulo: string; unidade: string; ajuda: string;
  valor: string; alterar: (valor: string) => void; percentagem?: boolean;
}) {
  const lido = lerNumeroCalculadora(valor);
  const invalido = valor.trim() !== "" && (lido === null || (percentagem && lido > 100));
  return <div className={css.campo}>
    <label htmlFor={id}>{titulo}</label>
    <div className={css.entrada}>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
        value={valor} onChange={e => alterar(e.target.value)} placeholder={percentagem ? "0" : "Ex.: 1000,00"}
        aria-invalid={invalido || undefined} aria-describedby={`${id}-ajuda${invalido ? ` ${id}-erro` : ""}`} />
      <span aria-hidden="true">{unidade}</span>
    </div>
    <p id={`${id}-ajuda`} className={css.ajuda}>{ajuda}</p>
    {invalido && <p id={`${id}-erro`} className={css.erro}>{percentagem ? "Introduz uma percentagem entre 0 e 100." : "Introduz um valor igual ou superior a zero, com vírgula ou ponto para os cêntimos."}</p>}
  </div>;
}

export function CalculadorasNovaArea() {
  const [faturacao, setFaturacao] = useState("");
  const [margem, setMargem] = useState("12");
  const [percentagem, setPercentagem] = useState("30");
  const venda = lerNumeroCalculadora(faturacao);
  const margemLucro = lerNumeroCalculadora(margem);
  const percentagemComissao = lerNumeroCalculadora(percentagem);
  const resultado = venda !== null && margemLucro !== null && percentagemComissao !== null
    ? calcularVenda(venda, margemLucro, percentagemComissao) : null;

  return <section id="calculadoras" aria-label="Calculadoras">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>OBJETIVOS</span>
      <h1>Calculadoras<span>.</span></h1>
      <p>Faz as contas à tua próxima venda.</p>
    </div>
    <article className={css.cartao} aria-labelledby="titulo-calculadora-venda">
      <div className={css.cabecalho}>
        <span className={css.icone} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1" /></svg></span>
        <div><h2 id="titulo-calculadora-venda">Comissão e pontos de uma venda</h2><p>Introduz a faturação e ajusta as percentagens para simular o resultado.</p></div>
      </div>
      <div className={css.campos}>
        <Campo id="venda-faturacao" titulo="Faturação (€)" unidade="€" ajuda="O valor da venda que queres simular." valor={faturacao} alterar={setFaturacao} />
        <Campo id="venda-margem" titulo="Margem de lucro (%)" unidade="%" ajuda="A margem de lucro desta venda." valor={margem} alterar={setMargem} percentagem />
        <Campo id="venda-percentagem" titulo="Percentagem da comissão (%)" unidade="%" ajuda="A parte da margem de lucro que recebes." valor={percentagem} alterar={setPercentagem} percentagem />
      </div>
      <div className={css.resultados} role="status" aria-live="polite" aria-atomic="true">
        <div className={css.resultado}><span>Comissão bruta</span><strong>{resultado ? euros.format(resultado.comissao) : "—"}</strong><small>Antes de impostos e retenções</small></div>
        <div className={css.resultado}><span>Pontos</span><strong>{resultado ? numero.format(resultado.pontos) : "—"}</strong><small>Dependem da faturação e da margem</small></div>
      </div>
      <p className={css.nota}>{resultado ? "Os resultados atualizam-se automaticamente ao alterar os valores." : "Preenche os três campos com valores válidos para ver os resultados."}</p>
      <details className={css.contas}>
        <summary>Como se calcula</summary>
        <p><strong>Comissão bruta:</strong> faturação × margem de lucro ÷ 100 × percentagem da comissão ÷ 100.</p>
        <p><strong>Pontos:</strong> faturação × margem de lucro ÷ 100 ÷ 200.</p>
        <p>Com uma margem de 12%, cada 1.000 € de faturação equivale a 0,60 pontos. Alterar a percentagem da comissão não altera os pontos.</p>
      </details>
    </article>
  </section>;
}
