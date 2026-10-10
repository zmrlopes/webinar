import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CAMPOS_CORE, INICIO_CORE, FIM_CORE, TAREFAS_CORE, datasHistoricoCore, resumirCore, type DadosCore } from "./core-rank";

const ESTADOS = {"": "Sem informação", done: "Fiz", no: "Não fiz", na: "Não se aplica"};
const dinheiro = (n: number) => new Intl.NumberFormat("pt-PT", {style: "currency", currency: "EUR"}).format(n);

export async function exportarExcelCore(dados: DadosCore, nome: string): Promise<Uint8Array> {
  const livro = new ExcelJS.Workbook(); livro.creator = "Tropa de Elite"; livro.created = new Date();
  const dias = livro.addWorksheet("Dias");
  dias.columns = [{header: "Data", key: "data", width: 14}, {header: "Estado", key: "estado", width: 22}, ...CAMPOS_CORE.map(([key, header]) => ({header, key, width: 24})), {header: "Aprendizagem", key: "aprendizagem", width: 45}, {header: "Próximo passo", key: "proximoPasso", width: 45}];
  for (const data of datasHistoricoCore(dados)) {
    const dia = dados.dias.find(d => d.data === data);
    dias.addRow({data, estado: dia?.teste ? "Teste — guardado" : dia ? "Guardado" : "Sem informação", ...dia?.metricas, aprendizagem: dia?.aprendizagem, proximoPasso: dia?.proximoPasso});
  }
  for (const id of ["sales", "quotes"]) dias.getColumn(id).numFmt = '#,##0.00 "€"';
  const tarefas = livro.addWorksheet("Tarefas");
  tarefas.columns = [{header: "Data", key: "data", width: 14}, {header: "Tarefa", key: "tarefa", width: 48}, {header: "Periodicidade", key: "grupo", width: 18}, {header: "Estado", key: "estado", width: 20}, {header: "Quantidade", key: "quantidade", width: 16}];
  for (const d of dados.dias) for (const [id, marca] of Object.entries(d.tarefas)) tarefas.addRow({data: d.data, tarefa: TAREFAS_CORE.find(t => t.id === id)?.titulo ?? id, grupo: id.startsWith("week_") ? "Semanal" : "Diária", estado: ESTADOS[marca.estado], quantidade: marca.quantidade});
  const relatorios = livro.addWorksheet("Relatórios");
  relatorios.columns = [{header: "Início da semana", key: "semana", width: 20}, {header: "Até", key: "ate", width: 14}, {header: "Secção", key: "seccao", width: 24}, {header: "Análise", key: "texto", width: 95}];
  for (const r of dados.relatorios) {
    relatorios.addRow({semana: r.semana, ate: r.ate, seccao: "Resumo", texto: r.resumo});
    for (const [titulo, itens] of [["Pontos fortes", r.pontosFortes], ["Melhorias", r.melhorias], ["Descurado", r.descurado], ["Próximas ações", r.proximasAcoes]] as [string, string[]][]) for (const texto of itens) relatorios.addRow({semana: r.semana, ate: r.ate, seccao: titulo, texto});
  }
  const resumo = livro.addWorksheet("Resumo");
  resumo.columns = [{header: "Campo", key: "campo", width: 35}, {header: "Valor", key: "valor", width: 55}];
  resumo.addRows([{campo: "Consultor", valor: nome}, {campo: "Desafio", valor: "11 outubro — 31 dezembro 2026"}, {campo: "Objetivo acumulado", valor: "3 novos TPs próprios + 3.000 € de reservas confirmadas"}, {campo: "Dias guardados", valor: dados.dias.filter(d => !d.teste).length}, {campo: "Registos de teste", valor: dados.dias.filter(d => d.teste).length}, {campo: "Campos vazios", valor: "Sem informação; não equivalem a zero"}, {campo: "Tarefas não aplicáveis", valor: "Excluídas da avaliação"}]);
  for (const folha of livro.worksheets) {
    folha.views = [{state: "frozen", ySplit: 1}]; folha.autoFilter = {from: {row: 1, column: 1}, to: {row: 1, column: folha.columnCount}};
    folha.getRow(1).height = 30; folha.getRow(1).font = {bold: true, color: {argb: "FFFFFFFF"}}; folha.getRow(1).fill = {type: "pattern", pattern: "solid", fgColor: {argb: "FF4B5320"}};
    folha.eachRow((linha, n) => {if (n > 1) linha.alignment = {vertical: "top", wrapText: true};});
  }
  return new Uint8Array(await livro.xlsx.writeBuffer());
}

