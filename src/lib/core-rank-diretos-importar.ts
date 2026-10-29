import ExcelJS from "exceljs";
import { construirCoreDiretos, type DadosCoreDiretos, type MembroCoreDiretos } from "./core-rank-diretos";
import { construirCoreGrupo, type GrupoCore } from "./core-rank-grupo";

/** O Excel do Analisador contém reservas pessoais no período, e não o acumulado vitalício. */
export async function lerMembrosCoreExcel(bytes: ArrayBuffer): Promise<MembroCoreDiretos[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount > 10000) throw new Error("Exportação vazia ou demasiado grande.");
  const colunas = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, i) => colunas.set(cell.text.trim(), i));
  for (const c of ["Nome", "Username", "Email", "Upline Username", "Estado", "Data de subscrição", "Reservas exclusivas do Travel Partner", "Novas Subscrições Próprias no filtro"]) {
    if (!colunas.has(c)) throw new Error(`Falta a coluna «${c}». Exporta o Excel do Analisador de Organização.`);
  }
  const membros: MembroCoreDiretos[] = [];
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const cell = (c: string) => row.getCell(colunas.get(c)!);
    const text = (c: string) => cell(c).text.trim();
    if (!text("Username")) return;
    const numero = (c: string) => {
      const v = cell(c).value;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(`Valor inválido em «${c}», linha ${i}.`);
      return v;
    };
    const v = cell("Data de subscrição").value;
    const d = v instanceof Date ? v : typeof v === "string" ? new Date(v) : null;
    if (v && (!d || Number.isNaN(d.getTime()))) throw new Error(`Data de subscrição inválida na linha ${i}.`);
    membros.push({ nome: text("Nome"), username: text("Username"), email: text("Email").toLowerCase(),
      upline: text("Upline Username"), estado: text("Estado"), entrada: d?.toISOString().slice(0, 10) ?? null,
      reservas: numero("Reservas exclusivas do Travel Partner"), subscricoes: numero("Novas Subscrições Próprias no filtro") });
  });
  return membros;
}

export async function importarCoreDiretos(bytes: ArrayBuffer, emails: string[], desde: string, ate: string, fonte: string): Promise<DadosCoreDiretos> {
  return construirCoreDiretos(await lerMembrosCoreExcel(bytes), emails, desde, ate, fonte);
}

export async function importarCoreGrupo(bytes: ArrayBuffer, grupo: GrupoCore, desde: string, ate: string, fonte: string): Promise<DadosCoreDiretos> {
  return construirCoreGrupo(await lerMembrosCoreExcel(bytes), grupo, desde, ate, fonte);
}
