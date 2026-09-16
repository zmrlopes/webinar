const formatadorSemAgrupamento = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/**
 * Formato de tabela/PDF: "72,65 €" ou "2 310,12 €" (espaço de milhares normal).
 *
 * Não usa `Intl.NumberFormat('pt-PT', { style: 'currency' })` para o agrupamento:
 * o CLDR do pt-PT só agrupa a partir de 5 dígitos (minimumGroupingDigits: 2),
 * por isso "2310,12" saía sem separador — o agrupamento é feito à mão para
 * agrupar sempre de 3 em 3 dígitos, como no mapa de referência.
 */
export function formatarMoedaTabela(valor: number): string {
  const arredondado = valor.toFixed(2);
  const [parteInteira, decimais] = arredondado.split(".") as [string, string];
  const negativo = parteInteira.startsWith("-");
  const digitos = negativo ? parteInteira.slice(1) : parteInteira;
  const comSeparadores = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negativo ? "-" : ""}${comSeparadores},${decimais} €`;
}

/** Formato do texto do recibo: "2310,12€" (sem separador de milhares, sem espaço antes do €). */
export function formatarMoedaTexto(valor: number): string {
  return `${formatadorSemAgrupamento.format(valor)}€`;
}