export async function exportarPdfCore(dados: DadosCore, nome: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create(); pdf.setTitle("Core Rank — Histórico"); pdf.setAuthor("Tropa de Elite");
  const normal = await pdf.embedFont(StandardFonts.Helvetica), negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina = pdf.addPage([595.28, 841.89]), y = 790;
  const cor = rgb(75/255,83/255,32/255);
  const limpo = (s: string) => s.replace(/\u202f|\u00a0/g," ").replace(/[^\x20-\x7e\u00a0-\u00ff\u20ac\u2013\u2014\u2018\u2019\u201c\u201d\n]/gu, "");
  function linha(texto: string, titulo = false) {
    const tamanho = titulo ? 13 : 10, fonte = titulo ? negrito : normal;
    for (const paragrafo of limpo(texto).split("\n")) {
      let atual = "";
      const palavras = paragrafo.split(/\s+/).flatMap(p => {const partes: string[] = []; let parte = ""; for (const ch of p) {if (fonte.widthOfTextAtSize(parte + ch, tamanho) > 495) {partes.push(parte); parte = "";} parte += ch;} if (parte) partes.push(parte); return partes;});
      const imprimir = () => {if (y < 55) {pagina = pdf.addPage([595.28,841.89]); y = 790;} pagina.drawText(atual,{x:50,y,size:tamanho,font:fonte,color:titulo ? cor : rgb(.15,.15,.15)}); y -= titulo ? 21 : 16;};
      for (const palavra of palavras) {const proxima = atual ? `${atual} ${palavra}` : palavra; if (fonte.widthOfTextAtSize(proxima,tamanho) > 495 && atual) {imprimir(); atual = palavra;} else atual = proxima;}
      if (atual) imprimir();
    }
    y -= 6;
  }
  linha("TROPA DE ELITE · CORE RANK", true); linha(nome, true);
  linha("Desafio: 11 de outubro a 31 de dezembro de 2026. Objetivo acumulado: 3 TPs próprios + 3.000 € de reservas confirmadas.");
  const resumo = resumirCore(dados.dias, INICIO_CORE, dados.hoje < FIM_CORE ? dados.hoje : FIM_CORE);
  linha(`Dias guardados no desafio: ${dados.dias.filter(d => !d.teste).length}. Novos TPs: ${resumo.totais.tps ?? 0}. Vendas confirmadas: ${dinheiro(resumo.totais.sales ?? 0)}.`);
  linha("Os campos vazios ficam sem informação. Não se aplica fica fora da avaliação.");
  if (resumo.diasSemInformacao.length) linha(`Dias sem informação: ${resumo.diasSemInformacao.join(", ")}`);
  if (!dados.dias.length) linha("Ainda não há dias guardados.");
  for (const d of dados.dias) {
    linha(`${d.data}${d.teste ? " — Registo de teste (fora do objetivo e da classificação)" : ""}`, true);
    for (const [id, titulo] of CAMPOS_CORE) linha(`${titulo}: ${d.metricas[id] == null ? "Sem informação" : ["quotes","sales"].includes(id) ? dinheiro(d.metricas[id]!) : d.metricas[id]}`);
    for (const [id, marca] of Object.entries(d.tarefas)) linha(`${TAREFAS_CORE.find(t => t.id === id)?.titulo ?? id}: ${ESTADOS[marca.estado]}${marca.quantidade === null ? "" : ` · Quantidade: ${marca.quantidade}`}`);
    linha(`Aprendizagem: ${d.aprendizagem || "Sem informação"}`); linha(`Próximo passo: ${d.proximoPasso || "Sem informação"}`);
  }
  for (const r of dados.relatorios) {
    linha(`Relatório: ${r.semana} a ${r.ate}`, true); linha(r.resumo);
    for (const [titulo, itens] of [["O que fizeste bem",r.pontosFortes],["O que tens de melhorar",r.melhorias],["O que ficou descurado",r.descurado],["Próximas três ações",r.proximasAcoes]] as [string,string[]][]) {linha(titulo,true); for (const t of itens) linha(`- ${t}`);}
  }
  for (const [i,p] of pdf.getPages().entries()) p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:500,y:28,size:9,font:normal,color:rgb(.35,.35,.35)});
  return pdf.save();
}
