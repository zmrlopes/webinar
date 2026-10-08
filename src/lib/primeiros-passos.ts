export const TOTAL_PRIMEIROS_PASSOS = 5;

export function limparPrimeirosPassos(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= TOTAL_PRIMEIROS_PASSOS))].sort((a, b) => a - b);
}
