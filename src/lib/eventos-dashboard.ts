/** Os dados pessoais são carregados de dashboard_config, nunca do repositório. */
export interface InscritoEvento { id: string; nome: string; email: string; checkin: boolean }
export interface EventoDashboard {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  local: string;
  tipo: "Congresso" | "Convenção" | "Bootcamp" | "Seminário" | "Take Off" | "Complemento" | "Outro";
  /** null significa lista indisponível, não zero inscritos. */
  pessoas: InscritoEvento[] | null;
  clientes: number;
  reservas: number;
  evidenciaPessoal: string | null;
  nota?: string;
}
export interface DadosEventos { atualizadoEm: string; eventos: EventoDashboard[]; contasProprias: string[] }
export interface MembroEventos {
  nome?: string;
  email: string; upline_email: string | null; vendas: string | number | null;
  estado: string; data_registo: string | Date | null;
}
const normalizar = (v: string) => v.trim().toLowerCase();
export const eventoPrincipal = (e: EventoDashboard) => e.tipo === "Congresso" || e.tipo === "Convenção";

/** A mesma seleção e deduplicação em todas as vistas do separador. */
export function eventosAnalisados(dados: DadosEventos, agora = new Date()): EventoDashboard[] {
  const proprias = new Set(dados.contasProprias.map(normalizar));
  return dados.eventos
    .filter(e => eventoPrincipal(e) && e.inicio.slice(0, 10) <= agora.toISOString().slice(0, 10) && e.pessoas !== null)
    .map(e => {
      const pessoas = new Map<string, InscritoEvento>();
      for (const p of e.pessoas ?? []) {
        const chave = normalizar(p.email || p.id);
        if (proprias.has(chave)) continue;
        const anterior = pessoas.get(chave);
        pessoas.set(chave, { ...p, checkin: p.checkin || anterior?.checkin || false });
      }
      return { ...e, pessoas: [...pessoas.values()] };
    });
}

export interface ResultadoConsultor {
  email: string;
  nome: string;
  eventos: number;
  faturacao: number;
  diretos: number;
}
export interface ComparacaoEventos {
  escalao: string;
  pessoas: number;
  faturacaoMedia: number;
  diretosMedia: number;
}

/** Razão entre médias; uma base zero ou um grupo vazio não permite calcular "vezes". */
export function multiplicadorEventos(base: ComparacaoEventos, grupo: ComparacaoEventos, metrica: "faturacaoMedia" | "diretosMedia"): number | null {
  const denominador = base[metrica];
  const numerador = grupo[metrica];
  if (!base.pessoas || !grupo.pessoas || !Number.isFinite(denominador) || !Number.isFinite(numerador) || denominador <= 0 || numerador < 0) return null;
  const razao = numerador / denominador;
  return Number.isFinite(razao) ? razao : null;
}

function comparar(escalao: string, pessoas: ResultadoConsultor[]): ComparacaoEventos {
  return {
    escalao,
    pessoas: pessoas.length,
    faturacaoMedia: pessoas.length ? pessoas.reduce((s, p) => s + p.faturacao, 0) / pessoas.length : 0,
    diretosMedia: pessoas.length ? pessoas.reduce((s, p) => s + p.diretos, 0) / pessoas.length : 0,
  };
}

export function resumirEventos(dados: DadosEventos, equipa: MembroEventos[], agora = new Date()) {
  const proprias = new Set(dados.contasProprias.map(normalizar));
  const eventos = eventosAnalisados(dados, agora);
  const porPessoa = new Map<string, Set<string>>();
  for (const e of eventos) for (const p of e.pessoas ?? []) {
    const chave = normalizar(p.email || p.id);
    if (proprias.has(chave)) continue;
    if (!porPessoa.has(chave)) porPessoa.set(chave, new Set());
    porPessoa.get(chave)!.add(e.id);
  }
  const limite = new Date(agora);
  limite.setUTCFullYear(limite.getUTCFullYear() - 1);
  const todos = equipa.filter(p => !proprias.has(normalizar(p.email)));
  const comparaveis = todos.filter(p => p.estado === "ACTIVE" && p.data_registo && new Date(p.data_registo) <= limite);
  const diretos = new Map<string, number>();
  for (const p of todos) if (p.upline_email) {
    const email = normalizar(p.upline_email);
    diretos.set(email, (diretos.get(email) ?? 0) + 1);
  }
  const nomes = new Map(eventos.flatMap(e => (e.pessoas ?? []).map(p => [normalizar(p.email || p.id), p.nome] as const)));
  const consultores: ResultadoConsultor[] = comparaveis.map(p => {
    const email = normalizar(p.email);
    return { email, nome: p.nome || nomes.get(email) || email, eventos: porPessoa.get(email)?.size ?? 0,
      faturacao: Number(p.vendas) || 0, diretos: diretos.get(email) ?? 0 };
  });
  const grupos = [
    comparar("Sem inscrição localizada", consultores.filter(p => p.eventos === 0)),
    comparar("Com inscrição localizada", consultores.filter(p => p.eventos > 0)),
  ];
  const linhas = [
    grupos[0]!,
    comparar("1 evento", consultores.filter(p => p.eventos === 1)),
    comparar("2 a 3 eventos", consultores.filter(p => p.eventos >= 2 && p.eventos <= 3)),
    comparar("4 a 6 eventos", consultores.filter(p => p.eventos >= 4 && p.eventos <= 6)),
    comparar("7 ou mais eventos", consultores.filter(p => p.eventos >= 7)),
  ];
  return { eventos, pessoas: porPessoa.size, inscricoes: [...porPessoa.values()].reduce((s, v) => s + v.size, 0), linhas, grupos, consultores, comparaveis: comparaveis.length };
}
export function dataEvento(e: Pick<EventoDashboard, "inicio" | "fim">): string {
  const formatar = (s: string) => new Date(s.slice(0, 10) + "T12:00:00Z").toLocaleDateString("pt-PT", { timeZone: "UTC" });
  return e.inicio.slice(0, 10) === e.fim.slice(0, 10) ? formatar(e.inicio) : `${formatar(e.inicio)} – ${formatar(e.fim)}`;
}
