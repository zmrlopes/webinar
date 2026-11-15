import type { CatalogoOperadores } from "./operadores-destinos";

/**
 * Corrige a transcrição da recolha publicada de 12/11/2026: a FAQ da Icárion
 * identifica estes cinco destinos, que ficaram apenas no resumo. Esta correção
 * é limitada à versão de fonte efetivamente revista; novas publicações são
 * soberanas. Não altera os registos originais nem o histórico no servidor.
 */
export function corrigirCorrespondenciasPublicadas(catalogo: CatalogoOperadores, recolha: unknown): CatalogoOperadores {
  if (recolha !== "aa067bfa-132f-4029-9003-48163b87dd8e") return catalogo;
  return {
    ...catalogo,
    revistoEm: "15/11/2026",
    operadores: catalogo.operadores.map(o => o.id === "icarion" && !o.linhas.length ? {
      ...o,
      linhas: ["maldivas", "vietname", "japao", "costa-rica", "safari"].filter(id => catalogo.destinos.some(d => d.id === id)).map(destino => ({
        destino, bloco: "Destinos identificados na FAQ", detalhe: "Destino indicado na FAQ da Icárion. Reserva pelo formulário manual.",
        ...(destino === "safari" ? { termosPesquisa: ["safari", "safaris"] } : {}),
      })),
    } : o),
  };
}
