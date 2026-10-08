export type CategoriaAcontecimento = "webinar" | "welcome" | "formacao" | "icligo" | "evento";

export interface AcontecimentoCalendario {
  id: string;
  titulo: string;
  categoria: CategoriaAcontecimento;
  comecaEm: string;
  terminaEm: string | null;
  diaInteiro: boolean;
  local: string | null;
  url: string | null;
  webinarId?: string;
  inscrito?: boolean;
  inscricoesAbertas?: boolean;
}

export const NOMES_CATEGORIAS: Record<CategoriaAcontecimento, string> = {
  webinar: "Webinars", welcome: "Welcome Aboard", formacao: "Formações internas",
  icligo: "Formações iCliGo", evento: "Eventos da equipa",
};

export function diaEmPortugal(data = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(data);
  return ["year", "month", "day"].map(tipo => partes.find(p => p.type === tipo)?.value).join("-");
}

export function mudarMes(mes: string, diferenca: number): string {
  const [ano, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano!, numero! - 1 + diferenca, 1)).toISOString().slice(0, 7);
}

export function diasDoMes(mes: string): string[] {
  const inicio = new Date(`${mes}-01T12:00:00Z`);
  // A grelha começa à segunda-feira e inclui as semanas completas do mês.
  const ultimo = new Date(`${mudarMes(mes, 1)}-01T12:00:00Z`);
  ultimo.setUTCDate(0);
  const deslocamento = (inicio.getUTCDay() + 6) % 7;
  const total = Math.ceil((deslocamento + ultimo.getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const dia = new Date(inicio);
    dia.setUTCDate(i + 1 - deslocamento);
    return dia.toISOString().slice(0, 10);
  });
}

export function diaDoAcontecimento(acontecimento: AcontecimentoCalendario): string {
  return acontecimento.diaInteiro ? acontecimento.comecaEm.slice(0, 10) : diaEmPortugal(new Date(acontecimento.comecaEm));
}
