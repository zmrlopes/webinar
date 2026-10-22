export interface NoticiaTurismo {
  titulo: string;
  url: string;
  fonte: string;
  publicadaEm: string;
}

export interface DestaqueTurismo { dia: string; noticia: NoticiaTurismo }

export class FontesTurismoIndisponiveis extends Error {
  constructor(public diagnostico: { consultadaEm: string; fontes: { fonte: string; erro: string }[] }) {
    super("Não há notícias recentes disponíveis nas fontes de turismo.");
  }
}

// APIs públicas das próprias publicações. Só se recolhem título, ligação e data.
export const FONTES_TURISMO = [
  { nome: "Turisver", dominio: "turisver.pt", url: "https://turisver.pt/wp-json/wp/v2/posts?per_page=10&_fields=date_gmt,link,title&orderby=date&order=desc" },
  { nome: "Ambitur", dominio: "ambitur.pt", url: "https://www.ambitur.pt/wp-json/wp/v2/posts?per_page=10&_fields=date_gmt,link,title&orderby=date&order=desc" },
] as const;

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function tituloLimpo(texto: string): string {
  const entidades: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»",
    lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  };
  return texto.replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (original, codigo: string) => {
    if (!codigo.startsWith("#")) return entidades[codigo.toLowerCase()] ?? original;
    const n = codigo.toLowerCase().startsWith("#x") ? parseInt(codigo.slice(2), 16) : Number(codigo.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "";
  }).replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function lerNoticiasTurismo(dados: unknown, fonte: typeof FONTES_TURISMO[number], agora = new Date()): NoticiaTurismo[] {
  if (!Array.isArray(dados)) return [];
  const noticias: NoticiaTurismo[] = [];
  for (const valor of dados.slice(0, 20)) {
    const item = objeto(valor);
    const titulo = objeto(item?.title)?.rendered;
    if (typeof titulo !== "string" || typeof item?.link !== "string" || typeof item.date_gmt !== "string") continue;
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ?$/.test(item.date_gmt)) continue;
    const data = new Date(item.date_gmt.endsWith("Z") ? item.date_gmt : item.date_gmt + "Z");
    const idade = agora.getTime() - data.getTime();
    if (!Number.isFinite(idade) || idade < 0 || idade > 7 * 86_400_000) continue;
    try {
      const url = new URL(item.link);
      if (url.protocol !== "https:" || url.hostname.replace(/^www\./, "") !== fonte.dominio || url.username || url.password || url.port) continue;
      const texto = tituloLimpo(titulo);
      if (texto.length < 8 || texto.length > 350) continue;
      url.hash = "";
      noticias.push({ titulo: texto, url: url.href, fonte: fonte.nome, publicadaEm: data.toISOString() });
    } catch { /* Ignora apenas a notícia inválida, preservando as restantes. */ }
  }
  return noticias;
}

export async function carregarNoticiaTurismo(agora = new Date(), buscar: typeof fetch = fetch): Promise<NoticiaTurismo> {
  const resultados = await Promise.allSettled(FONTES_TURISMO.map(async fonte => {
    const resposta = await buscar(fonte.url, {
      cache: "no-store", signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" },
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados: unknown = await resposta.json();
    const noticias = lerNoticiasTurismo(dados, fonte, agora);
    if (!noticias.length) {
      const primeiraData = Array.isArray(dados) ? objeto(dados[0])?.date_gmt : null;
      throw new Error(`Sem notícias válidas (${Array.isArray(dados) ? dados.length : 0} itens; primeira data: ${typeof primeiraData === "string" ? primeiraData.slice(0, 30) : "indisponível"})`);
    }
    return noticias;
  }));
  const noticias = resultados.flatMap(r => r.status === "fulfilled" ? r.value : []);
  noticias.sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm) || a.url.localeCompare(b.url));
  if (!noticias[0]) throw new FontesTurismoIndisponiveis({ consultadaEm: agora.toISOString(), fontes: resultados.map((r, i) => ({
    fonte: FONTES_TURISMO[i]!.nome, erro: r.status === "rejected" && r.reason instanceof Error ? r.reason.message : "Sem notícias recentes",
  })) });
  return noticias[0];
}
