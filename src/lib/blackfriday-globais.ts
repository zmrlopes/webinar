/** Recolha pontual do Top Reservas do MyOffice, com âmbito Todos e sem filtro de país. */
export const CHAVE_METRICAS_GLOBAIS_BF = "blackfriday:2026:metricas-globais:v1";
export const INICIO_BF_EMPRESA = "2026-11-13";
export interface ResumoVendasGlobalBF {
  totalVendas: number;
  consultoresComVendas: number;
  vendasConsultoresComVendas: number;
  mediaPorConsultor: number | null;
  contasLidas: number;
  paginasLidas: number;
}
export interface MetricasGlobaisBF {
  inicio: string;
  fim: string;
  atualizadoEm: string;
  fonte: "myoffice-top-reservas";
  empresa: ResumoVendasGlobalBF;
  intravel: ResumoVendasGlobalBF | null;
  equipa?: ResumoVendasGlobalBF & {inicio: string; fim: string; atualizadoEm: string};
}

/** Percentagens só entre recolhas com o mesmo período e a mesma definição de vendas. */
export function compararEquipaEmpresaBF(dados: MetricasGlobaisBF | null | undefined) {
  const equipa = dados?.equipa;
  if (!dados || !equipa || equipa.inicio !== dados.inicio || equipa.fim !== dados.fim || equipa.atualizadoEm !== dados.atualizadoEm) return null;
  const percentagem = (valor: number | null, base: number | null) =>
    valor !== null && base !== null && Number.isFinite(valor) && Number.isFinite(base) && base > 0 ? valor / base * 100 : null;
  return {equipa, percentagemVendas: percentagem(equipa.totalVendas, dados.empresa.totalVendas),
    percentagemMedia: percentagem(equipa.mediaPorConsultor, dados.empresa.mediaPorConsultor),
    percentagemConsultores: percentagem(equipa.consultoresComVendas, dados.empresa.consultoresComVendas)};
}
export interface PaginaVendasGlobalBF {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: {userId: string; salesVolume: number; bookingsCount: number; currency: string}[];
}

/** Só calcula com a lista completa; não soma volumes de equipa nem linhas destacadas. */
export function resumirVendasGlobaisBF(paginas: PaginaVendasGlobalBF[]): ResumoVendasGlobalBF {
  function falhar(): never {throw new Error("A recolha de reservas está incompleta ou inconsistente. Os dados anteriores mantêm-se.");}
  const primeira = paginas[0];
  if (!primeira || !Number.isSafeInteger(primeira.totalElements) || primeira.totalElements < 0
    || !Number.isSafeInteger(primeira.size) || primeira.size < 1
    || primeira.totalPages !== Math.ceil(primeira.totalElements / primeira.size)
    || paginas.length !== Math.max(1, primeira.totalPages)) falhar();
  const ids = new Set<string>();
  let totalCentimos = 0, vendedoresCentimos = 0, vendedores = 0;
  for (const [indice, pagina] of paginas.entries()) {
    if (pagina.page !== indice || pagina.size !== primeira.size || pagina.totalElements !== primeira.totalElements
      || pagina.totalPages !== primeira.totalPages || !Array.isArray(pagina.items)
      || pagina.items.length !== Math.min(pagina.size, primeira.totalElements - indice * pagina.size)) falhar();
    for (const linha of pagina.items) {
      const id = typeof linha?.userId === "string" ? linha.userId.trim().toLowerCase() : "";
      if (!id || ids.has(id) || linha.currency !== "EUR" || typeof linha.salesVolume !== "number"
        || !Number.isFinite(linha.salesVolume) || !Number.isSafeInteger(linha.bookingsCount) || linha.bookingsCount < 0) falhar();
      ids.add(id);
      const centimos = Math.round(linha.salesVolume * 100);
      if (!Number.isSafeInteger(centimos) || (centimos > 0 && linha.bookingsCount === 0)) falhar();
      totalCentimos += centimos;
      if (centimos > 0 && linha.bookingsCount > 0) {vendedores++; vendedoresCentimos += centimos;}
    }
  }
  if (ids.size !== primeira.totalElements || !Number.isSafeInteger(totalCentimos) || !Number.isSafeInteger(vendedoresCentimos)) falhar();
  return {totalVendas: totalCentimos / 100, consultoresComVendas: vendedores,
    vendasConsultoresComVendas: vendedoresCentimos / 100,
    mediaPorConsultor: vendedores ? Math.round(vendedoresCentimos / vendedores) / 100 : null,
    contasLidas: ids.size, paginasLidas: paginas.length};
}
