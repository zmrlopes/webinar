"use client";

import { useState } from "react";
import { calcularVenda, lerNumeroCalculadora } from "@/lib/calculadora-venda";
import { BONUS_TP, PATAMARES_CALCULADORA, calcularObjetivoComissao } from "@/lib/calculadora-objetivo";
import { calcularPontosVirtuais, calcularMetaMensalVirtual } from "@/lib/calculadora-pontos-virtuais";
import estilos from "./nova-area.module.css";
import css from "./calculadoras.module.css";

const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const numero = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Campo({ id, titulo, unidade, ajuda, valor, alterar, percentagem = false, inteiroPositivo = false, placeholder }: {
  id: string; titulo: string; unidade: string; ajuda: string;
  valor: string; alterar: (valor: string) => void; percentagem?: boolean;
  inteiroPositivo?: boolean; placeholder?: string;
}) {
  const lido = lerNumeroCalculadora(valor);
  const invalido = valor.trim() !== "" && (lido === null || (percentagem && lido > 100)
    || (inteiroPositivo && (!Number.isSafeInteger(lido) || lido < 1)));
  return <div className={css.campo}>
    <label htmlFor={id}>{titulo}</label>
    <div className={css.entrada}>
      <input id={id} type="text" inputMode={inteiroPositivo ? "numeric" : "decimal"} autoComplete="off" spellCheck={false}
        value={valor} onChange={e => alterar(e.target.value)} placeholder={placeholder ?? (percentagem ? "0" : "Ex.: 1000,00")}
        aria-invalid={invalido || undefined} aria-describedby={`${id}-ajuda${invalido ? ` ${id}-erro` : ""}`} />
      <span aria-hidden="true">{unidade}</span>
    </div>
    <p id={`${id}-ajuda`} className={css.ajuda}>{ajuda}</p>
    {invalido && <p id={`${id}-erro`} className={css.erro}>{inteiroPositivo ? "Introduz um número inteiro de meses igual ou superior a 1." : percentagem ? "Introduz uma percentagem entre 0 e 100." : "Introduz um valor igual ou superior a zero, com vírgula ou ponto para os decimais."}</p>}
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

  return <section id="calculadoras" className={css.calculadoras} aria-label="Calculadoras">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>OBJETIVOS</span>
      <h1>Calculadoras<span>.</span></h1>
      <p>Calcula pontos virtuais, simula uma venda ou planeia o teu objetivo de comissão.</p>
    </div>
    <PontosVirtuais />
    <article id="calculadora-venda" className={css.cartao} aria-labelledby="titulo-calculadora-venda">
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
    <ObjetivoComissao />
  </section>;
}

