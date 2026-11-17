/** Plano de Vendas e Incentivos iCliGo, tabela da página 14, revisto em 17/11/2026. */
export const ESCADA_PATAMARES: { nome: string; pontos: number }[] = [
  { nome: "Júnior", pontos: 0 },
  { nome: "Sénior", pontos: 15 },
  { nome: "Master", pontos: 75 },
  { nome: "Coordenador", pontos: 250 },
  { nome: "Diretor", pontos: 1000 },
  { nome: "Bronze", pontos: 3500 },
  { nome: "Prata", pontos: 12500 },
  { nome: "Ouro", pontos: 50000 },
  { nome: "Platina", pontos: 225000 },
  { nome: "Safira", pontos: 1125000 },
  { nome: "Esmeralda", pontos: 6500000 },
];

export const CRITERIOS_LINHAS: Record<string, {patamar: string; quantidade: number}[]> = {
  Diretor: [{patamar: "Master", quantidade: 3}],
  Bronze: [{patamar: "Coordenador", quantidade: 3}, {patamar: "Master", quantidade: 2}],
  Prata: [{patamar: "Diretor", quantidade: 2}, {patamar: "Coordenador", quantidade: 3}],
  Ouro: [{patamar: "Diretor", quantidade: 3}, {patamar: "Coordenador", quantidade: 2}],
  Platina: [{patamar: "Bronze", quantidade: 5}, {patamar: "Diretor", quantidade: 5}, {patamar: "Coordenador", quantidade: 5}],
  Safira: [{patamar: "Prata", quantidade: 7}, {patamar: "Bronze", quantidade: 7}, {patamar: "Diretor", quantidade: 6}],
  Esmeralda: [{patamar: "Ouro", quantidade: 8}, {patamar: "Prata", quantidade: 7}, {patamar: "Bronze", quantidade: 10}],
};
export const FONTE_CRITERIOS_PATAMARES = "https://s3.eu-central-2.wasabisys.com/icligo-legal/compensation_plan_pt.pdf#page=14";

export function indicePatamar(nivel: string | null | undefined): number {
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const aliases: Record<string, string> = {COORDINATOR: "COORDENADOR", DIRECTOR: "DIRETOR", SILVER: "PRATA", GOLD: "OURO", PLATINUM: "PLATINA", SAFIRE: "SAFIRA", EMERALD: "ESMERALDA"};
  const chave = typeof nivel === "string" ? normalizar(nivel) : "";
  return ESCADA_PATAMARES.findIndex(p => normalizar(p.nome) === (aliases[chave] ?? chave));
}

export function nomePatamarQuantidade(patamar: string, quantidade: number): string {
  return quantidade === 1 ? patamar : ({Master: "Masters", Coordenador: "Coordenadores", Diretor: "Diretores", Bronze: "TPs Bronze", Prata: "TPs Prata", Ouro: "TPs Ouro"} as Record<string, string>)[patamar] ?? patamar;
}
