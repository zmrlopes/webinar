import { ehContaPropria } from "./dashboard-negocio";

/**
 * Reserva média, como o Analisador de Organização do MyOffice a calcula:
 * valor total das reservas ÷ número de reservas. O MyOffice dá, para cada
 * pessoa, o volume e a reserva média da sua subárvore (ela + descendência);
 * as reservas pessoais de cada uma são o seu nó menos a soma dos filhos.
 * Os nós chegam do botão «Atualizar dashboard» (parte `reservas-<ano>`) e o
 * resultado fica em dashboard_config.reservas_medias — nada no código.
 */

/** O primeiro ano com reservas na equipa. */
export const ANO_INICIO_RESERVAS = 2019;

/** Um nó da árvore, tal como o atualizador o envia. */
export interface NoReservas {
  id: string;
  n: string;
  /** Volume de reservas da subárvore. */
  v: number;
  /** Reserva média da subárvore. */
  a: number;
  /** Filhos diretos. */
  f: string[];
}

export interface ArvoreReservas {
  raiz: { v: number; a: number; f: string[] };
  nos: NoReservas[];
  ate: string;
}

export interface AnoReservas {
  ano: number;
  parcial: boolean;
  ate: string;
  volume: number;
  reservas: number;
  media: number;
  consultores: number;
  mediaConsultor: number;
  medianaConsultor: number;
  reservasPorConsultor: number;
  vendaPorConsultor: number;
  /** Reservas pessoais de cada consultor no ano: id → [volume, nº de reservas]. */
  pessoas: Record<string, [number, number]>;
}

export interface DadosReservasMedias {
  ate: string;
  anos: AnoReservas[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const nReservas = (v: number, a: number) => (a > 0 ? Math.round(v / a) : 0);

/** Os anos a pedir: os que ainda não estão guardados e o ano em curso (ou ainda parcial). */
export function anosReservasAPedir(dados: DadosReservasMedias | null, ano: number): number[] {
  const anos: number[] = [];
  for (let a = ANO_INICIO_RESERVAS; a <= ano; a++) {
    const guardado = dados?.anos.find((x) => x.ano === a);
    if (!guardado || guardado.parcial || a === ano) anos.push(a);
  }
  return anos;
}

export function calcularAno(ano: number, arvore: ArvoreReservas, hoje: string): AnoReservas {
  const porId = new Map(arvore.nos.map((n) => [n.id, n]));
  const filhos = (f: string[]) => f.map((id) => porId.get(id)).filter((n): n is NoReservas => !!n);
  const pessoas: Record<string, [number, number]> = {};
  for (const n of arvore.nos) {
    if (ehContaPropria(n.n)) continue;
    const k = filhos(n.f);
    const v = r2(n.v - k.reduce((s, x) => s + x.v, 0));
    const c = nReservas(n.v, n.a) - k.reduce((s, x) => s + nReservas(x.v, x.a), 0);
    if (v > 0 && c > 0) pessoas[n.id] = [v, c];
  }
  const resumo = resumir(Object.values(pessoas));
  const fim = `${ano}-12-31`;
  return {
    ano,
    parcial: hoje < fim,
    ate: hoje < fim ? hoje : fim,
    volume: r2(arvore.raiz.v),
    reservas: nReservas(arvore.raiz.v, arvore.raiz.a),
    media: r2(arvore.raiz.a),
    ...resumo,
    pessoas,
  };
}

/** Médias de um consultor a partir das reservas pessoais de cada um. */
export function resumir(lista: [number, number][]): Pick<
  AnoReservas,
  "consultores" | "mediaConsultor" | "medianaConsultor" | "reservasPorConsultor" | "vendaPorConsultor"
> {
  const medias = lista.map(([v, c]) => v / c).sort((a, b) => a - b);
  const n = medias.length;
  const meio = n % 2 ? medias[(n - 1) / 2]! : n ? (medias[n / 2 - 1]! + medias[n / 2]!) / 2 : 0;
  return {
    consultores: n,
    mediaConsultor: n ? r2(medias.reduce((a, b) => a + b, 0) / n) : 0,
    medianaConsultor: r2(meio),
    reservasPorConsultor: n ? Math.round((lista.reduce((s, [, c]) => s + c, 0) / n) * 10) / 10 : 0,
    vendaPorConsultor: n ? Math.round(lista.reduce((s, [v]) => s + v, 0) / n) : 0,
  };
}

/** Junta os anos recebidos aos que já estavam guardados. */
export function juntarAnos(
  anterior: DadosReservasMedias | null,
  novos: AnoReservas[],
  hoje: string,
): DadosReservasMedias {
  const porAno = new Map((anterior?.anos ?? []).map((a) => [a.ano, a]));
  for (const a of novos) porAno.set(a.ano, a);
  return { ate: hoje, anos: [...porAno.values()].sort((a, b) => a.ano - b.ano) };
}
