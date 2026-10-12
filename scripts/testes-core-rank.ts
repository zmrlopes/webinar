import assert from "node:assert/strict";
import { mock } from "node:test";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { CAMPOS_CORE, DIAS_CORE, TAREFAS_CORE, classificarCore, dataLisboa, diaTesteCore, diasMesCore, formularioVazio, metricasDasTarefas, podeGuardarDia, resumirCore, semanaCore, semanasFechadasCore, validarFormularioCore, type DadosCore, type DiaCore } from "../src/lib/core-rank";
import { FOCO_CORE } from "../src/lib/core-rank-foco";
import { ErroCore, guardarDiaCore, listarDiasCore, validarTextoRelatorio } from "../src/lib/core-rank-registos";
import { db, fecharDb } from "../src/lib/db";
import { exportarExcelCore, exportarPdfCore } from "../src/lib/core-rank-exportar";

assert.equal(DIAS_CORE.length,82);
assert.deepEqual(diasMesCore("2026-11"),Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,"0")}`));
assert.equal(diasMesCore("2026-12").length,31);
assert.equal(semanaCore("2026-11-01"),"2026-10-26"); // Domingo, semana atravessa o mês.
assert.equal(semanaCore("2026-11-02"),"2026-11-02");
assert.equal(dataLisboa(new Date("2026-10-11T23:30:00Z")),"2026-10-12"); // Hora de verão de Lisboa.
assert.equal(dataLisboa(new Date("2026-11-11T23:30:00Z")),"2026-11-11");
assert.equal(new Set(Object.values(FOCO_CORE)).size,82);
assert(DIAS_CORE.every(d=>typeof FOCO_CORE[d]==="string" && FOCO_CORE[d]!.length>30));
assert.equal(TAREFAS_CORE.length,32);
const vazio=validarFormularioCore(formularioVazio());
assert.equal(vazio.metricas.sales,null);
assert.throws(()=>validarFormularioCore({...vazio,metricas:{sales:-1}}));
assert.throws(()=>validarFormularioCore({...vazio,metricas:{sales:10.123}}));
assert.throws(()=>validarFormularioCore({...vazio,metricas:{tps:1.5}}));
assert.throws(()=>validarFormularioCore({...vazio,tarefas:{desconhecida:{estado:"done",quantidade:1}}}));
assert.throws(()=>validarFormularioCore({...vazio,tarefas:{core_time:{estado:"na",quantidade:60}}}));
const dia: DiaCore={...formularioVazio(),email:"teste@example.com",nome:"Teste",data:"2026-10-11",guardadoEm:"2026-10-11T20:00:00Z",tarefas:{core_time:{estado:"done",quantidade:60},core_talk:{estado:"no",quantidade:null},core_care:{estado:"na",quantidade:null},core_follow:{estado:"",quantidade:null}},metricas:{...vazio.metricas,minutes:60,sales:1000,tps:1}};
// Os registos dos consultores publicados também alimentam o histórico, o admin e o cron.
process.env.DATABASE_URL ??= "postgres://teste:teste@localhost/core_rank_teste";
const pool = db(), queryOriginal = pool.query;
pool.query = (async () => ({rows: [{valor: {...dia, data: "2026-10-12"}}, {valor: dia}]})) as unknown as typeof pool.query;
try {
  assert.deepEqual((await listarDiasCore(dia.email)).map(d => d.data), ["2026-10-11", "2026-10-12"]);
  assert.equal((await listarDiasCore()).filter(d => d.email === dia.email).length, 2);
} finally { pool.query = queryOriginal; await fecharDb(); }
assert.equal(podeGuardarDia("2026-10-11",[],"2026-10-11"),true);
assert.equal(podeGuardarDia("2026-10-11",[dia],"2026-10-11"),false);
assert.equal(podeGuardarDia("2026-10-11",[],"2026-10-12"),true);
assert.equal(podeGuardarDia("2026-10-11",[dia],"2026-10-12"),false);
assert.equal(podeGuardarDia("2026-10-11",[],"2026-10-13"),false);
assert.equal(podeGuardarDia("2026-10-31",[],"2026-11-01"),true);
assert.equal(podeGuardarDia("2026-11-30",[],"2026-12-01"),true);
assert.equal(podeGuardarDia("2026-12-31",[],"2027-01-01"),true);
assert.equal(podeGuardarDia("2026-12-31",[],"2027-01-02"),false);
assert.equal(podeGuardarDia("2026-10-10",[],"2026-10-11"),false);
// A tolerância acompanha a meia-noite de Lisboa, incluindo mudanças de hora.
assert.equal(podeGuardarDia("2026-10-11",[],dataLisboa(new Date("2026-10-12T22:59:59Z"))),true);
assert.equal(podeGuardarDia("2026-10-11",[],dataLisboa(new Date("2026-10-12T23:00:00Z"))),false);
assert.equal(podeGuardarDia("2026-10-24",[],dataLisboa(new Date("2026-10-25T23:59:59Z"))),true);
assert.equal(podeGuardarDia("2026-10-24",[],dataLisboa(new Date("2026-10-26T00:00:00Z"))),false);
// Domingo pode ser preenchido na segunda-feira; o relatório espera pela terça.
assert.deepEqual(semanasFechadasCore("2026-10-12"),[]);
assert.deepEqual(semanasFechadasCore("2026-10-13"),["2026-10-05"]);
assert(!semanasFechadasCore("2026-11-02").includes("2026-10-26"));
assert(semanasFechadasCore("2026-11-03").includes("2026-10-26"));
assert(!semanasFechadasCore("2027-01-01").includes("2026-12-28"));
assert(semanasFechadasCore("2027-01-02").includes("2026-12-28"));
assert.equal(podeGuardarDia("2026-10-12",[],"2026-10-11"),false);
assert.equal(podeGuardarDia("2027-01-01",[],"2027-01-01"),false);
assert.equal(diaTesteCore("2026-10-10"," ZMRLOPES@gmail.com "),true);
assert.equal(podeGuardarDia("2026-10-10",[],"2026-10-10","zmrlopes@gmail.com"),true);
assert.equal(podeGuardarDia("2026-10-10",[],"2026-10-10","outro@example.com"),false);
assert.equal(podeGuardarDia("2026-10-09",[],"2026-10-09","zmrlopes@gmail.com"),false);
assert.equal(podeGuardarDia("2026-10-10",[],"2026-10-11","zmrlopes@gmail.com"),false);
assert.equal(diasMesCore("2026-10","zmrlopes@gmail.com")[0],"2026-10-10");
assert.equal(diasMesCore("2026-10","outro@example.com")[0],"2026-10-11");
const teste: DiaCore={...dia,email:"zmrlopes@gmail.com",data:"2026-10-10",teste:true};
assert.equal(podeGuardarDia("2026-10-10",[teste],"2026-10-10",teste.email),false);
assert.equal(resumirCore([teste],"2026-10-10","2026-10-12").totais.sales,null);
assert.deepEqual(classificarCore([{email:teste.email,nome:teste.nome,dias:[teste]}],"2026-10-10","2026-10-12"),[]);
const resumo=resumirCore([dia],"2026-10-11","2026-10-12");
assert.equal(resumo.percentagem,50);assert.equal(resumo.avaliadas,2);assert.equal(resumo.diasRegistados,1);
assert.deepEqual(resumo.diasSemInformacao,["2026-10-12"]);
assert.equal(resumo.totais.responses,null);
assert.equal(resumo.totais.sales,1000);
assert.equal(resumirCore([],"2026-10-11","2026-10-12").percentagem,null);
const auto=metricasDasTarefas({core_time:{estado:"done",quantidade:45},core_follow:{estado:"done",quantidade:3},team_follow:{estado:"done",quantidade:2},travel_quote:{estado:"no",quantidade:null}});
assert.equal(auto.minutes,45);assert.equal(auto.followups,5);assert.equal(auto.contacts,null);
assert.equal(auto.sales,undefined); // Vendas e TPs não são inventados a partir de tarefas.
const todosNa={...dia,tarefas:{core_care:{estado:"na" as const,quantidade:null}}};
const ranking=classificarCore([{email:"a",nome:"A",dias:[dia]},{email:"b",nome:"B",dias:[{...dia,tarefas:{core_time:{estado:"done",quantidade:1}}}]},{email:"c",nome:"C",dias:[todosNa]}],"2026-10-11","2026-10-12");
assert.deepEqual(ranking.map(c=>c.email),["b","a"]); // Não se aplica fica fora; sem avaliação não entra no top.
const relatorio=validarTextoRelatorio(JSON.stringify({resumo:"Um dia registado; os restantes dias ficam sem informação.",pontosFortes:["Reservaste 60 minutos."],melhorias:["Escolhe um próximo passo para os contactos."],descurado:["Marcaste criar novas conversas como não realizado."],proximasAcoes:["Reserva um horário.","Inicia três conversas.","Retoma os interessados."]}));
assert.equal(relatorio.proximasAcoes.length,3);
assert.throws(()=>validarTextoRelatorio('{"resumo":"inventado"}'));
const dados: DadosCore={hoje:"2026-10-12",dias:[{...dia,aprendizagem:"Cliente pediu preço e datas. 😀",proximoPasso:"Confirmar a proposta."}],relatorios:[{...relatorio,semana:"2026-10-05",ate:"2026-10-11",criadoEm:"2026-10-12T08:00:00Z"}]};
const excel=await exportarExcelCore(dados,"Conta de teste"), livro=new ExcelJS.Workbook();
await livro.xlsx.load(excel as unknown as Parameters<typeof livro.xlsx.load>[0]);
assert.equal(livro.worksheets.length,4);
const folha=livro.getWorksheet("Dias")!;
assert.equal(folha.rowCount,3);assert.equal(folha.getRow(3).getCell(2).value,"Sem informação");
const indiceResponses=CAMPOS_CORE.findIndex(([id])=>id==="responses")+3;
assert.equal(folha.getRow(2).getCell(indiceResponses).value,null);
assert.equal(livro.getWorksheet("Tarefas")!.rowCount,5);
const pdf=await PDFDocument.load(await exportarPdfCore(dados,"Conta de teste"));assert(pdf.getPageCount()>0);
const exportacaoTeste=new ExcelJS.Workbook();await exportacaoTeste.xlsx.load(await exportarExcelCore({hoje:"2026-10-10",dias:[teste],relatorios:[]},"Teste") as unknown as Parameters<typeof livro.xlsx.load>[0]);
assert.equal(exportacaoTeste.getWorksheet("Dias")!.getRow(2).getCell(1).value,"2026-10-10");
assert.equal(exportacaoTeste.getWorksheet("Dias")!.getRow(2).getCell(2).value,"Teste — guardado");
// Exercita a gravação no servidor com relógio controlado e sem base de dados real.
const poolGravacao = db(), connectOriginal = poolGravacao.connect;
const gravados = new Map<string, DiaCore>();
let mudarRelogioNoBloqueio = false;
const cliente = {
  async query(sql: string, parametros: unknown[] = []) {
    if (sql.includes("pg_advisory_xact_lock") && mudarRelogioNoBloqueio) mock.timers.setTime(Date.parse("2026-10-12T23:00:00Z"));
    if (sql.startsWith("select valor")) return {rows: [...gravados.values()].filter(d => d.data >= String(parametros[1]) && d.data <= String(parametros[2])).map(valor => ({valor}))};
    if (sql.startsWith("insert")) {
      assert(sql.includes("on conflict (chave) do nothing"));
      const chave = String(parametros[0]);
      if (gravados.has(chave)) return {rows: [], rowCount: 0};
      gravados.set(chave, JSON.parse(String(parametros[1])) as DiaCore);
      return {rows: [{chave}], rowCount: 1};
    }
    return {rows: [], rowCount: 0};
  },
  release() {},
};
poolGravacao.connect = (async () => cliente) as unknown as typeof poolGravacao.connect;
mock.timers.enable({apis: ["Date"], now: Date.parse("2026-10-12T20:00:00Z")});
try {
  const tarefaSemanal = TAREFAS_CORE.find(t => t.grupo === "week")!.id;
  const formularioDomingo = {...formularioVazio(), diaPromocoes: 0, tarefas: {[tarefaSemanal]: {estado: "done" as const, quantidade: 2}}};
  const domingo = await guardarDiaCore(dia.email, dia.nome, "2026-10-11", formularioDomingo);
  assert.equal(domingo.data,"2026-10-11"); // A atividade pertence a domingo, apesar da gravação na segunda.
  assert.equal(domingo.guardadoEm,"2026-10-12T20:00:00.000Z");
  await assert.rejects(() => guardarDiaCore(dia.email, dia.nome, "2026-10-11", formularioVazio()), (erro: unknown) => erro instanceof ErroCore && erro.status === 409);
  await assert.rejects(() => guardarDiaCore(dia.email, dia.nome, "2026-10-10", formularioVazio()), (erro: unknown) => erro instanceof ErroCore && erro.status === 400);
  await assert.rejects(() => guardarDiaCore(dia.email, dia.nome, "2026-10-13", formularioVazio()), (erro: unknown) => erro instanceof ErroCore && erro.status === 400);
  gravados.clear();
  mock.timers.setTime(Date.parse("2026-10-19T20:00:00Z"));
  gravados.set("semanal-anterior", {...domingo, data: "2026-10-16", diaPromocoes: 5});
  await assert.rejects(() => guardarDiaCore(dia.email, dia.nome, "2026-10-18", formularioDomingo), (erro: unknown) => erro instanceof ErroCore && erro.status === 409);
  gravados.clear();
  mock.timers.setTime(Date.parse("2026-10-12T22:59:59Z"));
  mudarRelogioNoBloqueio = true;
  await assert.rejects(() => guardarDiaCore(dia.email, dia.nome, "2026-10-11", formularioVazio()), (erro: unknown) => erro instanceof ErroCore && erro.status === 400);
  assert.equal(gravados.size,0); // O prazo é verificado depois de adquirir o bloqueio.
} finally { mock.timers.reset(); poolGravacao.connect = connectOriginal; await fecharDb(); }
console.log("Core Rank: calendário, 82 focos únicos, validação, tolerância de um dia na hora de Lisboa, bloqueio de dias guardados, fecho semanal após tolerância, dados em falta, balanço automático, classificação, relatório e exportações verificados.");
