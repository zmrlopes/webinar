import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { construirCoreDiretos, progressoCoreDireto, type MembroCoreDiretos } from "../src/lib/core-rank-diretos";
import { importarCoreDiretos } from "../src/lib/core-rank-diretos-importar";

const m = (username: string, upline = "", reservas = 0, entrada = "2020-01-01"): MembroCoreDiretos => ({
  username, upline, reservas, entrada, email: `${username}@example.com`, nome: username, estado: "Ativo", subscricoes: 0,
});
const membros = [m("raiz"), m("segunda", "raiz"), m("direto", "raiz", 3000), m("outro", "segunda"),
  m("novo1", "direto", 1000, "2026-10-01"), m("novo2", "direto", 1000, "2026-10-15"), m("novo3", "direto", 1000, "2026-10-29"),
  m("antigo", "direto", 9000, "2026-09-30"), m("futuro", "direto", 5000, "2026-11-01"),
  m("neto", "novo1", 9000, "2026-10-10")];
const dados = construirCoreDiretos(membros, [" RAIZ@example.com ", "segunda@example.com"], "2026-10-01", "2026-10-31", "teste.xlsx");
assert.deepEqual(dados.consultores.map(c => c.username), ["direto", "outro"], "Não incluir contas próprias nem níveis seguintes");
const direto = dados.consultores[0]!;
assert.deepEqual(direto.novos.map(n => n.username), ["novo1", "novo2", "novo3"], "Respeitar os limites do período e o patrocinador imediato");
assert.equal(progressoCoreDireto(direto).concluido, true);
assert.equal(progressoCoreDireto({ ...direto, novos: direto.novos.map(n => ({ ...n, reservas: 999.99, estado: "Ativo" })) }).ativos, 0, "Ativação exige reservas, não só subscrição ativa");
assert.equal(progressoCoreDireto({ ...direto, reservas: 2999.99 }).concluido, false);
assert.equal(progressoCoreDireto({ ...direto, novos: direto.novos.map(n => ({ ...n, reservas: 0 })) }).concluido, true, "O cartão oficial usa reservas e subscrições; a ativação acompanha-se separadamente");
const verificado = { ...direto, reservas: 2431.97, verificacaoCore: { mes: "2026-10", reservas: 2481.97, subscricoes: 0, metaReservas: 3000, metaNovos: 3, consultadoEm: "2026-10-29T19:00:00Z" } };
assert.equal(progressoCoreDireto(verificado).reservas, 2481.97, "O valor oficial do Core Rank tem prioridade sobre a exportação");
assert.equal(progressoCoreDireto(verificado).novos, 0, "A conferência mantém a contagem oficial de subscrições");
assert.throws(() => construirCoreDiretos(membros, ["inexistente@example.com"], "2026-10-01", "2026-10-31", "teste"));
assert.throws(() => construirCoreDiretos(membros, ["raiz@example.com"], "2026-02-30", "2026-10-31", "teste"));
assert.throws(() => construirCoreDiretos([...membros, membros[0]!], ["raiz@example.com"], "2026-10-01", "2026-10-31", "teste"));

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Organização");
sheet.addRow(["Nome", "Username", "Email", "Upline Username", "Estado", "Data de subscrição", "Reservas exclusivas do Travel Partner", "Novas Subscrições Próprias no filtro", "Reservas da sua estrutura"]);
for (const p of membros) sheet.addRow([p.nome, p.username, p.email, p.upline, p.estado, new Date(p.entrada!), p.reservas, p.subscricoes, 900000]);
const bytes = await workbook.xlsx.writeBuffer();
const importado = await importarCoreDiretos(bytes as ArrayBuffer, ["raiz@example.com", "segunda@example.com"], "2026-10-01", "2026-10-31", "teste.xlsx");
assert.equal(importado.consultores[0]!.reservas, 3000, "Usar vendas pessoais, nunca o volume da estrutura");
assert.equal(importado.consultores[0]!.novos.length, 3);
sheet.getRow(2).getCell(7).value = "desconhecido";
await assert.rejects(() => workbook.xlsx.writeBuffer().then(b => importarCoreDiretos(b as ArrayBuffer, ["raiz@example.com"], "2026-10-01", "2026-10-31", "teste.xlsx")));
console.log("Core Rank dos diretos: relações, datas, ativação e importação Excel verificados.");
