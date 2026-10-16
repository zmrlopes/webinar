import { loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";

/**
 * Mapas do travel planner, a partir dos mosaicos do OpenStreetMap. Poucos
 * mosaicos por mapa (no máximo ~20), com identificação da aplicação e a
 * atribuição desenhada no próprio mapa, como pede a política de utilização.
 */
const TAMANHO = 256;
const AGENTE = "iCliGoTravelPlanner/1.0 (+https://webinar.viajareviver.net)";
const cache = new Map<string, Promise<Image | null>>();

export interface Ponto { lat: number; lng: number }

/** Web Mercator em píxeis do mundo ao nível de zoom z. */
export function projetar(p: Ponto, z: number): {x: number; y: number} {
  const escala = TAMANHO * 2 ** z, seno = Math.sin(Math.max(-85, Math.min(85, p.lat)) * Math.PI / 180);
  return {x: (p.lng + 180) / 360 * escala, y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala};
}

function mosaico(z: number, x: number, y: number): Promise<Image | null> {
  const n = 2 ** z, xx = ((x % n) + n) % n;
  if (y < 0 || y >= n) return Promise.resolve(null);
  const chave = `${z}/${xx}/${y}`;
  if (!cache.has(chave)) {
    if (cache.size > 400) cache.clear();
    cache.set(chave, fetch(`https://tile.openstreetmap.org/${chave}.png`, {headers: {"User-Agent": AGENTE}, signal: AbortSignal.timeout(12_000)})
      .then(async r => r.ok ? loadImage(Buffer.from(await r.arrayBuffer())) : null).catch(() => null));
  }
  return cache.get(chave)!;
}

export interface Enquadramento { z: number; origemX: number; origemY: number }

/** O maior zoom em que todos os pontos cabem na área, com margem. */
export function enquadrar(pontos: Ponto[], largura: number, altura: number, margem = 0.18, zoomMax = 14): Enquadramento {
  let z = zoomMax;
  for (; z > 1; z--) {
    const xs = pontos.map(p => projetar(p, z).x), ys = pontos.map(p => projetar(p, z).y);
    if (Math.max(...xs) - Math.min(...xs) <= largura * (1 - 2 * margem) && Math.max(...ys) - Math.min(...ys) <= altura * (1 - 2 * margem)) break;
  }
  const xs = pontos.map(p => projetar(p, z).x), ys = pontos.map(p => projetar(p, z).y);
  return {z, origemX: (Math.min(...xs) + Math.max(...xs)) / 2 - largura / 2, origemY: (Math.min(...ys) + Math.max(...ys)) / 2 - altura / 2};
}

/** Desenha o fundo do mapa na área (x, y, largura, altura), suavizado para combinar com a marca. */
export async function desenharFundoMapa(ctx: SKRSContext2D, area: {x: number; y: number; w: number; h: number}, e: Enquadramento, raio = 0, densidade: 1 | 2 = 1): Promise<boolean> {
  // Com densidade 2, cada mosaico do nível seguinte ocupa meio mosaico no desenho: mapa nítido a 300 ppp.
  const z = e.z + (densidade - 1), ox = e.origemX * densidade, oy = e.origemY * densidade, lado = TAMANHO / densidade;
  const x0 = Math.floor(ox / TAMANHO), y0 = Math.floor(oy / TAMANHO);
  const x1 = Math.floor((ox + area.w * densidade) / TAMANHO), y1 = Math.floor((oy + area.h * densidade) / TAMANHO);
  const pedidos: Promise<{img: Image | null; tx: number; ty: number}>[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) pedidos.push(mosaico(z, tx, ty).then(img => ({img, tx, ty})));
  const mosaicos = await Promise.all(pedidos);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(area.x, area.y, area.w, area.h, raio); ctx.clip();
  ctx.fillStyle = "#e8ebe0"; ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.filter = "saturate(0.45) brightness(1.04)";
  // Meio píxel de sobreposição: sem ele notam-se linhas finas entre mosaicos.
  for (const m of mosaicos) if (m.img) ctx.drawImage(m.img, area.x + (m.tx * TAMANHO - ox) / densidade - 0.25, area.y + (m.ty * TAMANHO - oy) / densidade - 0.25, lado + 0.5, lado + 0.5);
  ctx.filter = "none";
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(area.x, area.y, area.w, area.h);
  // Atribuição obrigatória do OpenStreetMap.
  ctx.font = "15px Poppins"; const atrib = "© OpenStreetMap contributors";
  const w = ctx.measureText(atrib).width + 16;
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(area.x + area.w - w, area.y + area.h - 26, w, 26);
  ctx.fillStyle = "#444"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(atrib, area.x + area.w - w + 8, area.y + area.h - 13);
  ctx.restore();
  return mosaicos.some(m => m.img);
}

/** Posição de um ponto dentro da área do mapa. */
export function noMapa(p: Ponto, area: {x: number; y: number}, e: Enquadramento): {x: number; y: number} {
  const q = projetar(p, e.z);
  return {x: area.x + q.x - e.origemX, y: area.y + q.y - e.origemY};
}

/** Pontos ao longo do arco de círculo máximo entre a e b (a rota "real" de um voo). */
export function arcoVoo(a: Ponto, b: Ponto, passos = 64): Ponto[] {
  const rad = Math.PI / 180, [la1, lo1, la2, lo2] = [a.lat * rad, a.lng * rad, b.lat * rad, b.lng * rad];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  if (d < 1e-6) return [a, b];
  return Array.from({length: passos + 1}, (_, i) => {
    const f = i / passos, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    return {lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / rad, lng: Math.atan2(y, x) / rad};
  });
}

/** Distância em km (para "X km de voo"). */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
