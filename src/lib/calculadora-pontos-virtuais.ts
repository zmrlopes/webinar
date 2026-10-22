/** Regra da referência https://v2teste.my.canva.site/pontos-virtuais. */
export const EUROS_POR_PONTO_VIRTUAL = 1540;

export function calcularPontosVirtuais(faturacao: number, patamar: number) {
  if (![faturacao, patamar].every(Number.isFinite) || faturacao < 0 || patamar < 0) return null;
  const pontosEstimados = Math.round(faturacao / EUROS_POR_PONTO_VIRTUAL);
  const pontosFalta = Math.max(0, patamar - pontosEstimados);
  const faturacaoNecessaria = pontosFalta * EUROS_POR_PONTO_VIRTUAL;
  if (![pontosEstimados, pontosFalta, faturacaoNecessaria].every(Number.isFinite)) return null;
  return { pontosEstimados, pontosFalta, faturacaoNecessaria };
}

export function calcularMetaMensalVirtual(faturacaoNecessaria: number, meses: number) {
  if (!Number.isFinite(faturacaoNecessaria) || faturacaoNecessaria < 0
    || !Number.isSafeInteger(meses) || meses < 1) return null;
  return Math.round(faturacaoNecessaria / meses);
}
