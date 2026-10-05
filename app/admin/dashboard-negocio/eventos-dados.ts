// Congressos da equipa vs. faturacao e construcao de equipa. Numeros AGREGADOS
// (sem nomes nem dados de ninguem): so contagens e medias por escalao. Extraido do
// MyOffice a 05/10/2026 (varrimento dos eventos B/C/D por ID) e cruzado com a equipa
// atual. Presenca = inscrito; contam so consultores com subscricao ativa.
// So congressos grandes: Janeiro, Convencao, Be a Pro, Be a Leader, Bootcamp e o
// congresso de Madrid de outubro de 2026.
// A tabela pessoa-a-pessoa nao vive aqui: le-se da base de dados em tempo real.

export interface CongressoContagem { cat: string; data: string; inscritos: number; }
export interface EscalaoEventos { escalao: string; pessoas: number; faturacaoMedia: number; diretosMedia: number; }

export const ATUALIZADO_EM = "5 de outubro de 2026";
export const TOTAL_PESSOAS = 58;
export const CORRELACAO_FATURACAO = 0.55;
export const CORRELACAO_DIRETOS = 0.52;

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
  { cat: "Congresso Madrid", data: "Out 2026", inscritos: 15 },
];

export const ESCALOES: EscalaoEventos[] = [
  { escalao: "1 congresso", pessoas: 32, faturacaoMedia: 58269, diretosMedia: 2.6 },
  { escalao: "2 a 3", pessoas: 14, faturacaoMedia: 116764, diretosMedia: 3.4 },
  { escalao: "4 a 6", pessoas: 7, faturacaoMedia: 119655, diretosMedia: 9 },
  { escalao: "7 ou mais", pessoas: 5, faturacaoMedia: 307427, diretosMedia: 15.2 },
];
