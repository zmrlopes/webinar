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
  email: string; upline_email: string | null; vendas: string | number | null;
  estado: string; data_registo: string | Date | null;
}
const normalizar = (v: string) => v.trim().toLowerCase();
export const eventoPrincipal = (e: EventoDashboard) => ["Congresso", "Convenção", "Bootcamp"].includes(e.tipo);

export function resumirEventos(dados: DadosEventos, equipa: MembroEventos[], agora = new Date()) {
  const proprias = new Set(dados.contasProprias.map(normalizar));
  const eventos = dados.eventos.filter(e => eventoPrincipal(e) && e.inicio.slice(0, 10) <= agora.toISOString().slice(0, 10) && e.pessoas !== null);
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
  const linhas = ["Sem inscrição localizada", "1 evento", "2 a 3 eventos", "4 a 6 eventos", "7 ou mais eventos"].map(escalao => ({ escalao, pessoas: 0, faturacaoMedia: 0, diretosMedia: 0 }));
  const diretos = new Map<string, number>();
  for (const p of todos) if (p.upline_email) {
    const email = normalizar(p.upline_email);
    diretos.set(email, (diretos.get(email) ?? 0) + 1);
  }
  for (const p of comparaveis) {
    const email = normalizar(p.email);
    const n = porPessoa.get(email)?.size ?? 0;
    const linha = linhas[n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4]!;
    linha.pessoas++;
    linha.faturacaoMedia += Number(p.vendas) || 0;
    linha.diretosMedia += diretos.get(email) ?? 0;
  }
  for (const l of linhas) if (l.pessoas) {
    l.faturacaoMedia /= l.pessoas;
    l.diretosMedia /= l.pessoas;
  }
  return { eventos, pessoas: porPessoa.size, inscricoes: [...porPessoa.values()].reduce((s, v) => s + v.size, 0), linhas, comparaveis: comparaveis.length };
}
export function dataEvento(e: Pick<EventoDashboard, "inicio" | "fim">): string {
  const formatar = (s: string) => new Date(s.slice(0, 10) + "T12:00:00Z").toLocaleDateString("pt-PT", { timeZone: "UTC" });
  return e.inicio.slice(0, 10) === e.fim.slice(0, 10) ? formatar(e.inicio) : `${formatar(e.inicio)} – ${formatar(e.fim)}`;
}
