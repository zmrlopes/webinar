import {CAMPANHA_BF, periodoBF, type ConfiguracaoBF, type RankingBF} from "./blackfriday";

type Bruto = Record<string, {corpo: unknown}>;
interface Afiliado {user?: {username?: string; email?: string; name?: string}; stats?: {sales?: number}}
interface Pagina {list?: {content?: Afiliado[]; totalElements?: number}; content?: Afiliado[]; totalElements?: number}

/** O ranking é sempre do desafio, mesmo que a barra use o acumulado anual. */
export function prepararRankingBF(bruto: Bruto, config: ConfiguracaoBF, hoje: string, atualizadoEm: string): RankingBF | null {
  const intervalo = periodoBF({...config, periodoFaturacao: "desafio"}, hoje);
  if (intervalo.fim < intervalo.inicio) return null;
  const plano = bruto.plano?.corpo as {periodos?: {chave: string; inicio: string; fim: string}[]} | undefined;
  const periodo = plano?.periodos?.find(p => [ `blackfriday-${CAMPANHA_BF}`, `blackfriday-ranking-${CAMPANHA_BF}` ].includes(p.chave)
    && p.inicio === intervalo.inicio && p.fim === intervalo.fim);
  if (!periodo) return null;
  const falhas = bruto.falhas?.corpo;
  if (Array.isArray(falhas) && falhas.some(f => typeof f === "string" && f.startsWith(`Equipa ${periodo.chave}:`))) return null;
  const prefixo = `equipa-${periodo.chave}:p`;
  const chaves = Object.keys(bruto).filter(k => k.startsWith(prefixo) && /^\d+$/.test(k.slice(prefixo.length)))
    .sort((a, b) => Number(a.slice(prefixo.length)) - Number(b.slice(prefixo.length)));
  const consultores = new Map<string, RankingBF["consultores"][number]>();
  let esperado: number | undefined;
  for (const [indice, chave] of chaves.entries()) {
    if (Number(chave.slice(prefixo.length)) !== indice) return null;
    const pagina = bruto[chave]!.corpo as Pagina | null;
    const total = pagina?.list?.totalElements ?? pagina?.totalElements;
    const lista = pagina?.list?.content ?? pagina?.content;
    if (!Array.isArray(lista) || !Number.isInteger(total) || total! < 0 || (esperado !== undefined && esperado !== total)) return null;
    esperado = total;
    for (const a of lista) {
      const username = a?.user?.username?.trim().toLowerCase();
      const valor = a?.stats?.sales;
      if (!username || typeof valor !== "number" || !Number.isFinite(valor) || consultores.has(username)) return null;
      consultores.set(username, {username, email: a.user?.email?.trim().toLowerCase() ?? "", nome: a.user?.name?.trim() || username,
        valor: Math.round(valor * 100) / 100});
    }
  }
  // Uma lista incompleta nunca substitui o último ranking confirmado.
  if (esperado === undefined || consultores.size !== esperado) return null;
  return {...intervalo, atualizadoEm, consultores: [...consultores.values()].filter(c => c.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-PT") || a.username.localeCompare(b.username)).slice(0, 10)};
}
