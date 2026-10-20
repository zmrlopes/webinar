import calendario from "./calendario-criativo.json";

/**
 * Calendário criativo da Black Friday (PDF da Sara em
 * docs/calendario_criativo_160_conteudos_tropa_de_elite.pdf): um tema por
 * dia, de 22/10 a 30/11, com quatro ideias — Reel, Carrossel, Fotografia e
 * Post estático. Os textos estão tal e qual o PDF.
 */
export type FormatoConteudo = "reel" | "carrossel" | "fotografia" | "post";
export type FaseCalendario = "inspirar" | "aquecer" | "black-friday";

export interface IdeiaConteudo {
  formato: FormatoConteudo;
  objetivo: string;
  campos: { rotulo: string; texto: string }[];
}

export interface DiaCalendarioCriativo {
  data: string;
  tema: string;
  fase: FaseCalendario;
  ideias: IdeiaConteudo[];
}

export const DIAS_CALENDARIO_CRIATIVO = calendario as DiaCalendarioCriativo[];

export const FORMATOS_CONTEUDO: FormatoConteudo[] = ["reel", "carrossel", "fotografia", "post"];

export const NOMES_FORMATOS: Record<FormatoConteudo, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  fotografia: "Fotografia",
  post: "Post estático",
};

export const NOMES_FASES: Record<FaseCalendario, string> = {
  inspirar: "Inspirar e crescer",
  aquecer: "Aquecer a audiência",
  "black-friday": "Black Friday: em breve",
};

export const NOTAS_CALENDARIO_CRIATIVO = {
  introducao: "Quatro formatos por dia, com abordagens diferentes e textos prontos para os visuais. A legenda fica livre para cada Travel Partner personalizar.",
  blackFriday: "Antes de 14 de novembro, podes criar expectativa com «BLACK FRIDAY — EM BREVE». A partir dessa data, mantém «EM BREVE» até existir confirmação oficial de campanhas. Não anuncies descontos, datas de arranque ou preços sem confirmação.",
  musica: "Para Reels, usa áudios disponíveis e autorizados para a tua conta comercial. Pesquisa semanalmente tendências no Instagram e adapta apenas o formato: transição antes/depois, POV, escolha A/B, lista rápida, ASMR, texto no beat, reação e green screen. Não há garantia de que um áudio esteja em tendência na data de publicação.",
};

/** Cada publicação marcada é guardada como "AAAA-MM-DD:formato". */
export function idPublicacao(data: string, formato: FormatoConteudo): string {
  return `${data}:${formato}`;
}

const PUBLICACOES_VALIDAS = new Set(DIAS_CALENDARIO_CRIATIVO.flatMap(d => FORMATOS_CONTEUDO.map(f => idPublicacao(d.data, f))));

export function publicacaoValida(id: unknown): id is string {
  return typeof id === "string" && PUBLICACOES_VALIDAS.has(id);
}

export function limparPublicados(valor: unknown): string[] {
  return Array.isArray(valor) ? [...new Set(valor.filter(publicacaoValida))].sort() : [];
}
