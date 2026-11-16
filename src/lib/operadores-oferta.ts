import oferta from "./operadores-oferta.json";
import type { CatalogoOperadores, Destino, IdOperador, Linha } from "./operadores-destinos";

/**
 * Produtos públicos cruzados com as FAQs da recolha efetivamente revista.
 * Mantém a transcrição original e nunca reaplica autorizações a uma nova FAQ.
 * Uma linha de país não autoriza todas as cidades desse país.
 */
export function completarCatalogoComOferta(catalogo: CatalogoOperadores, recolha: unknown): CatalogoOperadores {
  if (recolha !== oferta.recolhaFAQs) return catalogo;
  const operadores = catalogo.operadores.map(o => {
    const fonte = oferta.operadores.find(f => f.id === o.id);
    if (!fonte || JSON.stringify([o.atualizado, o.permitido, o.proibido]) !==
      JSON.stringify([fonte.faq.atualizado, fonte.faq.permitido, fonte.faq.proibido])) return o;
    const existentes = new Set(o.linhas.map(l => JSON.stringify(l)));
    const adicionais = (fonte.linhas as Linha[]).filter(l => !existentes.has(JSON.stringify(l)));
    return adicionais.length ? { ...o, linhas: [...o.linhas, ...adicionais] } : o;
  });
  if (operadores.every((o, i) => o === catalogo.operadores[i])) return catalogo;
  const ids = new Set(catalogo.destinos.map(d => d.id));
  const usados = new Set(operadores.flatMap(o => o.linhas.map(l => l.destino)));
  const destinos = (oferta.destinos as Destino[]).filter(d => !ids.has(d.id) && usados.has(d.id));
  return { ...catalogo, destinos: [...catalogo.destinos, ...destinos], operadores, revistoEm: oferta.revistoEm };
}

const DOMINIOS: Partial<Record<IdOperador, string>> = {
  catai: "www.catai.pt", icarion: "www.icarion.pt", nortravel: "www.nortravel.pt",
  "viagens-tempo": "www.viagenstempo.pt", "viajar-tours": "www.viajartours.pt",
};

/** Só ligações públicas ao operador da própria linha, sem credenciais. */
export function fonteOfertaValida(id: IdOperador, valor: { url: string; consultadoEm: string }): boolean {
  try {
    const url = new URL(valor.url);
    return url.protocol === "https:" && url.hostname === DOMINIOS[id] && !url.port &&
      !url.username && !url.password && !url.hash &&
      [...url.searchParams.keys()].every(k => ["pkt_id", "webproduct", "origin"].includes(k)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(valor.consultadoEm);
  } catch { return false; }
}
