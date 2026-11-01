"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {anosNegocio, fatorMedioNegocio, MESES_NEGOCIO, METRICAS_NEGOCIO, projecoesNegocio, resumoNegocio, ROTULOS_NEGOCIO, type DadosNegocio, type MetricaNegocio} from "@/lib/consultor-negocio";
import {favoritoNegocio, MYOFFICE_NEGOCIO} from "@/lib/consultor-negocio-ponte";
import gerais from "./nova-area.module.css";
import estilos from "./negocio.module.css";

const euros = (k: MetricaNegocio) => k === "faturacao" || k === "comissoes";
function formatar(valor: number, k: MetricaNegocio, compacto = false) {
  return valor.toLocaleString("pt-PT", {maximumFractionDigits: k === "consultores" ? 0 : 2, ...(compacto ? {notation: "compact" as const} : {}), ...(euros(k) ? {style: "currency", currency: "EUR"} : {})});
}
const dataCurta = (iso: string) => iso.split("-").reverse().join("/");

function GraficoMensal({dados, metrica, ano}: {dados: DadosNegocio; metrica: MetricaNegocio; ano: number}) {
  const anos = anosNegocio(dados).includes(ano - 1) ? [ano - 1, ano] : [ano];
  const valores = anos.flatMap(a => MESES_NEGOCIO.map((_, i) => dados.meses[`${a}-${String(i + 1).padStart(2, "0")}`]?.[metrica] ?? 0));
  const minimo = Math.min(0, ...valores), maximo = Math.max(1, ...valores);
  const y = (v: number) => 190 - (v - minimo) / (maximo - minimo) * 160;
  return <div className={estilos.graficoScroll}>
    <svg className={estilos.grafico} viewBox="0 0 760 230" role="img" aria-label={`${ROTULOS_NEGOCIO[metrica]} por mês, ${anos.join(" e ")}. Valores exatos na tabela abaixo.`}>
      {[0, .5, 1].map(t => <g key={t}><line x1="65" x2="750" y1={30 + t * 160} y2={30 + t * 160} stroke="#e8e8de" /><text x="57" y={34 + t * 160} textAnchor="end">{formatar(maximo - t * (maximo - minimo), metrica, true)}</text></g>)}
      <line x1="65" x2="750" y1={y(0)} y2={y(0)} stroke="#999b87" />
      {MESES_NEGOCIO.map((mes, i) => <g key={mes}>
        {anos.map(a => {
          const valor = dados.meses[`${a}-${String(i + 1).padStart(2, "0")}`]?.[metrica];
          return valor === undefined ? null : <rect key={a} x={75 + i * 56 + (a === ano ? 20 : 0)} y={Math.min(y(valor), y(0))} width="17" height={Math.max(valor === 0 ? 0 : 1, Math.abs(y(0) - y(valor)))} rx="2" fill={a === ano ? "#4b5320" : "#c7c9b7"}><title>{mes} {a}: {formatar(valor, metrica)}</title></rect>;
        })}
        <text x={93 + i * 56} y="218" textAnchor="middle">{mes}</text>
      </g>)}
    </svg>
  </div>;
}

function GraficoProjecao({valores, metrica, ano}: {valores: number[]; metrica: MetricaNegocio; ano: number}) {
  const min = Math.min(0, ...valores), max = Math.max(1, ...valores);
  const y = (v: number) => 110 - (v - min) / (max - min) * 85;
  const pontos = valores.map((v, i) => `${30 + i * 55},${y(v)}`).join(" ");
  return <svg className={estilos.projecaoGrafico} viewBox="0 0 340 145" role="img" aria-label={`Cenário de ${ROTULOS_NEGOCIO[metrica]} entre ${ano} e ${ano + 5}. Valores na tabela de projeções.`}>
    <line x1="24" x2="315" y1={y(0)} y2={y(0)} stroke="#e3e4d7" />
    <polyline points={pontos} fill="none" stroke="#4b5320" strokeWidth="2.5" strokeDasharray="5 4" />
    {valores.map((v, i) => <g key={i}><circle cx={30 + i * 55} cy={y(v)} r="3.5" fill="#4b5320"><title>{ano + i}: {formatar(v, metrica)}</title></circle><text x={30 + i * 55} y="137" textAnchor="middle">{ano + i}</text></g>)}
  </svg>;
}

