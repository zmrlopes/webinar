"use client";

import { useEffect, useState } from "react";
import { CAMPOS_CORE, DIAS_CORE, FIM_CORE, GRUPOS_CORE, INICIO_CORE, META_TPS, META_VENDAS, TAREFAS_CORE, dataLisboa, diaTesteCore, diasCoreConta, diasMesCore, formularioVazio, metricasDasTarefas, podeGuardarDia, resumirCore, semanaCore, type DadosCore, type EstadoTarefa, type FormularioCore, type GrupoCore, type MarcaCore } from "@/lib/core-rank";
import { FOCO_CORE } from "@/lib/core-rank-foco";
import css from "./core-rank.module.css";

const euros = (n: number) => new Intl.NumberFormat("pt-PT", {style: "currency", currency: "EUR"}).format(n);
const dataExtenso = (d: string) => new Intl.DateTimeFormat("pt-PT", {weekday: "long", day: "numeric", month: "long"}).format(new Date(`${d}T12:00:00Z`));
const MESES = ["2026-10", "2026-11", "2026-12"];
const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
async function pedirCore(email: string, extra: Record<string, unknown> = {}): Promise<DadosCore> {
  const r = await fetch("/api/consultor/nova-area/core-rank", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "consultar", ...extra})});
  const corpo = await r.json(); if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível carregar os registos."); return corpo;
}

export function AvisoRelatorioCore({email, aoAbrir}: {email: string; aoAbrir: () => void}) {
  const [dados, setDados] = useState<DadosCore | null>(null);
  useEffect(() => {
    let ativo = true; void pedirCore(email).then(d => {if (ativo) setDados(d);}).catch(() => {});
    return () => {ativo = false;};
  }, [email]);
  const novos = dados?.relatorios.filter(r => !r.lidoEm) ?? [];
  if (!novos.length) return null;
  return <button type="button" className={css.aviso} onClick={aoAbrir}>
    <span aria-hidden="true">▤</span><div><strong>O teu relatório Core Rank está disponível</strong><small>{novos.length === 1 ? "Vê o que fizeste bem, o que podes melhorar e as prioridades da próxima semana." : `Tens ${novos.length} relatórios por ler. Consulta a tua análise semanal.`}</small></div><span aria-hidden="true">→</span>
  </button>;
}

