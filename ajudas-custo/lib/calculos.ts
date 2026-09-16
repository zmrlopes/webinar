import type { DadosEmpresa } from "@/config/empresa";
import type { Feriado } from "@/lib/feriados";

export const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type TipoAjuda = "N-Nacional" | "E-Estrangeiro";

export interface LinhaMapa {
  dia: number;
  data: string; // AAAA-MM-DD
  servico: string;
  local: string;
  inicioDia: string;
  inicioHora: string;
  termoDia: string;
  termoHora: string;
  tipo: TipoAjuda;
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function dataISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function ehFimDeSemana(ano: number, mes: number, dia: number): boolean {
  const diaSemana = new Date(ano, mes - 1, dia).getDay();
  return diaSemana === 0 || diaSemana === 6;
}

export function linhaEhCinzenta(ano: number, mes: number, dia: number, feriados: Feriado[]): boolean {
  return ehFimDeSemana(ano, mes, dia) || feriados.some((f) => f.data === dataISO(ano, mes, dia));
}

export function gerarLinhasMes(ano: number, mes: number): LinhaMapa[] {
  const total = diasNoMes(ano, mes);
  return Array.from({ length: total }, (_, indice) => {
    const dia = indice + 1;
    return {
      dia,
      data: dataISO(ano, mes, dia),
      servico: "",
      local: "",
      inicioDia: "",
      inicioHora: "",
      termoDia: "",
      termoHora: "",
      tipo: "N-Nacional" as TipoAjuda,
    };
  });
}

export function ultimoDiaUtil(ano: number, mes: number, feriados: Feriado[]): number {
  const total = diasNoMes(ano, mes);
  for (let dia = total; dia >= 1; dia--) {
    if (!linhaEhCinzenta(ano, mes, dia, feriados)) return dia;
  }
  return total;
}

export function formatarDataPorExtenso(ano: number, mes: number, dia: number): string {
  return `${dia} de ${NOMES_MESES[mes - 1]!.toLowerCase()} de ${ano}`;
}

export function totalDias(linhas: LinhaMapa[]): number {
  return linhas.filter((l) => l.servico.trim() !== "").length;
}

export function valorLinha(linha: LinhaMapa, empresa: DadosEmpresa): number {
  if (!linha.servico.trim()) return 0;
  return linha.tipo === "E-Estrangeiro" ? empresa.valorDiarioEstrangeiro : empresa.valorDiarioNacional;
}

export function totalValor(linhas: LinhaMapa[], empresa: DadosEmpresa): number {
  return linhas.reduce((soma, linha) => soma + valorLinha(linha, empresa), 0);
}