function PontosVirtuais() {
  const [faturacao, setFaturacao] = useState("");
  const [atuais, setAtuais] = useState("");
  const [patamar, setPatamar] = useState("");
  const [meses, setMeses] = useState("");
  const [calculado, setCalculado] = useState(false);
  const [erro, setErro] = useState("");
  const valor = lerNumeroCalculadora(faturacao);
  const alvo = lerNumeroCalculadora(patamar);
  const pontosAtuais = atuais.trim() === "" ? 0 : lerNumeroCalculadora(atuais);
  const resultado = calculado && valor !== null && alvo !== null && pontosAtuais !== null
    ? calcularPontosVirtuais(valor, alvo) : null;
  const prazo = lerNumeroCalculadora(meses);
  const mensal = resultado && prazo !== null ? calcularMetaMensalVirtual(resultado.faturacaoNecessaria, prazo) : null;

  function alterar(campo: (texto: string) => void, texto: string) {
    campo(texto);
    setCalculado(false);
    setErro("");
  }

  return <article id="calculadora-pontos-virtuais" className={css.cartao} aria-labelledby="titulo-pontos-virtuais">
    <div className={css.cabecalho}>
      <span className={css.icone} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 16l4-4 4 2 6-7" /></svg></span>
      <div><h2 id="titulo-pontos-virtuais">Calculadora de pontos virtuais</h2><p>Converte faturação em pontos e calcula o que falta para o próximo patamar.</p></div>
    </div>
    <form onSubmit={e => {
      e.preventDefault();
      if (valor === null || alvo === null || pontosAtuais === null || !calcularPontosVirtuais(valor, alvo)) {
        setErro("Preenche a faturação e o próximo patamar com valores válidos. Os pontos atuais são opcionais.");
        return;
      }
      setErro(""); setCalculado(true);
    }}>
      <div className={css.campos}>
        <Campo id="virtual-faturacao" titulo="Faturação total (€)" unidade="€" ajuda="A faturação total que queres converter em pontos." valor={faturacao} alterar={v => alterar(setFaturacao, v)} />
        <Campo id="virtual-atuais" titulo="Pontos atuais" unidade="" placeholder="Ex.: 5777" ajuda="Opcional, para consulta. Na regra desta calculadora, não se somam aos pontos estimados." valor={atuais} alterar={v => alterar(setAtuais, v)} />
        <Campo id="virtual-patamar" titulo="Pontos do próximo patamar" unidade="" placeholder="Ex.: 12500" ajuda="O total de pontos do patamar que queres atingir." valor={patamar} alterar={v => alterar(setPatamar, v)} />
      </div>
      <p className={css.nota}><strong>Conversão aproximada:</strong> 1.540 € = 1 ponto. Os pontos estimados são arredondados ao inteiro mais próximo.</p>
      <button type="submit" className={`${estilos.botao} ${css.calcularVirtuais}`}>Calcular</button>
      {erro && <p className={css.erro} role="alert">{erro}</p>}
    </form>
    <div aria-live="polite" aria-atomic="true">
      {resultado && <div className={css.resultados}>
        <div className={css.resultado}><span>Pontos virtuais estimados</span><strong>{resultado.pontosEstimados.toLocaleString("pt-PT")}</strong><small>Faturação ÷ 1.540, arredondada</small></div>
        <div className={css.resultado}><span>Pontos em falta</span><strong>{resultado.pontosFalta.toLocaleString("pt-PT")}</strong><small>Patamar − pontos virtuais estimados</small></div>
        <div className={`${css.resultado} ${css.resumoObjetivo}`}><span>Faturação necessária</span><strong>{euros.format(resultado.faturacaoNecessaria)}</strong><small>{resultado.pontosFalta === 0 ? "Patamar atingido nesta simulação." : "Pontos em falta × 1.540 €"}</small></div>
      </div>}
    </div>
    {resultado && <fieldset className={css.reparticao}>
      <legend>Planeamento mensal</legend>
      <div className={css.camposReparticao}>
        <Campo id="virtual-meses" titulo="Atingir o objetivo em quantos meses?" unidade="" placeholder="Ex.: 6" ajuda="Escolhe o prazo para repartir a faturação necessária." valor={meses} alterar={setMeses} inteiroPositivo />
        <div className={css.resultado} role="status" aria-live="polite"><span>Faturação por mês necessária</span><strong>{mensal !== null ? euros.format(mensal) : "—"}</strong><small>Estimativa arredondada ao euro mais próximo</small></div>
      </div>
    </fieldset>}
    <details className={css.contas}>
      <summary>Como se calcula</summary>
      <p>Os pontos virtuais são uma estimativa de volume: faturação total ÷ 1.540, arredondada ao inteiro mais próximo. Os pontos em falta nunca são inferiores a zero.</p>
      <p>O próximo patamar é comparado com os pontos virtuais estimados. Os pontos atuais não entram nesta conta, seguindo a regra da calculadora de referência.</p>
      <p>A faturação mensal divide a faturação em falta pelo número de meses e arredonda ao euro mais próximo. Estes valores são aproximados; a calculadora de uma venda abaixo usa a margem de lucro dessa venda.</p>
    </details>
  </article>;
}

