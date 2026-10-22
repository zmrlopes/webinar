import { unstable_cache } from "next/cache";
import { dataLisboa } from "./data-lisboa";
import { carregarNoticiaTurismo, type DestaqueTurismo } from "./noticia-turismo";

// Este projeto não usa Cache Components. A chave por dia mantém o destaque estável
// entre pedidos e instâncias. Erros não ficam guardados como notícia do dia.
const destaqueDiario = unstable_cache(async (dia: string): Promise<DestaqueTurismo> => {
  return { dia, noticia: await carregarNoticiaTurismo() };
}, ["noticia-turismo-diaria-v2-imagens"], { revalidate: 172800 });

export function obterNoticiaTurismo() {
  return destaqueDiario(dataLisboa());
}
