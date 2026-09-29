// Congressos da equipa vs. faturacao e construcao de equipa. Numeros AGREGADOS
// (sem nomes nem dados de ninguem): so contagens e medias por escalao. Extraido do
// MyOffice a 29/09/2026 e cruzado com a exportacao da equipa. Presenca = inscrito.
// So congressos grandes: Janeiro, Convencao, Be a Pro, Be a Leader e Bootcamp.
// A tabela pessoa-a-pessoa nao vive aqui: le-se da base de dados em tempo real.

export interface CongressoContagem { cat: string; data: string; inscritos: number; }
export interface EscalaoEventos { escalao: string; pessoas: number; faturacaoMedia: number; diretosMedia: number; }

export const ATUALIZADO_EM = "29 de setembro de 2026";
export const TOTAL_PESSOAS = 51;
export const CORRELACAO_FATURACAO = 0.66;
export const CORRELACAO_DIRETOS = 0.64;

export const CONGRESSOS: CongressoContagem[] = [
  { cat: "Be a Leader", data: "Out 2023", inscritos: 3 },
  { cat: "Congresso Janeiro", data: "Jan 2024", inscritos: 14 },
  { cat: "Convenção", data: "Fev 2024", inscritos: 15 },
  { cat: "Be a Pro", data: "Abr 2024", inscritos: 17 },
  { cat: "Be a Leader", data: "Out 2024", inscritos: 9 },
  { cat: "Be Unbreakable", data: "Jan 2025", inscritos: 19 },
  { cat: "Convenção Nacional", data: "Fev 2025", inscritos: 17 },
  { cat: "Be a Pro", data: "Abr 2025", inscritos: 22 },
  { cat: "Be a Leader", data: "Out 2025", inscritos: 12 },
  { cat: "Be a Rock", data: "Jan 2026", inscritos: 13 },
  { cat: "Congresso Janeiro", data: "Jan 2026", inscritos: 11 },
  { cat: "Bootcamp", data: "Jan 2026", inscritos: 1 },
  { cat: "Convenção Anual", data: "Fev 2026", inscritos: 6 },
  { cat: "Be a Pro Madrid", data: "Mai 2026", inscritos: 9 },
];

export const ESCALOES: EscalaoEventos[] = [
  { escalao: "1 congresso", pessoas: 24, faturacaoMedia: 52295, diretosMedia: 2.5 },
  { escalao: "2 a 3", pessoas: 16, faturacaoMedia: 104798, diretosMedia: 3.6 },
  { escalao: "4 a 6", pessoas: 5, faturacaoMedia: 154228, diretosMedia: 11.4 },
  { escalao: "7 ou mais", pessoas: 6, faturacaoMedia: 288934, diretosMedia: 18.3 },
];