function ObjetivoComissao() {
  const [objetivo, setObjetivo] = useState("500");
  const [margem, setMargem] = useState("12");
  const [percentagem, setPercentagem] = useState("30");
  const [patamar, setPatamar] = useState<string>("junior");
  const [percentagemTPs, setPercentagemTPs] = useState("10");
  const [percentagemVendas, setPercentagemVendas] = useState("90");
  const carreira = PATAMARES_CALCULADORA.find(p => p.chave === patamar)!;
  const alvo = lerNumeroCalculadora(objetivo);
  const margemLucro = lerNumeroCalculadora(margem);
  const taxaComissao = lerNumeroCalculadora(percentagem);
  const parteTPs = lerNumeroCalculadora(percentagemTPs);
  const parteVendas = lerNumeroCalculadora(percentagemVendas);
  const resultado = alvo !== null && margemLucro !== null && taxaComissao !== null && parteTPs !== null && parteVendas !== null
    ? calcularObjetivoComissao(alvo, margemLucro, taxaComissao, parteTPs, carreira.valorPonto) : null;
  const vendasSemComissao = alvo !== null && alvo > 0 && parteVendas !== null && parteVendas > 0
    && (margemLucro === 0 || taxaComissao === 0);

  function alterarReparticao(texto: string, tipo: "tps" | "vendas") {
    const valor = lerNumeroCalculadora(texto);
    const restante = valor !== null && valor <= 100 ? String(Number((100 - valor).toFixed(10))).replace(".", ",") : "";
    if (tipo === "tps") { setPercentagemTPs(texto); setPercentagemVendas(restante); }
    else { setPercentagemVendas(texto); setPercentagemTPs(restante); }
  }

  return <article id="calculadora-objetivo" className={css.cartao} aria-labelledby="titulo-calculadora-objetivo">
    <div className={css.cabecalho}>
      <span className={css.icone} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="m12 12 8-8m-4 0h4v4" /></svg></span>
      <div><h2 id="titulo-calculadora-objetivo">Quanto preciso para atingir a minha comissão?</h2><p>Define quanto queres ganhar e reparte esse objetivo entre TPs e vendas próprias.</p></div>
    </div>
    <div className={css.campos}>
      <Campo id="objetivo-comissao" titulo="Comissão bruta que quero ganhar (€)" unidade="€" ajuda="O valor total que queres atingir." valor={objetivo} alterar={setObjetivo} />
      <Campo id="objetivo-margem" titulo="Margem de lucro das vendas (%)" unidade="%" ajuda="A margem de lucro das tuas vendas próprias." valor={margem} alterar={setMargem} percentagem />
      <Campo id="objetivo-percentagem" titulo="Comissão das vendas próprias (%)" unidade="%" ajuda="A parte da margem de lucro que recebes." valor={percentagem} alterar={setPercentagem} percentagem />
    </div>
    <div className={css.campo}>
      <label htmlFor="objetivo-patamar">Patamar para o valor dos pontos dos TPs</label>
      <select id="objetivo-patamar" className={css.seletor} value={patamar} onChange={e => setPatamar(e.target.value)} aria-describedby="objetivo-patamar-ajuda">
        {PATAMARES_CALCULADORA.map(p => <option key={p.chave} value={p.chave}>{p.nome} · {p.percentagem}% · {euros.format(p.valorPonto)} por ponto</option>)}
      </select>
      <p id="objetivo-patamar-ajuda" className={css.ajuda}>Cada TP gera {euros.format(BONUS_TP)} de bónus + 1 ponto de {euros.format(carreira.valorPonto)}: {euros.format(BONUS_TP + carreira.valorPonto)} por TP.</p>
    </div>
    <fieldset className={css.reparticao}>
      <legend>Como queres repartir o objetivo?</legend>
      <div className={css.camposReparticao}>
        <Campo id="objetivo-tps" titulo="Percentagem do objetivo em TPs (%)" unidade="%" ajuda="A parte da comissão que queres ganhar com TPs." valor={percentagemTPs} alterar={valor => alterarReparticao(valor, "tps")} percentagem />
        <Campo id="objetivo-vendas" titulo="Percentagem do objetivo em vendas (%)" unidade="%" ajuda="A parte da comissão que queres ganhar com vendas próprias." valor={percentagemVendas} alterar={valor => alterarReparticao(valor, "vendas")} percentagem />
      </div>
      <p className={css.nota}>Ao alterar uma percentagem, a outra ajusta-se para somarem 100%.</p>
    </fieldset>
    <div className={css.resultados} role="status" aria-live="polite" aria-atomic="true">
      <div className={css.resultado}><span>Faturação necessária</span><strong>{resultado ? euros.format(resultado.faturacao) : "—"}</strong><small>{resultado ? `${euros.format(resultado.comissaoVendas)} de comissão em vendas próprias` : "Vendas próprias para atingir a tua parcela do objetivo"}</small></div>
      <div className={css.resultado}><span>TPs necessários</span><strong>{resultado ? resultado.tps.toLocaleString("pt-PT") : "—"}</strong><small>{resultado ? `${euros.format(resultado.comissaoTPs)} de comissão com ${resultado.tps} ${resultado.tps === 1 ? "TP" : "TPs"}` : "Arredondados para cima para atingir a tua parcela do objetivo"}</small></div>
      {resultado && <div className={css.resumoObjetivo}>
        <dl>
          <div><dt>Objetivo em vendas próprias</dt><dd>{euros.format(resultado.objetivoVendas)}</dd></div>
          <div><dt>Objetivo em TPs</dt><dd>{euros.format(resultado.objetivoTPs)}</dd></div>
          <div><dt>Bónus dos TPs</dt><dd>{euros.format(resultado.bonusTPs)}</dd></div>
          <div><dt>Valor dos pontos dos TPs</dt><dd>{euros.format(resultado.comissaoPontosTPs)}</dd></div>
          <div className={css.total}><dt>Total de comissão bruta previsto</dt><dd>{euros.format(resultado.total)}</dd></div>
        </dl>
        <p className={css.nota}>Os TPs são arredondados para cima e a faturação ao cêntimo seguinte. O total pode ultrapassar o objetivo para cumprir a repartição escolhida.</p>
      </div>}
    </div>
    {!resultado && <p className={vendasSemComissao ? css.erro : css.nota} role={vendasSemComissao ? "alert" : undefined}>{vendasSemComissao ? "Para atingir a parcela das vendas, a margem de lucro e a percentagem da comissão têm de ser superiores a zero. Também podes escolher 100% em TPs." : "Preenche todos os campos com valores válidos para ver o plano."}</p>}
    <details className={css.contas}>
      <summary>Como se calcula</summary>
      <p><strong>Faturação necessária:</strong> objetivo em vendas próprias ÷ (margem de lucro ÷ 100 × comissão das vendas próprias ÷ 100).</p>
      <p><strong>TPs necessários:</strong> objetivo em TPs ÷ ({euros.format(BONUS_TP)} + valor de 1 ponto no patamar escolhido), arredondado para cima.</p>
      <p>A comissão das vendas próprias e o valor dos pontos dos TPs são definidos nos campos correspondentes. Todos os valores de comissão são brutos, antes de impostos e retenções.</p>
    </details>
  </article>;
}