export function NegocioNovaArea({email}: {email: string}) {
  const [dados, setDados] = useState<DadosNegocio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"mapas" | "projecoes">("mapas");
  const [metrica, setMetrica] = useState<MetricaNegocio>("faturacao");
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [fatorTexto, setFatorTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const favorito = useRef<HTMLAnchorElement>(null);
  const pedido = useRef(false);
  const carregar = useCallback(async () => {
    if (pedido.current) return;
    pedido.current = true;
    try {
      const r = await fetch("/api/consultor/nova-area/negocio", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "ler"})});
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível carregar o dashboard.");
      setDados(c.dados); setErro("");
    } catch (falha) {setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");}
    finally {pedido.current = false; setCarregando(false);}
  }, [email]);
  useEffect(() => {
    void carregar();
    const aoVoltar = () => {if (document.visibilityState === "visible") void carregar();};
    window.addEventListener("focus", aoVoltar); document.addEventListener("visibilitychange", aoVoltar);
    return () => {window.removeEventListener("focus", aoVoltar); document.removeEventListener("visibilitychange", aoVoltar);};
  }, [carregar]);
  useEffect(() => {favorito.current?.setAttribute("href", favoritoNegocio(window.location.origin));}, [carregando]);
  const medio = dados ? fatorMedioNegocio(dados) : 1;
  const digitado = Number(fatorTexto.replace(",", "."));
  const fatorValido = fatorTexto === "" || (Number.isFinite(digitado) && digitado >= 0 && digitado <= 10);
  const fator = fatorTexto === "" || !fatorValido ? medio : digitado;
  const ano = dados ? Number(dados.ate.slice(0, 4)) : 0;
  const mes = dados ? Number(dados.ate.slice(5, 7)) : 0;
  const anos = dados ? anosNegocio(dados) : [];
  const anoMapa = anoSelecionado !== null && anos.includes(anoSelecionado) ? anoSelecionado : ano;
  const rotulo = (k: MetricaNegocio) => k === "comissoes" && dados?.versao !== 2 ? "Comissões (por atualizar)" : ROTULOS_NEGOCIO[k];

  return <section className={estilos.raiz} aria-label="O meu negócio">
    <div className={gerais.intro}><span className={gerais.etiqueta}>O MEU NEGÓCIO</span><h1>Mapas e Projeções<span>.</span></h1><p>A evolução do teu negócio, com os números recolhidos da tua conta MyOffice.</p></div>
    <details className={estilos.instrucoes} open={!carregando && !dados ? true : undefined}>
      <summary>Atualizar os dados pelo MyOffice</summary>
      <div className={estilos.instrucoesCorpo}>
        <p><strong>Instala uma vez:</strong> no computador, arrasta este botão para a barra de favoritos do browser.</p>
        <a ref={favorito} className={estilos.botao} draggable onClick={e => e.preventDefault()}>Atualizar o meu negócio</a>
        <ol><li>Abre o <a href={MYOFFICE_NEGOCIO} target="_blank" rel="noopener noreferrer">MyOffice</a> e entra com <strong>{email}</strong>.</li><li>No separador do MyOffice, clica no favorito <strong>Atualizar o meu negócio</strong>.</li><li>Mantém as duas janelas abertas até terminar. Depois, volta aqui.</li></ol>
        <p className={estilos.nota}>Se já tinhas este favorito, substitui-o por este botão para incluir comissões próprias e passivas. A instalação é feita no computador; podes consultar os resultados no telemóvel.</p>
        <button className={estilos.secundario} type="button" onClick={async () => {try {await navigator.clipboard.writeText(favoritoNegocio(window.location.origin)); setCopiado(true);} catch {setErro("Não foi possível copiar. Arrasta o botão para a barra de favoritos.");}}}>{copiado ? "Código copiado" : "Copiar código para criar o favorito à mão"}</button>
      </div>
    </details>
    {erro && <p className={estilos.erro} role="alert">{erro} <button type="button" className={estilos.secundario} onClick={() => void carregar()}>Tentar novamente</button></p>}
    {carregando ? <p role="status">A carregar os teus mapas…</p> : !dados ? <div className={estilos.vazio}><h2>O teu primeiro mapa começa aqui</h2><p>Atualiza pelo MyOffice para veres as comissões próprias e passivas, o histórico desde o teu ano de entrada (no máximo desde 2019) e as projeções.</p></div> : <>
      {dados.versao !== 2 && <p className={estilos.aviso} role="status">Estes dados são da versão anterior. Substitui o favorito e atualiza pelo MyOffice para recolher as comissões totais (próprias + passivas) e o histórico desde o ano de entrada, com limite em 2019.</p>}
      <div className={estilos.estado}><span>Dados até <strong>{dataCurta(dados.ate)}</strong> · Atualizado em {new Date(dados.atualizadoEm).toLocaleString("pt-PT", {dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon"})}</span><button type="button" className={estilos.secundario} onClick={() => void carregar()}>Recarregar dados guardados</button></div>
      <div className={estilos.abas} role="group" aria-label="Vista do negócio"><button type="button" aria-pressed={aba === "mapas"} onClick={() => setAba("mapas")}>Mapas</button><button type="button" aria-pressed={aba === "projecoes"} onClick={() => setAba("projecoes")}>Projeções</button></div>
      {aba === "mapas" ? <>
        <div className={estilos.cartoes}>{METRICAS_NEGOCIO.map(k => {
          const r = resumoNegocio(dados, k);
          return <article className={estilos.cartao} key={k}><span>{rotulo(k)}</span><strong>{formatar(r.atual, k)}</strong><small>1 de janeiro a {dataCurta(dados.ate)}</small><p>{r.variacao === null ? "Sem base de comparação no ano anterior" : `${r.variacao > 0 ? "+" : ""}${r.variacao}% face aos mesmos dias de ${ano - 1}`}</p></article>;
        })}</div>
        <article className={estilos.painel}>
          <div className={estilos.cabecalho}><h2>Evolução mensal</h2><div className={estilos.filtros}><label htmlFor="negocio-indicador">Indicador <select id="negocio-indicador" value={metrica} onChange={e => setMetrica(e.target.value as MetricaNegocio)}>{METRICAS_NEGOCIO.map(k => <option key={k} value={k}>{rotulo(k)}</option>)}</select></label><label htmlFor="negocio-ano">Ano <select id="negocio-ano" value={anoMapa} onChange={e => setAnoSelecionado(Number(e.target.value))}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select></label></div></div>
          <div className={estilos.legenda}>{anos.includes(anoMapa - 1) && <span><i />{anoMapa - 1}</span>}<span><i className={estilos.atual} />{anoMapa}</span></div>
          <GraficoMensal dados={dados} metrica={metrica} ano={anoMapa} />
          <p className={estilos.nota}>O mês de {MESES_NEGOCIO[mes - 1]} de {ano} inclui apenas os dados até {dataCurta(dados.ate)}. Os cartões comparam os mesmos dias nos dois anos.</p>
        </article>
        <div className={estilos.tabelaScroll}><table><caption>Mapa mensal · {rotulo(metrica)} · histórico {anos[0]}–{ano}</caption><thead><tr><th scope="col">Ano</th>{MESES_NEGOCIO.map(m => <th key={m} scope="col">{m}</th>)}<th scope="col">Total recolhido</th></tr></thead><tbody>{anos.map(a => <tr key={a}><th scope="row">{a}</th>{MESES_NEGOCIO.map((m, i) => {const v = dados.meses[`${a}-${String(i + 1).padStart(2, "0")}`]?.[metrica]; return <td key={m}>{v === undefined ? "—" : formatar(v, metrica)}</td>;})}<td><strong>{formatar(Object.entries(dados.meses).filter(([k]) => k.startsWith(`${a}-`)).reduce((s, [, v]) => s + v[metrica], 0), metrica)}</strong></td></tr>)}</tbody></table></div>
        <p className={estilos.nota}>Faturação e pontos referem-se à tua organização no MyOffice. Novos consultores corresponde às adesões do período. Comissões totais = comissões próprias + comissões passivas, segundo os totais do MyOffice para cada período. O histórico começa no ano de entrada registado; sem essa data, procura desde 2019.</p>
      </> : <>
        <article className={estilos.painel}><h2>Simula os próximos cinco anos</h2><p>O ponto de partida é o acumulado real até {dataCurta(dados.ate)}. Cada ano seguinte aplica o fator escolhido a essa base, como no dashboard admin.</p><div className={estilos.simulador}><label htmlFor="negocio-fator">Fator de crescimento anual<input id="negocio-fator" type="number" min="0" max="10" step="0.1" placeholder={String(medio)} value={fatorTexto} onChange={e => setFatorTexto(e.target.value)} aria-invalid={!fatorValido} /></label><button type="button" className={estilos.secundario} onClick={() => setFatorTexto("")}>Repor média atual (×{medio})</button></div>{!fatorValido && <p role="alert" className={estilos.erro}>Escolhe um fator entre 0 e 10. A pré-visualização usa a média atual até corrigires o valor.</p>}<p className={estilos.nota}>×1 mantém · ×1,1 cresce 10% · ×2 duplica por ano. A média usa apenas os indicadores com base de comparação; sem base, usa ×1. São cenários matemáticos sobre um acumulado parcial, sem garantia de resultados.</p></article>
        <div className={estilos.projecoes}>{METRICAS_NEGOCIO.map(k => {
          const valores = projecoesNegocio(resumoNegocio(dados, k).atual, fator);
          return <article key={k} className={estilos.cartao}><h3>{rotulo(k)}</h3><GraficoProjecao valores={valores} metrica={k} ano={ano} /><span>Cenário para {ano + 5}</span><strong>{formatar(valores[5]!, k)}</strong><small>Fator ×{fator} por ano</small></article>;
        })}</div>
        <div className={estilos.tabelaScroll}><table><caption>Valores das projeções · fator ×{fator}</caption><thead><tr><th scope="col">Indicador</th>{Array.from({length: 6}, (_, i) => <th key={i} scope="col">{ano + i}{i === 0 ? " (real, parcial)" : " (cenário)"}</th>)}</tr></thead><tbody>{METRICAS_NEGOCIO.map(k => <tr key={k}><th scope="row">{rotulo(k)}</th>{projecoesNegocio(resumoNegocio(dados, k).atual, fator).map((v, i) => <td key={i}>{formatar(v, k)}</td>)}</tr>)}</tbody></table></div>
      </>}
    </>}
  </section>;
}
