import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { gerarExcelRespostasHotel, type RespostaHotelAdmin } from "../src/lib/hotel";

const base: RespostaHotelAdmin = {
  nome: "Quarto com criança", email: "familia@example.invalid", querQuarto: true,
  tipoQuarto: "duplo", noiteAnterior: true, noiteSeguinte: false,
  temCriancas: true, idadesCriancas: "1 ano", criadoEm: new Date("2026-10-12T12:00:00Z"),
};
const recusou: RespostaHotelAdmin = {
  ...base, nome: "Sem quarto", email: "sem-quarto@example.invalid", querQuarto: false,
  tipoQuarto: null, noiteAnterior: false, temCriancas: false, idadesCriancas: null,
};
const single: RespostaHotelAdmin = {
  ...base, nome: "Quarto single", email: "single@example.invalid", tipoQuarto: "single",
  noiteAnterior: false, noiteSeguinte: true, temCriancas: false, idadesCriancas: null,
};

async function ler(respostas: RespostaHotelAdmin[]) {
  const workbook = new ExcelJS.Workbook();
  const bytes = await gerarExcelRespostasHotel(respostas);
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet("Quartos do hotel");
  assert(sheet);
  return sheet;
}

const sheet = await ler([recusou, base, single]);
assert.equal(sheet.rowCount, 3);
assert.equal(sheet.getCell("B2").value, base.email);
assert.equal(sheet.getCell("B3").value, single.email);
assert.equal(sheet.getCell("C2").value, "Sim");
assert.equal(sheet.getCell("D2").value, "Duplo/Twin");
assert.equal(sheet.getCell("E2").value, "Sim");
assert.equal(sheet.getCell("F2").value, "Não");
assert.equal(sheet.getCell("G2").value, 1);
assert.equal(sheet.getCell("H2").value, "Sim");
assert.equal(sheet.getCell("I2").value, "1 ano");
assert.equal(sheet.getCell("D3").value, "Single");
assert(sheet.getCell("J2").value instanceof Date);
assert(sheet.getTable("QuartosHotel"));
for (const respostas of [[], [recusou]]) {
  const empty = await ler(respostas);
  assert.equal(empty.rowCount, 1);
  assert.equal(empty.getCell("B1").value, "Email");
}
console.log("OK: Excel inclui apenas pedidos de quarto, mantém noites e crianças e aceita listas sem pedidos.");
