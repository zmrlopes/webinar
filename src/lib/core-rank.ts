import referencia from "./core-rank-tarefas.json";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";

export const INICIO_CORE = "2026-10-11";
export const FIM_CORE = "2026-12-31";
export const DIA_TESTE_CORE = "2026-10-10";
export function diaTesteCore(data: string, email = ""): boolean {
  return data === DIA_TESTE_CORE && email.trim().toLowerCase() === EMAIL_PAINEL_DEMONSTRACAO;
}
export const META_TPS = 3;
export const META_VENDAS = 3000;
export type GrupoCore = "core" | "team" | "travel" | "week";
export type EstadoTarefa = "" | "done" | "no" | "na";
export type TarefaCore = { id: string; grupo: GrupoCore; titulo: string; sugestao: string; descricao: string };
export const GRUPOS_CORE: {id: GrupoCore; titulo: string; descricao: string}[] = [
  {id: "core", titulo: "Prioridades do dia", descricao: "Tempo, conversas e próximos passos"},
  {id: "team", titulo: "Criar equipa", descricao: "Outras ações · contactos e convites"},
  {id: "travel", titulo: "Vender viagens", descricao: "Outras ações · clientes e propostas"},
  {id: "week", titulo: "Esta semana", descricao: "Promoções, emails e recomendações"},
];
export const TAREFAS_CORE: TarefaCore[] = GRUPOS_CORE.flatMap(({id: grupo}) =>
  referencia.tasks[grupo].map(([id, titulo, sugestao, descricao]) => ({id: `${grupo}_${id}`, grupo, titulo: titulo!, sugestao: sugestao!, descricao: descricao!})),
);
export const CAMPOS_CORE = referencia.fields as [string, string][];
export type MarcaCore = {estado: EstadoTarefa; quantidade: number | null};
export type FormularioCore = {tarefas: Record<string, MarcaCore>; metricas: Record<string, number | null>; aprendizagem: string; proximoPasso: string; diaPromocoes: number | null};
export type DiaCore = FormularioCore & {email: string; nome: string; data: string; guardadoEm: string; teste?: boolean};
export type RelatorioCore = {semana: string; ate: string; criadoEm: string; resumo: string; pontosFortes: string[]; melhorias: string[]; descurado: string[]; proximasAcoes: string[]; lidoEm?: string};
export type DadosCore = {hoje: string; dias: DiaCore[]; relatorios: RelatorioCore[]; automacao?: {ia: boolean; agendamento: boolean}};

export function dataLisboa(agora = new Date()): string {
  const p = new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(agora);
  const valor = (tipo: string) => p.find(x => x.type === tipo)!.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
export function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function semanaCore(data: string): string {
  const dia = new Date(`${data}T12:00:00Z`).getUTCDay(); return somarDias(data, -(dia + 6) % 7);
}
export function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = []; for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d); return dias;
}
export const DIAS_CORE = diasEntre(INICIO_CORE, FIM_CORE);
export function diasCoreConta(email = ""): string[] { return diaTesteCore(DIA_TESTE_CORE, email) ? [DIA_TESTE_CORE, ...DIAS_CORE] : DIAS_CORE; }
export function diasMesCore(mes: string, email = ""): string[] { return diasCoreConta(email).filter(d => d.startsWith(mes)); }
export function datasHistoricoCore(dados: DadosCore): string[] {
  return [...new Set([...diasEntre(INICIO_CORE, dados.hoje < FIM_CORE ? dados.hoje : FIM_CORE), ...dados.dias.filter(d => d.teste).map(d => d.data)])].sort();
}
export function formularioVazio(): FormularioCore {
  return {tarefas: {}, metricas: Object.fromEntries(CAMPOS_CORE.map(([id]) => [id, null])), aprendizagem: "", proximoPasso: "", diaPromocoes: null};
}
export function podeGuardarDia(data: string, dias: DiaCore[], hoje = dataLisboa(), email = ""): boolean {
  return data === hoje && ((data >= INICIO_CORE && data <= FIM_CORE) || diaTesteCore(data, email)) && !dias.some(d => d.data === data);
}

