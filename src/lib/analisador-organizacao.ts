/**
 * A função do servidor do MyOffice por trás do Analisador de Organização
 * (filhos diretos de uma pessoa, com volume e reserva média da subárvore).
 * Se o MyOffice mudar de versão, este endereço pode mudar também.
 */
const MYOFFICE = "https://myoffice.icligo.com";
export const ANALISADOR = `${MYOFFICE}/_serverFn/4b457b9f58baf866962a4eb026255982ff0e9deb00bd1b341b16408098b7584a`;

export interface NoAnalisador { consultantId: string; name: string; hasDownline: boolean; bookingVolume: number; avgBooking: number }

/** O pedido no formato do MyOffice (seroval): só strings, números e «undefined». Sem `pai`, devolve a raiz de quem está autenticado. */
export function pedidoAnalisador(inicio: string, fim: string, pagina: number, pai?: string): string {
  const v = (x: string | number | undefined) => x === undefined ? { t: 2, s: 1 } : typeof x === "number" ? { t: 0, s: x } : { t: 1, s: x };
  const corpo = { t: { t: 10, i: 0, p: { k: ["data"], v: [{ t: 10, i: 1, p: { k: ["parent", "page", "size", "startDate", "endDate", "country", "user"], v: [v(pai), v(pagina), v(100), v(inicio), v(fim), v(undefined), v(undefined)] }, o: 0 }] }, o: 0 }, f: 127, m: [] };
  return `${ANALISADOR}?payload=${encodeURIComponent(JSON.stringify(corpo))}`;
}

/** Converte a resposta seroval do MyOffice num objeto normal. */
export function deSeroval(raiz: unknown): unknown {
  const refs: Record<number, unknown> = {};
  const ler = (n: unknown): unknown => {
    if (!n || typeof n !== "object") return n;
    const no = n as { t: number; s?: unknown; i?: number; a?: unknown[]; p?: { k: string[]; v: unknown[] } };
    let r: unknown;
    if (no.t === 0 || no.t === 1) r = no.s;
    else if (no.t === 2) r = ({ 0: null, 1: undefined, 2: true, 3: false } as Record<number, unknown>)[no.s as number];
    else if (no.t === 4) r = refs[no.i!];
    else if (no.t === 9) r = (no.a ?? []).map(ler);
    else if (no.t === 10 || no.t === 11) { const o: Record<string, unknown> = {}; no.p?.k.forEach((k, i) => { o[k] = ler(no.p!.v[i]); }); r = o; }
    if (no.i !== undefined && no.t !== 4) refs[no.i] = r;
    return r;
  };
  return ler(raiz);
}
