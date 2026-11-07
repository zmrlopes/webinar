import { chaveDoPatamar, progressoParaPatamar } from "./trofeus-lista";

const SEGUINTES: Record<string, {nome: string; chave: string; base: number}> = {
  "patamar-junior": {nome: "Sénior", chave: "patamar-senior", base: 0},
  "patamar-senior": {nome: "Master", chave: "patamar-master", base: 15},
  "patamar-master": {nome: "Coordenador", chave: "patamar-coordenador", base: 75},
  "patamar-coordenador": {nome: "Diretor", chave: "patamar-diretor", base: 250},
};
export function progressaoInscrito(nivel: string | null, pontos: number | null) {
  const chave = chaveDoPatamar(nivel), seguinte = chave ? SEGUINTES[chave] : undefined;
  if (!seguinte || pontos === null || !Number.isFinite(pontos) || pontos < 0) return null;
  const progresso = progressoParaPatamar(pontos, seguinte.chave);
  if (!progresso) return null;
  const faltam = Math.round(progresso.faltam * 100) / 100;
  return {proximo: seguinte.nome, limiar: progresso.pontosNecessarios, faltam,
    perto: faltam / (progresso.pontosNecessarios - seguinte.base) <= 0.15 || (chave === "patamar-junior" && faltam <= 3)};
}
