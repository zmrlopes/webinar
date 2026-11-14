import type { InscricaoEvento } from "./eventos";

type InscricaoComPresencas = Pick<InscricaoEvento, "adultos" | "criancasMais10" | "criancasMenos10" | "bilhetes">;

/** Cada bilhete corresponde a uma pessoa, incluindo acompanhantes e crianças. */
export function resumirPresencasEvento(inscricoes: readonly InscricaoComPresencas[]) {
  const total = inscricoes.reduce((soma, i) => soma + i.adultos + i.criancasMais10 + i.criancasMenos10, 0);
  const presentes = inscricoes.reduce((soma, i) => soma + i.bilhetes.filter(b => b.presente).length, 0);
  return { total, presentes, semCheckin: Math.max(0, total - presentes) };
}
