import catalogo from "./testemunhos.json";

export interface Testemunho {
  id: string;
  titulo: string;
  duracao: string;
  plataforma?: "youtube" | "instagram";
  url?: string;
  temas?: string[];
  resumo?: string;
  limites?: string;
}

export const testemunhos = catalogo as Testemunho[];

/** Também aceita os testemunhos antigos, guardados apenas com o ID YouTube. */
export function linkTestemunho(testemunho: Testemunho): string {
  return testemunho.url ?? `https://www.youtube.com/watch?v=${testemunho.id}`;
}
