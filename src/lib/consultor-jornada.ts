import { CRITERIOS_LINHAS, CRITERIOS_POR_CONFIRMAR, ESCADA_PATAMARES, indicePatamar } from "./patamares-carreira";

export interface CriterioJornada {
  patamar: string;
  necessarios: number;
  cumpridos: number | null;
  faltam: number | null;
}
export interface EstruturaJornada {
  estado: "por-atualizar" | "pronto";
  requisitos: CriterioJornada[];
  linhasNecessarias: number;
  linhasCumpridas: number | null;
  faltamLinhas: number | null;
  semPatamar: number;
  atualizadoEm: string | null;
}

export interface JornadaConsultor {
  estado: "progresso" | "meta-atingida" | "ultimo-patamar" | "sem-dados";
  patamarAtual: string | null;
  pontos: number | null;
  proximoPatamar: string | null;
  metaPontos: number | null;
  faltam: number | null;
  percentagem: number | null;
  atualizadoEm: string | null;
  estrutura?: EstruturaJornada;
  criteriosPorConfirmar?: boolean;
}

/** Usa o patamar confirmado; atingir pontos não confirma os restantes requisitos. */
export function calcularJornadaConsultor(nivel: string | null | undefined, valor: string | number | null | undefined, data: string | Date | null | undefined): JornadaConsultor {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  const pontos = Number.isFinite(numero) && numero >= 0 ? numero : null;
  const indice = indicePatamar(nivel);
  const atual = ESCADA_PATAMARES[indice], proximo = ESCADA_PATAMARES[indice + 1];
  const instante = data == null ? NaN : new Date(data).getTime();
  const atualizadoEm = Number.isFinite(instante) ? new Date(instante).toISOString() : null;
  const base: JornadaConsultor = {estado: "sem-dados", patamarAtual: atual?.nome ?? null, pontos,
    proximoPatamar: atual && proximo ? proximo.nome : null, metaPontos: atual && proximo ? proximo.pontos : null, faltam: null, percentagem: null, atualizadoEm};
  const regras = atual && proximo ? CRITERIOS_LINHAS[proximo.nome] : undefined;
  if (atual && proximo && CRITERIOS_POR_CONFIRMAR.includes(proximo.nome)) base.criteriosPorConfirmar = true;
  if (regras) base.estrutura = {estado: "por-atualizar", requisitos: regras.map(r => ({patamar: r.patamar, necessarios: r.quantidade, cumpridos: null, faltam: null})),
    linhasNecessarias: regras.reduce((s, r) => s + r.quantidade, 0), linhasCumpridas: null, faltamLinhas: null, semPatamar: 0, atualizadoEm: null};
  if (!atual || pontos === null) return base;
  if (!proximo) return {...base, estado: "ultimo-patamar", percentagem: 100};
  const faltam = Math.max(0, Math.round((proximo.pontos - pontos) * 100) / 100);
  return {...base, estado: pontos >= proximo.pontos ? "meta-atingida" : "progresso", proximoPatamar: proximo.nome,
    metaPontos: proximo.pontos, faltam, percentagem: Math.max(0, Math.min(100, pontos / proximo.pontos * 100))};
}
