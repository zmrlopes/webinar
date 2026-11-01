/** Dados privados do dashboard individual; sem dependência dos snapshots do admin. */
export const METRICAS_NEGOCIO = ["faturacao", "comissoes", "pontos", "consultores"] as const;
export type MetricaNegocio = typeof METRICAS_NEGOCIO[number];
export type TotaisNegocio = Record<MetricaNegocio, number>;
export const ROTULOS_NEGOCIO: Record<MetricaNegocio, string> = {
  faturacao: "Faturação da equipa", comissoes: "Comissões totais", pontos: "Pontos da equipa", consultores: "Novos consultores",
};
export const MESES_NEGOCIO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export interface PeriodoNegocio { chave: string; inicio: string; fim: string }
export interface PlanoNegocio { id: string; hoje: string; periodos: PeriodoNegocio[] }
export interface DadosNegocio {
  ate: string; atualizadoEm: string; origemEmail: string;
  versao?: 2; inicioHistorico?: string;
  meses: Record<string, TotaisNegocio>;
  homologo: TotaisNegocio;
}
const dois = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
export const ANO_INICIO_NEGOCIO = 2019;
export function periodosNegocio(hoje: string, dataRegisto?: string | null): PeriodoNegocio[] {
  const [ano, mes, dia] = hoje.split("-").map(Number) as [number, number, number];
  const registo = dataRegisto && /^\d{4}-\d{2}-\d{2}$/.test(dataRegisto) ? Number(dataRegisto.slice(0, 4)) : NaN;
  const primeiroAno = Number.isInteger(registo) && registo <= ano ? Math.max(ANO_INICIO_NEGOCIO, registo) : ANO_INICIO_NEGOCIO;
  const periodos: PeriodoNegocio[] = [];
  for (let a = primeiroAno; a <= ano; a++) {
    for (let m = 1; m <= (a === ano ? mes : 12); m++) {
      const chave = `${a}-${dois(m)}`;
      periodos.push({chave, inicio: `${chave}-01`, fim: a === ano && m === mes ? hoje : `${chave}-${dois(ultimoDia(a, m))}`});
    }
  }
  if (ano - 1 >= primeiroAno) {
    const chave = `${ano - 1}-${dois(mes)}`;
    periodos.push({chave: "homologo", inicio: `${chave}-01`, fim: `${chave}-${dois(Math.min(dia, ultimoDia(ano - 1, mes)))}`});
  }
  return periodos;
}
export function anosNegocio(dados: DadosNegocio): number[] {
  return [...new Set(Object.keys(dados.meses).filter(k => /^\d{4}-\d{2}$/.test(k)).map(k => Number(k.slice(0, 4))))]
    .filter(a => a >= ANO_INICIO_NEGOCIO && a <= Number(dados.ate.slice(0, 4))).sort((a, b) => a - b);
}
export const arredondarNegocio = (v: number) => Math.round(v * 100) / 100;
export function validarTotaisNegocio(valor: unknown): TotaisNegocio {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Os totais recebidos são inválidos.");
  const v = valor as Record<string, unknown>;
  const totais = {} as TotaisNegocio;
  for (const k of METRICAS_NEGOCIO) {
    const n = v[k];
    if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1e12 || (k === "consultores" && (!Number.isInteger(n) || n < 0))) {
      throw new Error("O MyOffice não devolveu todos os indicadores válidos.");
    }
    totais[k] = arredondarNegocio(n);
  }
  return totais;
}
export function resumoNegocio(dados: DadosNegocio, metrica: MetricaNegocio) {
  const ano = Number(dados.ate.slice(0, 4)), mes = Number(dados.ate.slice(5, 7));
  let atual = 0, anterior = dados.homologo[metrica];
  for (let m = 1; m <= mes; m++) atual += dados.meses[`${ano}-${dois(m)}`]?.[metrica] ?? 0;
  for (let m = 1; m < mes; m++) anterior += dados.meses[`${ano - 1}-${dois(m)}`]?.[metrica] ?? 0;
  atual = arredondarNegocio(atual); anterior = arredondarNegocio(anterior);
  return {atual, anterior, variacao: anterior > 0 ? arredondarNegocio((atual / anterior - 1) * 100) : null};
}
export function fatorMedioNegocio(dados: DadosNegocio): number {
  const taxas = METRICAS_NEGOCIO.map(k => resumoNegocio(dados, k).variacao).filter((v): v is number => v !== null);
  return taxas.length ? Math.max(0, arredondarNegocio(1 + taxas.reduce((s, v) => s + v, 0) / taxas.length / 100)) : 1;
}
export function projecoesNegocio(base: number, fator: number): number[] {
  return Array.from({length: 6}, (_, i) => arredondarNegocio(base * fator ** i));
}
