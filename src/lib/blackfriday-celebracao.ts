export interface MemoriaLinhasBF {contexto: string; vistas: number[]}

/** A leitura inicial é a base; revisões e atualizações não repetem festejos. */
export function detetarNovasLinhasBF(memoria: MemoriaLinhasBF | null, contexto: string, linhas: number[]) {
  const atuais = [...new Set(linhas)].filter(l => Number.isInteger(l) && l >= 0 && l < 5).sort();
  if (!memoria || memoria.contexto !== contexto) return {memoria: {contexto, vistas: atuais}, novas: [] as number[]};
  const novas = atuais.filter(l => !memoria.vistas.includes(l));
  return {memoria: {contexto, vistas: [...new Set([...memoria.vistas, ...atuais])]}, novas};
}
