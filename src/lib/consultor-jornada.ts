import { ESCADA_PATAMARES } from "./patamares-carreira";

export interface JornadaConsultor {
  estado: "progresso" | "meta-atingida" | "ultimo-patamar" | "sem-dados";
  patamarAtual: string | null;
  pontos: number | null;
  proximoPatamar: string | null;
  metaPontos: number | null;
  faltam: number | null;
  percentagem: number | null;
  atualizadoEm: string | null;
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

/** Usa o patamar confirmado; atingir pontos não confirma os restantes requisitos. */
export function calcularJornadaConsultor(nivel: string | null | undefined, valor: string | number | null | undefined, data: string | Date | null | undefined): JornadaConsultor {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  const pontos = Number.isFinite(numero) && numero >= 0 ? numero : null;
  const indice = typeof nivel === "string" ? ESCADA_PATAMARES.findIndex(p => normalizar(p.nome) === normalizar(nivel)) : -1;
  const atual = ESCADA_PATAMARES[indice], proximo = ESCADA_PATAMARES[indice + 1];
  const instante = data == null ? NaN : new Date(data).getTime();
  const atualizadoEm = Number.isFinite(instante) ? new Date(instante).toISOString() : null;
  const base: JornadaConsultor = {estado: "sem-dados", patamarAtual: atual?.nome ?? null, pontos,
    proximoPatamar: null, metaPontos: null, faltam: null, percentagem: null, atualizadoEm};
  if (!atual || pontos === null) return base;
  if (!proximo) return {...base, estado: "ultimo-patamar", percentagem: 100};
  const faltam = Math.max(0, Math.round((proximo.pontos - pontos) * 100) / 100);
  return {...base, estado: pontos >= proximo.pontos ? "meta-atingida" : "progresso", proximoPatamar: proximo.nome,
    metaPontos: proximo.pontos, faltam, percentagem: Math.max(0, Math.min(100, pontos / proximo.pontos * 100))};
}
