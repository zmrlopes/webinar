import type { Aula } from "./formacoes-gravadas";

export function aulaTemVideo(aula: Aula): boolean {
  return !!(aula.youtube || aula.url);
}

export function urlDaAula(aula: Aula): string {
  return aula.url || (aula.youtube ? `https://www.youtube.com/watch?v=${aula.youtube}` : "");
}

/** Aceita links completos e normaliza os formatos de partilha do YouTube. */
export function normalizarLinkGravacao(valor: unknown): {url: string; youtube: string | null} {
  if (typeof valor !== "string" || valor.trim().length > 2048) throw new Error("Indica um link válido para a gravação.");
  let url: URL;
  try {url = new URL(valor.trim());} catch {throw new Error("Indica o link completo da gravação, começando por https://.");}
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Usa um link http:// ou https:// sem credenciais.");
  const host = url.hostname.toLowerCase();
  const youtubeHost = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host);
  if (host === "youtu.be" || host === "www.youtu.be" || youtubeHost) {
    const partes = url.pathname.split("/").filter(Boolean);
    const id = host.endsWith("youtu.be") ? partes[0] : url.pathname === "/watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(partes[0] ?? "") ? partes[1] : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("Coloca o link de um vídeo do YouTube; uma playlist ou canal não identifica uma gravação.");
    return {url: `https://www.youtube.com/watch?v=${id}`, youtube: id};
  }
  return {url: url.href, youtube: null};
}
