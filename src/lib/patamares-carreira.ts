/** Escada de pontos já usada no dashboard de negócio da equipa. */
export const ESCADA_PATAMARES: { nome: string; pontos: number }[] = [
  { nome: "Júnior", pontos: 0 },
  { nome: "Sénior", pontos: 15 },
  { nome: "Master", pontos: 75 },
  { nome: "Coordenador", pontos: 250 },
  { nome: "Diretor", pontos: 1000 },
  { nome: "Bronze", pontos: 3500 },
  { nome: "Prata", pontos: 10000 },
  { nome: "Ouro", pontos: 30000 },
];

export const CRITERIOS_LINHAS: Record<string, {patamar: string; quantidade: number}[]> = {
  Diretor: [{patamar: "Master", quantidade: 3}],
  Bronze: [{patamar: "Coordenador", quantidade: 3}, {patamar: "Master", quantidade: 2}],
  Ouro: [{patamar: "Diretor", quantidade: 3}, {patamar: "Coordenador", quantidade: 2}],
};
export const FONTE_CRITERIOS_PATAMARES = "https://backoffice.icligo.com/novoPlano/index.html?page=15";

export function indicePatamar(nivel: string | null | undefined): number {
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return typeof nivel === "string" ? ESCADA_PATAMARES.findIndex(p => normalizar(p.nome) === normalizar(nivel)) : -1;
}

export function nomePatamarQuantidade(patamar: string, quantidade: number): string {
  return quantidade === 1 ? patamar : ({Master: "Masters", Coordenador: "Coordenadores", Diretor: "Diretores"} as Record<string, string>)[patamar] ?? patamar;
}
