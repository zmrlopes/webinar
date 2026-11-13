/**
 * Líderes com variante própria do desafio BLACKFRIDAY: meta de faturação
 * calculada só sobre a própria equipa (upline_email descendente), em vez da
 * meta geral da empresa toda. Acrescentar uma entrada chega para dar a outro
 * líder a mesma experiência. Sem acesso à base de dados — pode ser importado
 * em componentes de cliente (ver lideres-equipa-servidor.ts para o resto).
 */
export const LIDERES_EQUIPA_BF: Record<string, { nome: string; metaBingo: number }> = {
  "apensarnaproxima@gmail.com": { nome: "Ana Custódia", metaBingo: 1_500_000 },
};

export function podeVerAreaEquipa(email: string): boolean {
  return Object.hasOwn(LIDERES_EQUIPA_BF, email.trim().toLowerCase());
}