/** Valida sem converter campos vazios em zero. O servidor continua a validar o dia e a unicidade. */
export function validarFormularioCore(valor: unknown): FormularioCore {
  if (!valor || typeof valor !== "object") throw new Error("Registo inválido.");
  const v = valor as Record<string, unknown>;
  if (!v.tarefas || typeof v.tarefas !== "object" || Array.isArray(v.tarefas) || !v.metricas || typeof v.metricas !== "object" || Array.isArray(v.metricas)) throw new Error("Registo inválido.");
  const numero = (n: unknown, max: number, inteiro: boolean): number | null => {
    if (n === null || n === undefined) return null;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > max || (inteiro && !Number.isInteger(n))) throw new Error("Indica quantidades válidas e positivas.");
    if (!inteiro && Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw new Error("Os valores em euros admitem duas casas decimais.");
    return n;
  };
  const tarefas: Record<string, MarcaCore> = {};
  for (const [id, marca] of Object.entries(v.tarefas)) {
    if (!TAREFAS_CORE.some(t => t.id === id) || !marca || typeof marca !== "object") throw new Error("Tarefa inválida.");
    const m = marca as Record<string, unknown>;
    if (!["", "done", "no", "na"].includes(String(m.estado))) throw new Error("Estado da tarefa inválido.");
    const quantidade = numero(m.quantidade, 9999, true);
    if ((m.estado === "no" || m.estado === "na") && quantidade !== null && quantidade > 0) throw new Error("Uma tarefa não realizada ou não aplicável não pode ter quantidade positiva.");
    tarefas[id] = {estado: m.estado as EstadoTarefa, quantidade};
  }
  const metricas = Object.fromEntries(CAMPOS_CORE.map(([id]) => [id, numero((v.metricas as Record<string, unknown>)[id], ["quotes", "sales"].includes(id) ? 100000000 : 100000, !["quotes", "sales"].includes(id))]));
  if (typeof v.aprendizagem !== "string" || typeof v.proximoPasso !== "string" || v.aprendizagem.length > 1500 || v.proximoPasso.length > 1500) throw new Error("As notas admitem até 1.500 caracteres.");
  const diaPromocoes = numero(v.diaPromocoes, 6, true);
  return {tarefas, metricas, aprendizagem: v.aprendizagem.trim(), proximoPasso: v.proximoPasso.trim(), diaPromocoes};
}

/** Campos correspondentes; o consultor confirma o total, pois as tarefas podem sobrepor-se. */
const CORRESPONDENCIAS: Record<string, string[]> = {
  minutes: ["core_time"], contacts: ["core_talk", "team_new", "team_reconnect", "travel_service", "travel_old"],
  followups: ["core_follow", "team_follow", "travel_quote"], invites: ["team_invite"], requests: ["travel_active"],
};
export function metricasDasTarefas(tarefas: Record<string, MarcaCore>): Record<string, number | null> {
  return Object.fromEntries(Object.entries(CORRESPONDENCIAS).map(([campo, ids]) => {
    const valores = ids.map(id => tarefas[id]).filter((m): m is MarcaCore => !!m && m.estado === "done" && m.quantidade !== null);
    return [campo, valores.length ? valores.reduce((n, m) => n + m.quantidade!, 0) : null];
  }));
}

/** Dias sem registo e tarefas por registar ficam fora da avaliação; nunca são classificados como falhas. */
export function resumirCore(dias: DiaCore[], inicio: string, fim: string) {
  const periodo = dias.filter(d => !d.teste && d.data >= inicio && d.data <= fim);
  const totais = Object.fromEntries(CAMPOS_CORE.map(([id]) => {
    const valores = periodo.map(d => d.metricas[id]).filter((v): v is number => v !== null && v !== undefined);
    return [id, valores.length ? valores.reduce((s, n) => s + n, 0) : null];
  }));
  const categorias = GRUPOS_CORE.map(g => {
    const marcas = periodo.flatMap(d => Object.entries(d.tarefas).filter(([id]) => id.startsWith(g.id + "_")).map(([, m]) => m));
    const feitas = marcas.filter(m => m.estado === "done").length;
    const naoFeitas = marcas.filter(m => m.estado === "no").length;
    return {grupo: g.titulo, feitas, naoFeitas, avaliadas: feitas + naoFeitas, naoAplicaveis: marcas.filter(m => m.estado === "na").length, semInformacao: marcas.filter(m => m.estado === "").length};
  });
  const feitas = categorias.reduce((s, g) => s + g.feitas, 0), avaliadas = categorias.reduce((s, g) => s + g.avaliadas, 0);
  return {diasRegistados: periodo.length, diasSemInformacao: diasEntre(inicio, fim).filter(d => d >= INICIO_CORE && d <= FIM_CORE && !periodo.some(p => p.data === d)), totais, categorias, feitas, avaliadas, percentagem: avaliadas ? Math.round(feitas / avaliadas * 1000) / 10 : null};
}

export type EntradaTopCore = {email: string; nome: string; dias: DiaCore[]};
export function classificarCore(consultores: EntradaTopCore[], inicio: string, fim: string) {
  return consultores.map(c => ({email: c.email, nome: c.nome, ...resumirCore(c.dias, inicio, fim)})).filter(c => c.diasRegistados && c.avaliadas)
    .sort((a, b) => (b.percentagem ?? 0) - (a.percentagem ?? 0) || b.diasRegistados - a.diasRegistados || b.feitas - a.feitas || (b.totais.minutes ?? 0) - (a.totais.minutes ?? 0) || a.nome.localeCompare(b.nome, "pt"))
    .slice(0, 10);
}
