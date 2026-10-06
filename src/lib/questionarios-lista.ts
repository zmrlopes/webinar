/**
 * Os questionários e as suas perguntas, sem nada que toque na base de dados —
 * o formulário do consultor é um componente de cliente e importar daqui evita
 * arrastar o cliente de Postgres para o browser. A lógica vive em
 * src/lib/questionarios.ts. Para lançar um questionário novo: acrescentá-lo
 * aqui e criar a linha em questionarios_estado (numa migração).
 */
export type Pergunta =
  | { id: string; tipo: "texto"; texto: string }
  | { id: string; tipo: "escala"; texto: string; min: number; max: number }
  | { id: string; tipo: "escolha"; texto: string; opcoes: string[] };

export interface Questionario {
  slug: string;
  titulo: string;
  /** Texto curto do cartão nos avisos do consultor. */
  chamada: string;
  intro: string;
  perguntas: Pergunta[];
}

export const QUESTIONARIOS: Questionario[] = [
  {
    slug: "equipa-outubro-2026",
    titulo: "Como estás? — questionário à equipa",
    chamada: "9 perguntas sobre como te sentes, o que te trava e o que precisas de mim. É anónimo.",
    intro:
      "Este questionário é anónimo: o Zé vê as respostas, mas não sabe quem respondeu. Sê sincero — é a única forma de isto servir para alguma coisa.",
    perguntas: [
      {
        id: "estado",
        tipo: "texto",
        texto:
          "Para começarmos: como tens estado? O que é que te traz entusiasmo hoje e o que é que, por vezes, te tira o ânimo?",
      },
      { id: "motivacao", tipo: "escala", texto: "De 1 a 10, como classificas o teu nível de motivação atual?", min: 1, max: 10 },
      { id: "bloqueio", tipo: "texto", texto: "Qual o bloqueio que sentes que mais te trava neste momento?" },
      { id: "precisas", tipo: "texto", texto: "O que precisas de mim neste momento que sentes que não estás a receber?" },
      {
        id: "comunicacao",
        tipo: "escolha",
        texto: "Sobre a minha comunicação, como a descreverias?",
        opcoes: ["Clara e na medida certa", "Demasiada informação", "Sinto que falta informação", "Às vezes confusa"],
      },
      {
        id: "um-ano",
        tipo: "texto",
        texto:
          "O que gostarias de ter alcançado daqui a um ano? O que é que, na tua visão, está hoje entre ti e esse objetivo?",
      },
      {
        id: "mudar",
        tipo: "texto",
        texto:
          "Se pudesses mudar uma coisa na nossa equipa ou num processo, o que mudarias? Sê livre para partilhar aquela ideia que nunca tiveste oportunidade de dizer.",
      },
      { id: "critica", tipo: "texto", texto: "Que crítica construtiva me darias enquanto líder?" },
      { id: "por-dizer", tipo: "texto", texto: "Há alguma coisa que tenhas vontade de me dizer, mas que nunca tenhas dito?" },
    ],
  },
];

export function buscarQuestionario(slug: string): Questionario | null {
  return QUESTIONARIOS.find((q) => q.slug === slug) ?? null;
}

/**
 * Valida as respostas que chegam do browser contra as perguntas: todas são
 * obrigatórias. Devolve as respostas limpas ou a mensagem de erro.
 */
export function validarRespostas(
  q: Questionario,
  bruto: unknown,
): { ok: true; respostas: Record<string, string | number> } | { ok: false; erro: string } {
  if (!bruto || typeof bruto !== "object") return { ok: false, erro: "respostas em falta" };
  const entrada = bruto as Record<string, unknown>;
  const respostas: Record<string, string | number> = {};
  for (const [i, p] of q.perguntas.entries()) {
    const v = entrada[p.id];
    if (p.tipo === "escala") {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < p.min || n > p.max) return { ok: false, erro: `falta responder à pergunta ${i + 1}` };
      respostas[p.id] = n;
    } else if (p.tipo === "escolha") {
      if (typeof v !== "string" || !p.opcoes.includes(v)) return { ok: false, erro: `falta responder à pergunta ${i + 1}` };
      respostas[p.id] = v;
    } else {
      const t = typeof v === "string" ? v.trim() : "";
      if (!t) return { ok: false, erro: `falta responder à pergunta ${i + 1}` };
      respostas[p.id] = t.slice(0, 5000);
    }
  }
  return { ok: true, respostas };
}
