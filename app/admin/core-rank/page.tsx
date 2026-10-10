import { classificarCore, dataLisboa, DIA_TESTE_CORE, FIM_CORE, INICIO_CORE, semanaCore, somarDias, type EntradaTopCore } from "@/lib/core-rank";
import { listarDiasCore } from "@/lib/core-rank-registos";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import css from "./top.module.css";

export const dynamic = "force-dynamic";
function TabelaCore({consultores, legenda}: {consultores: ReturnType<typeof classificarCore>; legenda: string}) {
  return <div className={css.tabela}><table><caption>{legenda}</caption><thead><tr><th>Posição</th><th>Consultor</th><th>Tarefas feitas</th><th>Dias registados</th><th>Minutos</th><th>Contactos</th><th>Follow-ups</th><th>Vendas</th><th>TPs</th></tr></thead><tbody>{consultores.map((c,i) => <tr key={c.email}><td>{i+1}</td><td><strong>{c.nome}</strong><small>{c.email}</small></td><td><strong>{c.percentagem}%</strong><small>{c.feitas} de {c.avaliadas} avaliadas</small></td><td>{c.diasRegistados}</td><td>{c.totais.minutes ?? "—"}</td><td>{c.totais.contacts ?? "—"}</td><td>{c.totais.followups ?? "—"}</td><td>{c.totais.sales === null ? "—" : new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(c.totais.sales ?? 0)}</td><td>{c.totais.tps ?? "—"}</td></tr>)}</tbody></table></div>;
}
export default async function TopCoreRank({searchParams}: {searchParams: Promise<{periodo?: string; mes?: string}>}) {
  const params = await searchParams;
  const hoje = dataLisboa(), periodo = params.periodo === "mes" || params.periodo === "desafio" ? params.periodo : "semana";
  const mes = ["2026-10","2026-11","2026-12"].includes(params.mes ?? "") ? params.mes! : hoje < INICIO_CORE ? "2026-10" : hoje > FIM_CORE ? "2026-12" : hoje.slice(0,7);
  const comeco = periodo === "desafio" ? INICIO_CORE : periodo === "mes" ? `${mes}-01` : semanaCore(hoje);
  const final = periodo === "desafio" ? FIM_CORE : periodo === "mes" ? `${mes}-${mes === "2026-11" ? "30" : "31"}` : somarDias(comeco,6);
  const inicio = comeco < INICIO_CORE ? INICIO_CORE : comeco, fim = final > FIM_CORE ? FIM_CORE : final;
  const agrupados = new Map<string, EntradaTopCore>();
  const dias = await listarDiasCore();
  for (const d of dias) {const c = agrupados.get(d.email) ?? {email:d.email,nome:d.nome,dias:[]}; c.dias.push(d); agrupados.set(d.email,c);}
  const top = classificarCore([...agrupados.values()],inicio,fim);
  const registoTeste = dias.find(d => d.teste && d.email === EMAIL_PAINEL_DEMONSTRACAO && d.data === DIA_TESTE_CORE);
  // Apenas a prévia utiliza o registo de teste como atividade; o Top 10 mantém a exclusão.
  const previa = registoTeste ? classificarCore([{email: registoTeste.email, nome: registoTeste.nome, dias: [{...registoTeste, teste: false}]}], DIA_TESTE_CORE, DIA_TESTE_CORE) : [];
  return <section className={css.pagina}><span className={css.etiqueta}>OBJETIVOS · ATIVIDADE REGISTADA</span><h1>Core Rank — Top 10</h1><p>Os consultores com maior percentagem de tarefas aplicáveis realizadas. Esta classificação é visível apenas no admin.</p>
    {registoTeste && <section id="core-rank-teste" className={css.previa} aria-labelledby="core-rank-teste-titulo"><span className={css.etiqueta}>CONTA DE TESTE</span><h2 id="core-rank-teste-titulo">Prévia do registo de 10/10/2026</h2><p>O teu dia de teste aparece com os mesmos indicadores do Top 10 e fica fora da classificação oficial.</p><TabelaCore consultores={previa} legenda="Registo de teste · 10/10/2026" />{!previa.length && <p>O dia foi guardado sem tarefas avaliadas. A classificação surge quando houver tarefas marcadas como realizadas ou não realizadas.</p>}</section>}
    <form className={css.filtros}><label>Período<select name="periodo" defaultValue={periodo}><option value="semana">Esta semana</option><option value="mes">Mês</option><option value="desafio">Todo o desafio</option></select></label><label>Mês<select name="mes" defaultValue={mes}><option value="2026-10">Outubro 2026</option><option value="2026-11">Novembro 2026</option><option value="2026-12">Dezembro 2026</option></select></label><button type="submit">Ver classificação</button></form>
    <p className={css.nota}>Desempates: dias registados, tarefas realizadas e minutos dedicados. “Não se aplica” e “Sem informação” ficam fora da percentagem. Os resultados são declarados pelos consultores; vendas e TPs não determinam a posição.</p>
    <TabelaCore consultores={top} legenda={inicio <= fim ? `${inicio} a ${fim}` : "Desafio de 11 de outubro a 31 de dezembro de 2026"} />
    {!top.length && <p className={css.vazio}>Ainda não há atividade registada e avaliada neste período.</p>}
  </section>;
}
