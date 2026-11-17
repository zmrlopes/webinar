export const CRUZEIRO_TROPA_ELITE = {
  titulo: "Cruzeiro Tropa de Elite",
  inicio: "2027-04-22",
  fim: "2027-04-29",
  dataTexto: "22 a 29 de abril de 2027",
  descricao: "O cruzeiro da Tropa de Elite passa por Barcelona antes de embarcar. Vota na tua preferência para nos ajudar a organizar o encontro.",
} as const;

export const OPCOES_CRUZEIRO_TROPA_ELITE = ["CRUZEIRO_BARCELONA", "SO_CRUZEIRO", "SO_BARCELONA"] as const;
export type OpcaoCruzeiroTropaElite = typeof OPCOES_CRUZEIRO_TROPA_ELITE[number];
export function ehOpcaoCruzeiroTropaElite(valor: unknown): valor is OpcaoCruzeiroTropaElite {
  return OPCOES_CRUZEIRO_TROPA_ELITE.includes(valor as OpcaoCruzeiroTropaElite);
}

export const ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE: Record<OpcaoCruzeiroTropaElite, string> = {
  CRUZEIRO_BARCELONA: "Quero ir no cruzeiro + Barcelona",
  SO_CRUZEIRO: "Quero ir só no cruzeiro",
  SO_BARCELONA: "Quero ir só a Barcelona",
};

/** Só estas duas opções envolvem embarque no cruzeiro — só aí pergunta por acompanhantes. */
export function opcaoIncluiCruzeiro(opcao: OpcaoCruzeiroTropaElite): boolean {
  return opcao === "CRUZEIRO_BARCELONA" || opcao === "SO_CRUZEIRO";
}

export const MAXIMO_ACOMPANHANTES_CRUZEIRO = 10;

export interface VotoCruzeiroTropaElite {
  email: string;
  nome: string;
  opcao: OpcaoCruzeiroTropaElite;
  acompanhantes: number;
  atualizadoEm: string;
}

export function resumirVotosCruzeiroTropaElite(votos: VotoCruzeiroTropaElite[]) {
  const porOpcao = Object.fromEntries(
    OPCOES_CRUZEIRO_TROPA_ELITE.map(opcao => [opcao, votos.filter(v => v.opcao === opcao)]),
  ) as Record<OpcaoCruzeiroTropaElite, VotoCruzeiroTropaElite[]>;
  const totalAcompanhantes = votos.reduce((soma, v) => soma + (opcaoIncluiCruzeiro(v.opcao) ? v.acompanhantes : 0), 0);
  return { total: votos.length, totalAcompanhantes, ...porOpcao };
}
