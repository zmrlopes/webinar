import { diaEmPortugal, type AcontecimentoCalendario } from "./calendario-consultor";

export const LINGUAS_FORMACOES = {
  pt: { bandeira: "🇵🇹", nome: "Português" },
  es: { bandeira: "🇪🇸", nome: "Espanhol" },
  gb: { bandeira: "🇬🇧", nome: "Inglês (Reino Unido)" },
  us: { bandeira: "🇺🇸", nome: "Inglês (Estados Unidos)" },
  fr: { bandeira: "🇫🇷", nome: "Francês" },
  br: { bandeira: "🇧🇷", nome: "Português (Brasil)" },
  de: { bandeira: "🇩🇪", nome: "Alemão" },
  it: { bandeira: "🇮🇹", nome: "Italiano" },
} as const;
export type LinguaFormacao = keyof typeof LINGUAS_FORMACOES;

export function linguaDaFormacao(titulo: string): LinguaFormacao | null {
  return (Object.keys(LINGUAS_FORMACOES) as LinguaFormacao[]).find(l => titulo.includes(LINGUAS_FORMACOES[l].bandeira)) ?? null;
}

export function tituloSemBandeira(titulo: string): string {
  return titulo.replace(/\p{Regional_Indicator}{2}/gu, "").replace(/\s+/g, " ").trim();
}

type Objeto = Record<string, unknown>;
function objeto(valor: unknown): Objeto {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? valor as Objeto : {};
}

/** Só publica campos do evento; nunca dados do membro ou da sessão do fórum. */
export function extrairFormacoesForum(registos: unknown[], mes: string): AcontecimentoCalendario[] {
  const formacoes = new Map<string, AcontecimentoCalendario>();
  for (const registo of registos) {
    const p = objeto(registo), e = objeto(p.event_setting_attributes);
    if (p.status !== "published" || e.location_type === "in_person") continue;
    const titulo = typeof p.name === "string" ? p.name.trim() : "";
    const lingua = linguaDaFormacao(titulo);
    // Este espaço também contém feriados e encontros presenciais.
    if (!lingua && e.location_type !== "virtual" && !/\bBe (?:a Pro|an Expert)\b/i.test(titulo)) continue;
    if (!titulo || !Number.isSafeInteger(p.id) || typeof p.slug !== "string" || !/^[a-z0-9_-]+$/i.test(p.slug)
      || typeof e.starts_at !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/.test(e.starts_at) || !Number.isFinite(Date.parse(e.starts_at))) {
      throw new Error("O fórum devolveu uma formação com dados incompletos.");
    }
    const comecaEm = new Date(e.starts_at).toISOString();
    if (!diaEmPortugal(new Date(comecaEm)).startsWith(mes)) continue;
    const terminaEm = typeof e.ends_at === "string" && Number.isFinite(Date.parse(e.ends_at)) && Date.parse(e.ends_at) > Date.parse(comecaEm)
      ? new Date(e.ends_at).toISOString() : null;
    const id = `forum-icligo-${p.id}`;
    formacoes.set(id, { id, titulo: tituloSemBandeira(titulo), categoria: "icligo", comecaEm, terminaEm,
      diaInteiro: false, local: "Online · iCliGo", url: `https://forum.icligo.com/c/eventos-online/${p.slug}`, lingua, origem: "forum-icligo" });
  }
  return [...formacoes.values()].sort((a, b) => a.comecaEm.localeCompare(b.comecaEm) || a.id.localeCompare(b.id));
}

function urlDaFormacao(url: string | null): string | null {
  try {
    const u = new URL(url ?? "");
    if (u.hostname !== "forum.icligo.com" || !u.pathname.startsWith("/c/eventos-online/")) return null;
    return u.pathname.replace(/\/+$/, "").toLowerCase();
  } catch { return null; }
}

/** O fórum prevalece quando a formação já foi introduzida manualmente. */
export function juntarFormacoesIcligo(manuais: AcontecimentoCalendario[], importadas: AcontecimentoCalendario[]): AcontecimentoCalendario[] {
  const urls = new Set(importadas.map(f => urlDaFormacao(f.url)).filter(Boolean));
  const chave = (f: AcontecimentoCalendario) => `${tituloSemBandeira(f.titulo).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()}|${f.lingua ?? "?"}|${diaEmPortugal(new Date(f.comecaEm))}`;
  const chaves = new Set(importadas.map(chave));
  return [...importadas, ...manuais.filter(f => {
    const url = urlDaFormacao(f.url);
    return !(url && urls.has(url)) && !chaves.has(chave(f));
  })];
}
