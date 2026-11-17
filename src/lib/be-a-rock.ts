export const BE_A_ROCK = {
  titulo: "Be a Rock",
  inicio: "2027-01-08",
  fim: "2027-01-10",
  dataTexto: "8 a 10 de janeiro de 2027",
  descricao: "Gostavas de assistir ao Be a Rock em conjunto? Vota na zona onde tens interesse em juntar-te à equipa. Juntos, temos momentos de partilha, feedback sobre as formações e muita aprendizagem. Existe comunidade!",
} as const;

export const ZONAS_BE_A_ROCK = ["NORTE", "SUL", "CASA"] as const;
export type ZonaBeARock = typeof ZONAS_BE_A_ROCK[number];
export function ehZonaBeARock(valor: unknown): valor is ZonaBeARock {
  return ZONAS_BE_A_ROCK.includes(valor as ZonaBeARock);
}

export const ROTULO_ZONA_BE_A_ROCK: Record<ZonaBeARock, string> = {
  NORTE: "NORTE", SUL: "SUL", CASA: "Vejo em casa",
};

export interface VotoBeARock {
  email: string;
  nome: string;
  zona: ZonaBeARock;
  atualizadoEm: string;
}

export function resumirVotosBeARock(votos: VotoBeARock[]) {
  const porZona = Object.fromEntries(ZONAS_BE_A_ROCK.map(zona => [zona, votos.filter(v => v.zona === zona)])) as Record<ZonaBeARock, VotoBeARock[]>;
  return { total: votos.length, ...porZona };
}
