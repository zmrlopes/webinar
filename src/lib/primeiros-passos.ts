import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";

export function chaveProgressoLocalPrimeirosPassos(email: string): string {
  return `consultor-nova-area:primeiros-passos:v2:${email.trim().toLowerCase()}`;
}

/** As chaves sem conta pertencem à antiga proposta exclusiva de demonstração. */
export function lerProgressoLocalPrimeirosPassos(email: string, armazenamento: {getItem(chave: string): string | null}): number[] {
  try {
    const guardado = armazenamento.getItem(chaveProgressoLocalPrimeirosPassos(email));
    if (guardado !== null) return limparPrimeirosPassos(JSON.parse(guardado));
    if (email.trim().toLowerCase() !== EMAIL_PAINEL_DEMONSTRACAO) return [];
    const anterior = armazenamento.getItem("consultor-nova-area:primeiros-passos:v2");
    if (anterior !== null) return limparPrimeirosPassos(JSON.parse(anterior));
    return limparPrimeirosPassos([
      ...importarOnboardingTemporario(JSON.parse(armazenamento.getItem("consultor-nova-area:onboarding-codex:v2") ?? "[]")),
      ...migrarPrimeirosPassosAnteriores(JSON.parse(armazenamento.getItem("consultor-nova-area:primeiros-passos:v1") ?? "[]")),
    ]);
  } catch { return []; }
}

/** IDs estáveis dos sete checks, distribuídos pelos cinco cartões de Começa aqui. */
export const TAREFAS_PRIMEIROS_PASSOS = [
  "acessos-equipa", "primeira-reuniao", "curso", "sessao-1", "sessao-2", "primeiras-acoes", "segunda-reuniao",
] as const;
export const TOTAL_PRIMEIROS_PASSOS = TAREFAS_PRIMEIROS_PASSOS.length;

export const RESUMO_PRIMEIROS_PASSOS = [
  { titulo: "Acessos e equipa", tarefas: [1] },
  { titulo: "Primeira reunião", tarefas: [2] },
  { titulo: "Formação de arranque", tarefas: [3, 4, 5] },
  { titulo: "Primeiras ações", tarefas: [6] },
  { titulo: "Segunda reunião", tarefas: [7] },
];

/** Recupera os checks da proposta temporária, incluindo a antiga formação agregada. */
export function importarOnboardingTemporario(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  const ids = valor.includes("formacao-inicial") ? [...valor, "curso", "sessao-1", "sessao-2"] : valor;
  return TAREFAS_PRIMEIROS_PASSOS.flatMap((id, i) => ids.includes(id) ? [i + 1] : []);
}

/** Só curso e sessões tinham o mesmo critério de conclusão na versão anterior. */
export function migrarPrimeirosPassosAnteriores(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  return [...(valor.includes(3) ? [3] : []), ...(valor.includes(4) ? [4, 5] : [])];
}

export function limparPrimeirosPassos(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= TOTAL_PRIMEIROS_PASSOS))].sort((a, b) => a - b);
}