export function CoreRankNovaArea({email, nome, abrirRelatorios = 0}: {email: string; nome: string; abrirRelatorios?: number}) {
  const [dados, setDados] = useState<DadosCore | null>(null);
  const [data, setData] = useState(INICIO_CORE);
  const [mes, setMes] = useState("2026-10");
  const [grupo, setGrupo] = useState<GrupoCore>("core");
  const [aba, setAba] = useState<"plano" | "historico" | "relatorios">(abrirRelatorios ? "relatorios" : "plano");
  const [rascunho, setRascunho] = useState<FormularioCore>(formularioVazio);
  const [manuais, setManuais] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [aExportar, setAExportar] = useState(false);

  useEffect(() => {
    let ativo = true;
    void pedirCore(email).then(d => {
      if (!ativo) return; setDados(d);
      const inicioConta = diasCoreConta(email)[0]!;
      const inicial = d.hoje < inicioConta ? inicioConta : d.hoje > FIM_CORE ? FIM_CORE : d.hoje;
      setData(inicial); setMes(inicial.slice(0, 7));
      const anterior = d.dias.filter(dia => !dia.teste).at(-1);
      setRascunho({...formularioVazio(), diaPromocoes: anterior?.diaPromocoes ?? null});
    }).catch(e => {if (ativo) setErro(e.message);});
    return () => {ativo = false;};
  }, [email]);
  useEffect(() => {
    const atualizar = () => setDados(d => d ? {...d, hoje: dataLisboa()} : d);
    const id = window.setInterval(atualizar, 30000); window.addEventListener("focus", atualizar);
    return () => {clearInterval(id); window.removeEventListener("focus", atualizar);};
  }, []);

  async function lerRelatorios() {
    setAba("relatorios");
    try {for (const r of dados?.relatorios.filter(r => !r.lidoEm) ?? []) setDados(await pedirCore(email, {acao: "ler-relatorio", semana: r.semana}));}
    catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível marcar o relatório como lido.");}
  }
  useEffect(() => {if (dados && abrirRelatorios) void lerRelatorios();}, [!!dados, abrirRelatorios]); // Abertura pelo aviso do Início, inclusive após voltar ao plano.

  if (!dados) return <section className={css.pagina} aria-live="polite"><h1>Core Rank</h1><p>{erro || "A carregar o teu plano…"}</p>{erro && <button className={css.botao} onClick={() => window.location.reload()}>Tentar novamente</button>}</section>;
  const guardado = dados.dias.find(d => d.data === data);
  const teste = diaTesteCore(data, email);
  const semana = semanaCore(data);
  const registoSemanal = dados.dias.find(d => (teste ? d.data === data : !d.teste) && semanaCore(d.data) === semana && Object.keys(d.tarefas).some(id => id.startsWith("week_")));
  const atual = guardado ?? rascunho;
  const editavel = podeGuardarDia(data, dados.dias, dados.hoje, email);
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  const semanalEditavel = editavel && !registoSemanal && atual.diaPromocoes === diaSemana;
  const tarefasVisiveis = TAREFAS_CORE.filter(t => t.grupo === grupo);
  const totais = resumirCore(dados.dias, INICIO_CORE, FIM_CORE).totais;
  const diasMes = diasMesCore(mes, email);
  const feitas = Object.values(atual.tarefas).filter(t => t.estado === "done").length;
  const nomeMes = new Intl.DateTimeFormat("pt-PT", {month: "long", year: "numeric"}).format(new Date(`${mes}-15T12:00:00Z`));

  function alterarTarefa(id: string, alteracao: Partial<MarcaCore>) {
    setRascunho(v => {
      const marca: MarcaCore = {...(v.tarefas[id] ?? {estado: "", quantidade: null}), ...alteracao};
      if (marca.estado === "no" || marca.estado === "na") marca.quantidade = null;
      const tarefas = {...v.tarefas, [id]: marca};
      const sugestoes = metricasDasTarefas(tarefas);
      return {...v, tarefas, metricas: {...v.metricas, ...Object.fromEntries(Object.entries(sugestoes).filter(([campo]) => !manuais.includes(campo)))}};
    });
  }
  function escolherMes(proximo: string) {
    setMes(proximo); setData(dados!.hoje.startsWith(proximo) && dados!.hoje >= diasCoreConta(email)[0]! && dados!.hoje <= FIM_CORE ? dados!.hoje : diasMesCore(proximo, email)[0]!);
  }
  async function guardar() {
    if (!editavel || aGuardar) return;
    setAGuardar(true); setErro(""); setMensagem("");
    try {
      const tarefas = Object.fromEntries(TAREFAS_CORE.filter(t => t.grupo !== "week" || semanalEditavel).map(t => [t.id, rascunho.tarefas[t.id] ?? {estado: "", quantidade: null}]));
      const novos = await pedirCore(email, {acao: "guardar", data, registo: {...rascunho, tarefas}});
      setDados(novos); setMensagem("O teu dia foi guardado. Podes consultá-lo no histórico; este registo está fechado.");
    } catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível guardar o dia.");}
    finally {setAGuardar(false);}
  }
  async function exportar(formato: "pdf" | "xlsx") {
    setAExportar(true); setErro("");
    try {
      const r = await fetch("/api/consultor/nova-area/core-rank/exportar", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, formato})});
      if (!r.ok) throw new Error((await r.json()).erro ?? "Não foi possível exportar.");
      const url = URL.createObjectURL(await r.blob()), a = document.createElement("a"); a.href = url; a.download = `core-rank-historico.${formato}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível exportar.");}
    finally {setAExportar(false);}
  }

  return <section id="core-rank" className={css.pagina} aria-label="Core Rank">
    <header className={css.topo}><span>↗ TROPA DE ELITE</span><span>11 OUTUBRO — 31 DEZEMBRO 2026</span></header>
    <div className={css.hero}><div><span className={css.etiqueta}>82 DIAS PARA AGIR</span><h1>O teu próximo passo<br/>começa <span>hoje.</span></h1><p>Cria relações. Ajuda a planear viagens. Faz crescer a tua equipa. Um dia de cada vez.</p></div>
      <div className={css.objetivo}><span className={css.etiqueta}>O OBJETIVO · 1 CORE RANK</span><h2>3 TPs + 3.000€</h2><p>Novos Travel Partners e vendas confirmadas.</p><a href="#core-rank-plano" onClick={() => setAba("plano")}>Começar o meu registo ↓</a></div>
    </div>
    <div className={css.orientacao}><strong>O ritmo é teu. A consistência faz a diferença.</strong><p>Estas tarefas não são obrigatórias. São sugestões para criares mais oportunidades de adesão e venda. Escolhe as que consegues fazer e regista a tua atividade com honestidade. Os resultados dependem de vários fatores e não são garantidos.</p></div>
    <div className={css.perfil}><label>O teu nome<input value={nome} disabled/></label><label>Dia das tuas promoções<select value={registoSemanal?.diaPromocoes ?? atual.diaPromocoes ?? ""} disabled={!editavel || !!registoSemanal || aGuardar} onChange={e => setRascunho(v => ({...v, diaPromocoes: e.target.value === "" ? null : Number(e.target.value)}))}><option value="">Escolhe um dia</option>{DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label></div>
    <p className={css.ajuda}>Os registos ficam guardados na tua conta, acessíveis no computador e no telemóvel. O objetivo é acumulado até 31 de dezembro.</p>
    <div className={css.indicadores}><div className={css.indicador}><span>NOVOS TPS</span><strong>{totais.tps ?? 0} / {META_TPS}</strong><progress max={META_TPS} value={Math.min(totais.tps ?? 0, META_TPS)} aria-label="Progresso de novos TPs"/></div><div className={css.indicador}><span>VENDAS CONFIRMADAS</span><strong>{euros(totais.sales ?? 0)} / 3.000€</strong><progress max={META_VENDAS} value={Math.min(totais.sales ?? 0, META_VENDAS)} aria-label="Progresso de vendas confirmadas"/></div><div className={css.indicador}><span>DIAS COM REGISTO</span><strong>{dados.dias.filter(d => !d.teste).length} / {DIAS_CORE.length}</strong><small>O teu caminho até dezembro</small></div></div>
    <div className={css.abas} role="tablist" aria-label="Plano e acompanhamento"><button className={css.botao} role="tab" aria-selected={aba === "plano"} onClick={() => setAba("plano")}>O meu plano</button><button className={css.botao} role="tab" aria-selected={aba === "historico"} onClick={() => setAba("historico")}>Histórico</button><button className={css.botao} role="tab" aria-selected={aba === "relatorios"} onClick={() => void lerRelatorios()}>Relatórios semanais{dados.relatorios.some(r => !r.lidoEm) ? " · Novo" : ""}</button></div>
    {erro && <p className={`${css.mensagem} ${css.erro}`} role="alert">{erro}</p>}{mensagem && <p className={css.mensagem} role="status">{mensagem}</p>}
    {aba !== "relatorios" && <div className={css.meses}><button className={css.botao} aria-label="Mês anterior" disabled={mes === MESES[0]} onClick={() => escolherMes(MESES[MESES.indexOf(mes) - 1]!)}>←</button><strong>{nomeMes}</strong><button className={css.botao} aria-label="Mês seguinte" disabled={mes === MESES.at(-1)} onClick={() => escolherMes(MESES[MESES.indexOf(mes) + 1]!)}>→</button></div>}
    {aba === "plano" && <div id="core-rank-plano">
      <div className={css.cabecalho}><div><span className={css.etiqueta}>O TEU PLANO DIÁRIO</span><h2>Pequenas ações. Novas oportunidades.</h2></div><button className={css.botao} onClick={() => {const inicio = diasCoreConta(email)[0]!; const hoje = dados.hoje < inicio ? inicio : dados.hoje > FIM_CORE ? FIM_CORE : dados.hoje; setData(hoje); setMes(hoje.slice(0,7));}}>Ir para hoje</button></div>
      <div className={css.calendario} aria-label={`Dias de ${nomeMes}`}>{diasMes.map(d => <button key={d} className={css.dia} aria-label={dataExtenso(d)} aria-current={d === data ? "date" : undefined} data-guardado={dados.dias.some(r => r.data === d)} onClick={() => setData(d)}><small>{DIAS_SEMANA[new Date(`${d}T12:00:00Z`).getUTCDay()]!.slice(0,3).toUpperCase()}</small>{Number(d.slice(-2))}</button>)}</div>
      <div className={css.dataDia}><h3>{dataExtenso(data)}</h3><span>{feitas} tarefas feitas</span></div>
      {teste && <p className={css.mensagem}>Dia de teste — disponível apenas nesta conta. Podes preencher, guardar, consultar o histórico e exportar. Este registo fica fora do objetivo, da classificação e dos relatórios do desafio.</p>}
      {!editavel && <p className={css.mensagem}>{guardado ? "Dia guardado — consulta disponível, sem alterações." : data < dados.hoje ? "Sem informação. Os dias anteriores não podem ser preenchidos." : dados.hoje < INICIO_CORE ? "O desafio começa a 11 de outubro. Podes consultar o plano; o registo abre nesse dia." : "Este dia ainda não está disponível para registo. Só podes guardar o próprio dia."}</p>}
      <p className={css.ajuda}>As quantidades são sugestões e as tarefas são opcionais. Começa pelas prioridades e escolhe as restantes ações de acordo com o teu tempo. Uma mesma conversa pode contribuir para várias tarefas; regista cada contacto ou resultado apenas uma vez no balanço do dia.</p>
      <div className={css.foco}><span className={css.etiqueta}>FOCO DO DIA</span><p>{teste ? "Experimenta as tarefas e o balanço do dia. Para testar as tarefas semanais, escolhe sábado no dia das tuas promoções." : FOCO_CORE[data]}</p></div>
      <div className={css.grupos}><h3>Começa por estas ações ↓</h3><p>Reserva o teu tempo e avança nas prioridades. Depois explora as outras ações para desenvolveres o teu negócio.</p><div className={css.grelhaGrupos} role="tablist" aria-label="Grupos de tarefas">{GRUPOS_CORE.map((g, i) => <button key={g.id} className={css.grupo} role="tab" aria-selected={grupo === g.id} onClick={() => setGrupo(g.id)}><span>0{i}</span><div><strong>{g.titulo}</strong><small>{g.descricao}</small></div></button>)}</div></div>
      {grupo === "week" && <p className={css.mensagem}>{registoSemanal ? `As tarefas desta semana foram guardadas em ${dataExtenso(registoSemanal.data)}.` : atual.diaPromocoes === null ? "Escolhe o dia das tuas promoções no topo. Nesse dia, guarda também as tarefas da semana." : `Regista as tarefas semanais à ${DIAS_SEMANA[atual.diaPromocoes]!.toLowerCase()}; ficam fechadas depois de guardar esse dia.`}</p>}
      <fieldset disabled={!editavel || aGuardar || (grupo === "week" && !semanalEditavel)} aria-label={GRUPOS_CORE.find(g => g.id === grupo)!.titulo}>
        {tarefasVisiveis.map(t => {
          const marca = (t.grupo === "week" && registoSemanal ? registoSemanal.tarefas[t.id] : atual.tarefas[t.id]) ?? {estado: "", quantidade: null};
          return <article key={t.id} className={css.tarefa}><div><span>{t.sugestao}</span><h4>{t.titulo}</h4><p>{t.descricao}</p></div><select aria-label={`${t.titulo} — estado`} value={marca.estado} onChange={e => alterarTarefa(t.id, {estado: e.target.value as EstadoTarefa})}><option value="">Por registar</option><option value="done">Fiz</option><option value="no">Não fiz</option><option value="na">Não se aplica</option></select><label>Qtd.<input aria-label={`${t.titulo} — quantidade`} type="number" min="0" max="9999" step="1" value={marca.quantidade ?? ""} disabled={marca.estado === "na" || marca.estado === "no"} onChange={e => alterarTarefa(t.id, {quantidade: e.target.value === "" ? null : Number(e.target.value)})}/></label></article>;
        })}
      </fieldset>
      <div className={css.balanco}><span className={css.etiqueta}>FECHAR O DIA</span><h3>O que aconteceu hoje?</h3><p className={css.ajuda}>Regista apenas os resultados deste dia. As tarefas preenchem os campos correspondentes; confirma os totais e ajusta contactos repetidos antes de guardar. Os campos vazios ficam sem informação.</p><fieldset disabled={!editavel || aGuardar}><div className={css.metricas}>{CAMPOS_CORE.map(([id, titulo]) => <label key={id}>{titulo}<input id={`core-metrica-${id}`} type="number" min="0" max={["sales","quotes"].includes(id) ? 100000000 : 100000} step={["sales","quotes"].includes(id) ? "0.01" : "1"} value={atual.metricas[id] ?? ""} onChange={e => {const valor = e.target.value === "" ? null : Number(e.target.value); setManuais(m => m.includes(id) ? m : [...m,id]); setRascunho(v => ({...v, metricas: {...v.metricas, [id]: valor}}));}}/></label>)}</div><div className={css.notas}><label>Uma aprendizagem de hoje<textarea maxLength={1500} placeholder="Ex.: percebi qual era a dúvida que estava a travar a decisão." value={atual.aprendizagem} onChange={e => setRascunho(v => ({...v, aprendizagem: e.target.value}))}/></label><label>O teu próximo passo para amanhã<textarea maxLength={1500} placeholder="Ex.: ligar à pessoa que pediu uma proposta e confirmar as datas." value={atual.proximoPasso} onChange={e => setRascunho(v => ({...v, proximoPasso: e.target.value}))}/></label></div></fieldset><div className={css.rodape}><p>{guardado ? "Este dia está guardado na tua conta." : "Guarda quando terminares. Depois de guardar, o dia fica fechado para alterações."}</p><button type="button" className={`${css.botao} ${css.primario}`} disabled={!editavel || aGuardar} onClick={() => void guardar()}>{aGuardar ? "A guardar…" : guardado ? "Dia guardado ✓" : "Guardar o meu dia ✓"}</button></div></div>
    </div>}
    {aba === "historico" && <div><div className={css.cabecalho}><div><span className={css.etiqueta}>O TEU PERCURSO</span><h2>Histórico de atividade</h2></div></div><p className={css.ajuda}>Abre um dia para consultar as tarefas, os resultados e as tuas notas. Dias sem registo ficam sem informação.</p><ResumoHistoricoCore dados={dados} mes={mes}/><div className={css.historico}>{diasMes.filter(d => d <= dados.hoje).reverse().map(d => {const dia = dados.dias.find(r => r.data === d); return <button key={d} className={`${css.botao} ${css.linhaHistorico}`} onClick={() => {setData(d); setAba("plano");}}><strong>{dataExtenso(d)}</strong><span>{dia ? `${Object.values(dia.tarefas).filter(t => t.estado === "done").length} tarefas feitas · ${dia.metricas.sales === null ? "Vendas sem informação" : euros(dia.metricas.sales ?? 0)} · ${dia.metricas.tps === null ? "TPs sem informação" : `${dia.metricas.tps ?? 0} TPs`}` : "Sem informação"}</span></button>;})}</div>{!diasMes.some(d => d <= dados.hoje) && <p className={css.mensagem}>Ainda não há dias decorridos neste mês do desafio.</p>}</div>}
    {aba === "relatorios" && <div><div className={css.cabecalho}><div><span className={css.etiqueta}>A TUA ANÁLISE SEMANAL</span><h2>Relatórios semanais</h2></div></div><p className={css.ajuda}>A análise da semana anterior fica disponível à segunda-feira. O aviso aparece no Início. Dias sem informação e tarefas não aplicáveis ficam fora das falhas.</p>{!dados.relatorios.length && <p className={css.mensagem}>O primeiro relatório fica disponível depois da tua primeira semana com registos.</p>}{dados.relatorios.map(r => <article className={css.relatorio} key={r.semana}><h3>{dataExtenso(r.semana < INICIO_CORE ? INICIO_CORE : r.semana)} — {dataExtenso(r.ate)}</h3><p>{r.resumo}</p>{([ ["O que fizeste bem", r.pontosFortes], ["O que tens de melhorar", r.melhorias], ["O que ficou descurado", r.descurado], ["As tuas próximas três ações", r.proximasAcoes] ] as [string,string[]][]).map(([titulo, itens]) => <div key={titulo}><h4>{titulo}</h4><ul>{itens.map((t,i) => <li key={i}>{t}</li>)}</ul></div>)}</article>)}</div>}
    <div className={css.exportar}><h3>Leva o teu progresso contigo.</h3><p className={css.ajuda}>Exporta o histórico, as tarefas e os relatórios disponíveis para guardares uma cópia.</p><div><button className={css.botao} disabled={aExportar} onClick={() => void exportar("pdf")}>{aExportar ? "A exportar…" : "Exportar PDF"}</button><button className={css.botao} disabled={aExportar} onClick={() => void exportar("xlsx")}>Exportar Excel</button></div></div>
  </section>;
}

function ResumoHistoricoCore({dados, mes}: {dados: DadosCore; mes: string}) {
  const datas = diasMesCore(mes).filter(d => d <= dados.hoje);
  if (!datas.length) return null;
  const resumo = resumirCore(dados.dias, datas[0]!, datas.at(-1)!);
  const semanas = [...new Set(datas.map(semanaCore))];
  return <div className={css.resumoHistorico}>
    <h3>Resumo do mês</h3><p>{resumo.diasRegistados} dias guardados · {resumo.diasSemInformacao.length} dias sem informação · {resumo.percentagem === null ? "Tarefas sem avaliação" : `${resumo.percentagem}% das tarefas avaliadas realizadas`}</p>
    <div className={css.resumoMetricas}>{CAMPOS_CORE.map(([id,titulo]) => <div key={id}><span>{titulo}</span><strong>{resumo.totais[id] === null ? "Sem informação" : ["sales","quotes"].includes(id) ? euros(resumo.totais[id]!) : resumo.totais[id]}</strong></div>)}</div>
    <details><summary>Ver resumos por semana</summary>{semanas.map(s => {
      const daSemana = DIAS_CORE.filter(d => semanaCore(d) === s && d <= dados.hoje);
      const r = resumirCore(dados.dias, daSemana[0]!, daSemana.at(-1)!);
      return <div key={s} className={css.resumoSemana}><strong>{dataExtenso(daSemana[0]!)} — {dataExtenso(daSemana.at(-1)!)}</strong><p>{r.diasRegistados} dias guardados · {r.diasSemInformacao.length} dias sem informação · {r.percentagem === null ? "Sem avaliação" : `${r.percentagem}% de tarefas realizadas`}</p><p>Vendas: {r.totais.sales === null ? "sem informação" : euros(r.totais.sales!)} · Novos TPs: {r.totais.tps ?? "sem informação"} · Follow-ups: {r.totais.followups ?? "sem informação"}</p></div>;
    })}</details>
  </div>;
}
