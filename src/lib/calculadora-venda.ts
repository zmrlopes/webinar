/** Aceita decimais com vírgula ou ponto, sem converter campos vazios em zero. */
export function lerNumeroCalculadora(texto: string): number | null {
  const limpo = texto.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(limpo)) return null;
  const numero = Number(limpo.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export function calcularVenda(faturacao: number, margem: number, percentagem: number) {
  if (![faturacao, margem, percentagem].every(Number.isFinite)
    || faturacao < 0 || margem < 0 || margem > 100 || percentagem < 0 || percentagem > 100) return null;

  const lucro = faturacao * (margem / 100);
  const comissao = lucro * (percentagem / 100);
  // Regra confirmada: 1.000 € a 12% = 0,6 pontos, proporcionais à margem.
  // A percentagem de comissão escolhida não altera os pontos.
  const pontos = lucro / 200;
  return { comissao, pontos };
}
