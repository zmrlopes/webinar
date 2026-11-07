import type { InscritoFaturacao } from "./teambuilding";
import { trofeusFaturacaoEmFalta } from "./trofeus-lista";

export function listasTrofeusFaturacao(inscritos: InscritoFaturacao[]) {
  const unicos = new Map<string, InscritoFaturacao>();
  for (const i of inscritos) {
    const email = i.email.trim().toLowerCase();
    const conta = email === "patricia.alxandra.mendonca@gmail.com" ? "wanderlustbypatricia@gmail.com" : email;
    const anterior = unicos.get(conta);
    if (!anterior || (anterior.trofeusJaTenho === null && i.trofeusJaTenho !== null)) unicos.set(conta, i);
  }
  const pessoas = [...unicos.values()].sort((a,b) => a.nome.localeCompare(b.nome, "pt-PT"));
  return ([{chave: "faturacao-100k", titulo: "100K", limiar: 100000}, {chave: "faturacao-250k", titulo: "250K", limiar: 250000}] as const).map(g => ({
    ...g,
    entregar: pessoas.filter(i => trofeusFaturacaoEmFalta(i.vendas, i.trofeusJaTenho)?.includes(g.chave)),
    confirmar: pessoas.filter(i => i.vendas !== null && i.vendas >= g.limiar && i.trofeusJaTenho === null),
  }));
}
