import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { arcoVoo, desenharFundoMapa, distanciaKm, enquadrar, noMapa, type Ponto } from "./travel-planner-mapas";
import { coresPlanner, dataPlanner, diasDaViagem, misturar, somarDiasPlanner, type CoresPlanner, type DicaPlanner, type MarcaPlanner, type TemaDica, type TravelPlanner } from "./travel-planner";

/**
 * Desenha cada página do travel planner como imagem A4 (150 ppp). O PDF
 * junta depois as páginas. As cores são as escolhidas pelo consultor (por
 * omissão, as da marca: verde-oliva, dourado e preto); o logótipo iCliGo não muda.
 */
export const LARGURA = 1240, ALTURA = 1754;
const M = 92;
const TINTA = "#111111", CINZA = "#6b6a63", LINHA = "#e2e4d6";

let fontesProntas = false;
function registarFontes() {
  if (fontesProntas) return;
  const pasta = join(process.cwd(), "public", "fonts");
  GlobalFonts.registerFromPath(join(pasta, "PlayfairDisplay-Variable.ttf"), "Playfair");
  GlobalFonts.registerFromPath(join(pasta, "Poppins-Regular.ttf"), "Poppins");
  GlobalFonts.registerFromPath(join(pasta, "Poppins-Bold.ttf"), "PoppinsBold");
  fontesProntas = true;
}
let logoCache: Promise<Image | null> | null = null;
function logo(): Promise<Image | null> {
  logoCache ??= loadImage(readFileSync(join(process.cwd(), "public", "icligo-logo.png"))).catch(() => null);
  return logoCache;
}

interface Tema { escala: number; fundo: string; cartao: string; titulo: (t: number) => string; maiusculas: boolean; faixa: boolean; c: CoresPlanner }
function tema(estilo: TravelPlanner["estilo"], marca: MarcaPlanner, escala: number): Tema {
  const c = coresPlanner(marca);
  if (estilo === "moderno") return {escala, fundo: "#ffffff", cartao: misturar(marca.escura, 0.95), titulo: t => `${t}px PoppinsBold`, maiusculas: true, faixa: true, c};
  if (estilo === "natural") return {escala, fundo: misturar(marca.principal, 0.95), cartao: "#ffffff", titulo: t => `${t}px Playfair`, maiusculas: false, faixa: false, c};
  return {escala, fundo: "#ffffff", cartao: c.creme, titulo: t => `${t}px Playfair`, maiusculas: false, faixa: false, c};
}

// ---------- utilitários de desenho ----------

function linhas(ctx: SKRSContext2D, texto: string, largura: number): string[] {
  const resultado: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let linha = "";
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (ctx.measureText(tentativa).width <= largura || !linha) linha = tentativa;
      else { resultado.push(linha); linha = palavra; }
    }
    if (linha) resultado.push(linha);
  }
  return resultado;
}

/** Escreve texto com quebra de linha; corta com "…" ao chegar a maxLinhas. Devolve a altura usada. */
function paragrafo(ctx: SKRSContext2D, texto: string, x: number, y: number, largura: number, altura: number, maxLinhas = 99): number {
  let ls = linhas(ctx, texto, largura);
  if (ls.length > maxLinhas) {
    ls = ls.slice(0, maxLinhas);
    let ultima = ls[maxLinhas - 1]!;
    while (ultima && ctx.measureText(`${ultima}…`).width > largura) ultima = ultima.slice(0, -1);
    ls[maxLinhas - 1] = `${ultima.trimEnd()}…`;
  }
  ctx.textBaseline = "top";
  ls.forEach((l, i) => ctx.fillText(l, x, y + i * altura));
  return ls.length * altura;
}

function alturaParagrafo(ctx: SKRSContext2D, texto: string, largura: number, altura: number, maxLinhas = 99): number {
  return Math.min(linhas(ctx, texto, largura).length, maxLinhas) * altura;
}

/** Uma fotografia com o enquadramento escolhido pelo consultor. */
export interface FotoDesenho { img: Image; foco: {x: number; y: number}; inteira: boolean }

/**
 * Enche a área com a fotografia, cortando o que sobra à volta do ponto de
 * foco. Com "inteira", mostra a fotografia toda, sobre uma versão desfocada
 * dela própria a encher o espaço.
 */
function cobrir(ctx: SKRSContext2D, f: FotoDesenho, x: number, y: number, w: number, h: number, raio = 0) {
  const img = f.img, escala = Math.max(w / img.width, h / img.height), iw = img.width * escala, ih = img.height * escala;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, raio); ctx.clip();
  if (f.inteira) {
    ctx.filter = "blur(28px) brightness(0.8)";
    ctx.drawImage(img, x + (w - iw * 1.1) / 2, y + (h - ih * 1.1) / 2, iw * 1.1, ih * 1.1);
    ctx.filter = "none";
    const c = Math.min(w / img.width, h / img.height), cw = img.width * c, ch = img.height * c;
    ctx.drawImage(img, x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
  } else {
    const limitar = (v: number, min: number) => Math.min(0, Math.max(min, v));
    const ox = limitar(w / 2 - f.foco.x * iw, w - iw), oy = limitar(h / 2 - f.foco.y * ih, h - ih);
    ctx.drawImage(img, x + ox, y + oy, iw, ih);
  }
  ctx.restore();
}

function retangulo(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, raio: number, cor: string, contorno?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, raio);
  ctx.fillStyle = cor; ctx.fill();
  if (contorno) { ctx.strokeStyle = contorno; ctx.lineWidth = 2; ctx.stroke(); }
}

function sombra(ctx: SKRSContext2D, ativa: boolean) {
  const e = ctx.getTransform().a;
  ctx.shadowColor = ativa ? "rgba(0,0,0,0.12)" : "transparent"; ctx.shadowBlur = ativa ? 24 * e : 0; ctx.shadowOffsetY = ativa ? 6 * e : 0;
}

/** Placeholder quando não há fotografia: gradiente verde-oliva com o nome do local. */
function semFoto(ctx: SKRSContext2D, t: Tema, x: number, y: number, w: number, h: number, raio: number, legenda: string) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, raio); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, t.c.principal); g.addColorStop(1, t.c.principalEscuro);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.08;
  for (let i = -h; i < w; i += 46) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.lineTo(x + i + h + 18, y); ctx.lineTo(x + i + 18, y + h); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (legenda) { ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "italic 40px Playfair"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(legenda, x + w / 2, y + h / 2, w - 60); ctx.textAlign = "left"; }
  ctx.restore();
}

// ---------- ícones (desenhados, sem fontes de emoji) ----------

export type Icone = "aviao" | "hotel" | "manha" | "tarde" | "noite" | "mala" | "transfer" | "moeda" | "tomada" | "relogio" | "termometro" | "documento" | "saude" | "telefone" | "email" | "lingua" | "pin" | "calendario" | "pessoas" | "estrela" | "gorjeta" | "info";

export function icone(ctx: SKRSContext2D, nome: Icone, cx: number, cy: number, s: number, cor: string) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const linha = (pts: number[][]) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)); ctx.stroke(); };
  const circulo = (x: number, y: number, r: number, cheio = false) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); cheio ? ctx.fill() : ctx.stroke(); };
  const rect = (x: number, y: number, w: number, h: number, r = 2) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); };
  switch (nome) {
    case "aviao":
      ctx.beginPath();
      ctx.moveTo(10.5, 0); ctx.lineTo(3, -1.6); ctx.lineTo(-3, -9.5); ctx.lineTo(-5.5, -9.5); ctx.lineTo(-2.5, -1.8); ctx.lineTo(-7.5, -1.4); ctx.lineTo(-9.5, -4); ctx.lineTo(-11, -4);
      ctx.lineTo(-10, 0); ctx.lineTo(-11, 4); ctx.lineTo(-9.5, 4); ctx.lineTo(-7.5, 1.4); ctx.lineTo(-2.5, 1.8); ctx.lineTo(-5.5, 9.5); ctx.lineTo(-3, 9.5); ctx.lineTo(3, 1.6); ctx.closePath(); ctx.fill();
      break;
    case "hotel": rect(-10, -3, 20, 9); linha([[-10, 6], [-10, 9]]); linha([[10, 6], [10, 9]]); rect(-7, -8, 6, 5, 2); linha([[-10, -9], [-10, 6]]); break;
    case "manha": ctx.beginPath(); ctx.arc(0, 4, 6, Math.PI, 0); ctx.stroke(); linha([[-11, 4], [11, 4]]); linha([[0, -8], [0, -5]]); linha([[-8, -4], [-6, -2]]); linha([[8, -4], [6, -2]]); linha([[-6, 8], [6, 8]]); break;
    case "tarde": circulo(0, 0, 5); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; linha([[Math.cos(a) * 8, Math.sin(a) * 8], [Math.cos(a) * 11, Math.sin(a) * 11]]); } break;
    case "noite": ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI * 0.35, Math.PI * 1.65); ctx.arc(4, -3, 7.5, Math.PI * 1.45, Math.PI * 0.45, true); ctx.closePath(); ctx.stroke(); circulo(8, -8, 0.9, true); break;
    case "mala": rect(-9, -5, 18, 14, 3); rect(-4, -9, 8, 4, 1.5); linha([[-4, -5], [-4, 9]]); linha([[4, -5], [4, 9]]); break;
    case "transfer": rect(-10, -6, 20, 11, 3); linha([[-10, 0], [10, 0]]); circulo(-5, 7, 2); circulo(5, 7, 2); linha([[-6, -6], [-4, -10], [4, -10], [6, -6]]); break;
    case "moeda": circulo(0, 0, 10); ctx.font = "bold 13px Poppins"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("€", 0, 1); break;
    case "tomada": rect(-9, -9, 18, 18, 5); circulo(-3.5, 0, 1.4, true); circulo(3.5, 0, 1.4, true); break;
    case "relogio": circulo(0, 0, 10); linha([[0, -6], [0, 0], [4, 3]]); break;
    case "termometro": ctx.beginPath(); ctx.arc(0, 6, 4.5, Math.PI * 1.75, Math.PI * 1.25); ctx.lineTo(-2.5, -8); ctx.arc(0, -8, 2.5, Math.PI, 0); ctx.closePath(); ctx.stroke(); circulo(0, 6, 2.2, true); linha([[0, 4], [0, -4]]); break;
    case "documento": rect(-8, -10, 16, 20, 2); circulo(0, -2, 3.5); linha([[-4, 6], [4, 6]]); break;
    case "saude": rect(-10, -10, 20, 20, 5); ctx.lineWidth = 3; linha([[0, -5], [0, 5]]); linha([[-5, 0], [5, 0]]); break;
    case "telefone": rect(-6, -10, 12, 20, 3); linha([[-2, 7], [2, 7]]); break;
    case "email": rect(-10, -7, 20, 14, 2); linha([[-10, -6], [0, 2], [10, -6]]); break;
    case "lingua": rect(-10, -9, 15, 11, 3); linha([[-6, 2], [-8, 6], [-2, 2]]); rect(-1, -2, 11, 9, 3); break;
    case "pin": ctx.beginPath(); ctx.arc(0, -3, 7, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(0, 10); ctx.closePath(); ctx.stroke(); circulo(0, -3, 2.5); break;
    case "calendario": rect(-9, -7, 18, 16, 2); linha([[-9, -2], [9, -2]]); linha([[-5, -10], [-5, -5]]); linha([[5, -10], [5, -5]]); break;
    case "pessoas": circulo(-4, -4, 3.5); circulo(5, -3, 2.8); ctx.beginPath(); ctx.arc(-4, 9, 7, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(6, 8, 5, Math.PI * 1.1, 0); ctx.stroke(); break;
    case "estrela": ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 10, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); break;
    case "gorjeta": rect(-10, -6, 20, 12, 2); circulo(0, 0, 3); break;
    default: circulo(0, 0, 10); linha([[0, -1], [0, 5]]); circulo(0, -5, 1, true);
  }
  ctx.restore();
}

const ICONE_DICA: Record<TemaDica, Icone> = {documentos: "documento", saude: "saude", moeda: "moeda", clima: "termometro", tomadas: "tomada", fuso: "relogio", mala: "mala", gorjetas: "gorjeta", transportes: "transfer", outro: "info"};

// ---------- elementos comuns ----------

function marca(ctx: SKRSContext2D, x: number, y: number, img: Image | null, clara: boolean, escala = 1) {
  let tx = x;
  if (img) { const h = 52 * escala; ctx.drawImage(img, x, y - h / 2, h * img.width / img.height, h); tx += h * img.width / img.height + 12 * escala; }
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = clara ? "#ffffff" : "#ff6b4a"; ctx.font = `${30 * escala}px PoppinsBold`; ctx.fillText("icligo", tx, y + 4 * escala);
  ctx.fillStyle = clara ? "rgba(255,255,255,0.9)" : "#344153"; ctx.font = `${14 * escala}px Poppins`; ctx.fillText("travel partners", tx, y + 24 * escala);
}

function rodape(ctx: SKRSContext2D, p: TravelPlanner, n: number, img: Image | null) {
  ctx.fillStyle = LINHA; ctx.fillRect(M, ALTURA - 92, LARGURA - 2 * M, 2);
  marca(ctx, M, ALTURA - 52, img, false, 0.62);
  ctx.font = "17px Poppins"; ctx.fillStyle = CINZA; ctx.textBaseline = "middle";
  ctx.textAlign = "center"; ctx.fillText(p.viagem.destino, LARGURA / 2, ALTURA - 50);
  ctx.textAlign = "right"; ctx.fillText(String(n), LARGURA - M, ALTURA - 50); ctx.textAlign = "left";
}

function cabecalho(ctx: SKRSContext2D, t: Tema, etiqueta: string, titulo: string, y = M): number {
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  if (t.faixa) {
    retangulo(ctx, M, y, LARGURA - 2 * M, 104, 0, t.c.escura);
    ctx.fillStyle = t.c.sobreEscura; ctx.globalAlpha = 0.75; ctx.font = "18px PoppinsBold"; ctx.fillText(etiqueta.toUpperCase(), M + 34, y + 38); ctx.globalAlpha = 1;
    ctx.fillStyle = t.c.sobreEscura; ctx.font = t.titulo(40); ctx.fillText(titulo.toUpperCase(), M + 34, y + 84, LARGURA - 2 * M - 68);
    return y + 140;
  }
  ctx.fillStyle = t.c.principalTexto; ctx.font = "18px PoppinsBold"; ctx.fillText(etiqueta.toUpperCase(), M, y + 22);
  ctx.fillStyle = TINTA; ctx.font = t.titulo(58); ctx.fillText(titulo, M, y + 90, LARGURA - 2 * M);
  ctx.fillStyle = t.c.principal; ctx.fillRect(M, y + 112, 70, 5);
  return y + 150;
}

function novaPagina(t: Tema) {
  // Desenha em coordenadas A4 a 150 ppp; a escala dá a resolução final (2 = 300 ppp, para impressão).
  const canvas = createCanvas(Math.round(LARGURA * t.escala), Math.round(ALTURA * t.escala)), ctx = canvas.getContext("2d");
  ctx.scale(t.escala, t.escala);
  ctx.fillStyle = t.fundo; ctx.fillRect(0, 0, LARGURA, ALTURA);
  return {canvas, ctx};
}

function pastilha(ctx: SKRSContext2D, texto: string, x: number, y: number, fundo: string, cor: string, ic?: Icone): number {
  ctx.font = "20px PoppinsBold";
  const w = ctx.measureText(texto).width + (ic ? 74 : 44);
  retangulo(ctx, x, y, w, 50, 25, fundo);
  if (ic) icone(ctx, ic, x + 34, y + 25, 24, cor);
  ctx.fillStyle = cor; ctx.textBaseline = "middle"; ctx.fillText(texto, x + (ic ? 56 : 22), y + 26);
  return w;
}

// ---------- páginas ----------

export interface ImagensPlanner { capa: FotoDesenho | null; hotel: FotoDesenho | null; dias: (FotoDesenho | null)[] }
export interface DadosDesenho {
  p: TravelPlanner; marca: MarcaPlanner; consultor: {nome: string; email: string} | null; imagens: ImagensPlanner;
  /** 2 para o PDF (300 ppp); menos para a pré-visualização no ecrã. */
  escala?: number;
}

function capa(d: DadosDesenho, t: Tema, img: Image | null) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  const natural = p.estilo === "natural", sobreCapa = natural ? t.c.sobrePrincipal : "#ffffff", vidro = sobreCapa === "#ffffff" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)", alturaFoto = natural ? ALTURA * 0.6 : ALTURA;
  if (d.imagens.capa) cobrir(ctx, d.imagens.capa, 0, 0, LARGURA, alturaFoto);
  else semFoto(ctx, t, 0, 0, LARGURA, alturaFoto, 0, "");
  if (natural) { ctx.fillStyle = t.c.principal; ctx.fillRect(0, alturaFoto, LARGURA, ALTURA - alturaFoto); }
  else {
    const g = ctx.createLinearGradient(0, ALTURA * 0.35, 0, ALTURA);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, p.estilo === "moderno" ? t.c.escuraA78 : t.c.capaA70); g.addColorStop(1, p.estilo === "moderno" ? t.c.escuraA95 : t.c.capaA92);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGURA, ALTURA);
    const topo = ctx.createLinearGradient(0, 0, 0, 260); topo.addColorStop(0, "rgba(0,0,0,0.35)"); topo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topo; ctx.fillRect(0, 0, LARGURA, 260);
  }
  // Marca num cartão branco, como nos materiais de Reservas.
  retangulo(ctx, M - 24, 70, 300, 92, 18, "#ffffff");
  marca(ctx, M - 2, 112, img, false, 1);
  ctx.font = "18px PoppinsBold"; ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillText("TRAVEL PLANNER", LARGURA - M, 116); ctx.textAlign = "left";

  let y = natural ? alturaFoto + 110 : ALTURA - 640;
  ctx.fillStyle = natural ? sobreCapa : t.c.suave; ctx.globalAlpha = natural ? 0.8 : 1; ctx.font = "22px PoppinsBold"; ctx.textBaseline = "alphabetic";
  ctx.fillText(p.perfil.tipo ? `A VIAGEM DE SONHO · ${p.perfil.tipo.toUpperCase()}` : "A VOSSA PRÓXIMA AVENTURA", M, y);
  y += 30; ctx.globalAlpha = 1;
  ctx.fillStyle = sobreCapa; ctx.font = t.titulo(p.viagem.destino.length > 18 ? 104 : 136);
  const destino = t.maiusculas ? p.viagem.destino.toUpperCase() : p.viagem.destino;
  for (const l of linhas(ctx, destino, LARGURA - 2 * M).slice(0, 2)) { y += p.viagem.destino.length > 18 ? 112 : 140; ctx.fillText(l, M, y); }
  y += 46;
  const total = diasDaViagem(p.viagem.ida, p.viagem.regresso);
  let x = M;
  if (p.viagem.ida && p.viagem.regresso) x += pastilha(ctx, `${dataPlanner(p.viagem.ida, {day: "numeric", month: "short"})} – ${dataPlanner(p.viagem.regresso, {day: "numeric", month: "short", year: "numeric"})}`, x, y, vidro, sobreCapa, "calendario") + 14;
  if (total) x += pastilha(ctx, `${total} dias`, x, y, vidro, sobreCapa, "estrela") + 14;
  if (p.viagem.viajantes) pastilha(ctx, `${p.viagem.viajantes} viajante${p.viagem.viajantes > 1 ? "s" : ""}`, x, y, vidro, sobreCapa, "pessoas");

  ctx.fillStyle = sobreCapa; ctx.globalAlpha = 0.35; ctx.fillRect(M, ALTURA - 190, LARGURA - 2 * M, 1.5); ctx.globalAlpha = 1;
  ctx.fillStyle = sobreCapa; ctx.textBaseline = "alphabetic";
  if (d.consultor) {
    ctx.font = "18px Poppins"; ctx.fillStyle = sobreCapa; ctx.globalAlpha = 0.8; ctx.fillText("Preparado com carinho por", M, ALTURA - 140); ctx.globalAlpha = 1;
    ctx.font = "30px PoppinsBold"; ctx.fillStyle = sobreCapa; ctx.fillText(d.consultor.nome, M, ALTURA - 100);
  }
  if (p.foto?.credito) { ctx.font = "13px Poppins"; ctx.fillStyle = sobreCapa === "#ffffff" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)"; ctx.textAlign = "right"; ctx.fillText(`Fotografia: ${p.foto.credito}`.slice(0, 90), LARGURA - M, ALTURA - 104); ctx.textAlign = "left"; }
  return canvas;
}

function cartaoEmbarque(ctx: SKRSContext2D, t: Tema, v: TravelPlanner["voos"][number], x: number, y: number, w: number, h: number) {
  sombra(ctx, true); retangulo(ctx, x, y, w, h, 22, "#ffffff"); sombra(ctx, false);
  const stub = 190, corpo = w - stub;
  // Talão lateral verde-oliva com o sentido.
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + corpo, y, stub, h, [0, 22, 22, 0]); ctx.clip();
  const sobre = v.sentido === "ida" ? t.c.sobrePrincipal : t.c.sobreEscura;
  ctx.fillStyle = v.sentido === "ida" ? t.c.principal : t.c.escura; ctx.fillRect(x + corpo, y, stub, h); ctx.restore();
  ctx.fillStyle = sobre; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  icone(ctx, "aviao", x + corpo + stub / 2, y + h / 2 - 30, 40, sobre);
  ctx.font = "26px PoppinsBold"; ctx.fillText(v.sentido === "ida" ? "IDA" : "VOLTA", x + corpo + stub / 2, y + h / 2 + 22);
  if (v.data) { ctx.font = "17px Poppins"; ctx.fillText(dataPlanner(v.data, {day: "numeric", month: "short"}), x + corpo + stub / 2, y + h / 2 + 52); }
  // Picotado e entalhes.
  ctx.strokeStyle = t.c.linhaSuave; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + corpo, y + 18); ctx.lineTo(x + corpo, y + h - 18); ctx.stroke(); ctx.setLineDash([]);
  // Origem → destino.
  const esq = x + 44, dir = x + corpo - 44;
  ctx.textAlign = "left"; ctx.fillStyle = CINZA; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "alphabetic";
  ctx.fillText([v.companhia, v.numero].filter(Boolean).join(" · ").toUpperCase() || "VOO", esq, y + 44);
  ctx.fillStyle = TINTA; ctx.font = "64px PoppinsBold"; ctx.fillText(v.origem || "—", esq, y + 122);
  ctx.textAlign = "right"; ctx.fillText(v.destino || "—", dir, y + 122);
  ctx.font = "19px Poppins"; ctx.fillStyle = CINZA;
  ctx.textAlign = "left"; ctx.fillText(v.origemCidade, esq, y + 152, 220);
  ctx.textAlign = "right"; ctx.fillText(v.destinoCidade, dir, y + 152, 220);
  ctx.font = "30px PoppinsBold"; ctx.fillStyle = t.c.principalTexto;
  ctx.textAlign = "left"; if (v.partida) ctx.fillText(v.partida, esq, y + h - 30);
  ctx.textAlign = "right"; if (v.chegada) ctx.fillText(v.chegada, dir, y + h - 30);
  // Linha do voo.
  const meioY = y + 100, a = esq + 200, b = dir - 200;
  ctx.strokeStyle = t.c.linhaSuave; ctx.lineWidth = 3; ctx.setLineDash([2, 10]); ctx.beginPath(); ctx.moveTo(a, meioY); ctx.lineTo(b, meioY); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc((a + b) / 2, meioY, 30, 0, Math.PI * 2); ctx.fillStyle = t.c.suave; ctx.fill();
  icone(ctx, "aviao", (a + b) / 2, meioY, 34, t.c.principalTexto);
  ctx.textAlign = "left";
}

async function viagem(d: DadosDesenho, t: Tema, img: Image | null, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Tudo o que precisam de saber", "A vossa viagem");
  const total = diasDaViagem(p.viagem.ida, p.viagem.regresso);
  const voosComCoords = p.voos.filter(v => v.origemLat !== null && v.origemLng !== null && v.destinoLat !== null && v.destinoLng !== null);
  const km = voosComCoords.reduce((s, v) => s + distanciaKm({lat: v.origemLat!, lng: v.origemLng!}, {lat: v.destinoLat!, lng: v.destinoLng!}), 0);
  const tiles: [Icone, string, string][] = [
    ["calendario", total ? String(total) : "—", "dias"],
    ["noite", total && total > 1 ? String(total - 1) : "—", "noites"],
    ["pessoas", p.viagem.viajantes ? String(p.viagem.viajantes) : "—", p.viagem.viajantes === 1 ? "viajante" : "viajantes"],
    km ? ["aviao", Math.round(km).toLocaleString("pt-PT"), "km de voo"] : ["hotel", p.viagem.regime ? "✓" : "—", p.viagem.regime || "regime"],
  ];
  const tw = (LARGURA - 2 * M - 3 * 24) / 4;
  tiles.forEach(([ic, valor, rotulo], i) => {
    const x = M + i * (tw + 24);
    retangulo(ctx, x, y, tw, 150, 22, t.cartao);
    ctx.beginPath(); ctx.arc(x + 48, y + 52, 28, 0, Math.PI * 2); ctx.fillStyle = t.c.principal; ctx.fill();
    icone(ctx, ic, x + 48, y + 52, 28, t.c.sobrePrincipal);
    ctx.fillStyle = TINTA; ctx.font = "50px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillText(valor, x + 28, y + 128, tw - 40);
    ctx.fillStyle = CINZA; ctx.font = "18px Poppins"; ctx.fillText(rotulo, x + 96, y + 60, tw - 110);
  });
  y += 190;

  const cartoes = p.voos.slice(0, 4), alturaCartao = cartoes.length > 2 ? 200 : 226;
  const espacoMapa = ALTURA - 130 - y - cartoes.length * (alturaCartao + 24) - 20;
  if (voosComCoords.length && espacoMapa > 260) {
    const area = {x: M, y, w: LARGURA - 2 * M, h: Math.min(560, espacoMapa)};
    const pontos: Ponto[] = voosComCoords.flatMap(v => [{lat: v.origemLat!, lng: v.origemLng!}, {lat: v.destinoLat!, lng: v.destinoLng!}]);
    const rotas = voosComCoords.filter((v, i, todos) => todos.findIndex(o => o.origem === v.destino && o.destino === v.origem) >= i || v.sentido === "ida");
    const arcos = rotas.flatMap(v => [arcoVoo({lat: v.origemLat!, lng: v.origemLng!}, {lat: v.destinoLat!, lng: v.destinoLng!})]);
    const e = enquadrar([...pontos, ...arcos.flat()], area.w, area.h, 0.14, 9);
    await desenharFundoMapa(ctx, area, e, 24, t.escala >= 1.5 ? 2 : 1);
    ctx.save(); ctx.beginPath(); ctx.roundRect(area.x, area.y, area.w, area.h, 24); ctx.clip();
    for (const arco of arcos) {
      const pts = arco.map(q => noMapa(q, area, e));
      ctx.strokeStyle = t.c.principalA25; ctx.lineWidth = 14; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke();
      ctx.strokeStyle = t.c.principal; ctx.lineWidth = 5; ctx.setLineDash([16, 10]); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); ctx.setLineDash([]);
      const meio = pts[Math.floor(pts.length / 2)]!, antes = pts[Math.floor(pts.length / 2) - 1]!;
      ctx.save(); ctx.translate(meio.x, meio.y); ctx.rotate(Math.atan2(meio.y - antes.y, meio.x - antes.x));
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      icone(ctx, "aviao", 0, 0, 38, t.c.principalTexto); ctx.restore();
    }
    const vistos = new Set<string>();
    for (const v of voosComCoords) for (const [codigo, cidade, lat, lng] of [[v.origem, v.origemCidade, v.origemLat, v.origemLng], [v.destino, v.destinoCidade, v.destinoLat, v.destinoLng]] as const) {
      if (vistos.has(codigo)) continue; vistos.add(codigo);
      const q = noMapa({lat: lat!, lng: lng!}, area, e);
      ctx.beginPath(); ctx.arc(q.x, q.y, 13, 0, Math.PI * 2); ctx.fillStyle = t.c.escura; ctx.fill();
      ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      const rotulo = `${codigo}${cidade ? ` · ${cidade}` : ""}`;
      ctx.font = "21px PoppinsBold"; const w = ctx.measureText(rotulo).width + 28;
      const lx = Math.min(Math.max(q.x - w / 2, area.x + 10), area.x + area.w - w - 10), ly = q.y + 22 + 44 > area.y + area.h ? q.y - 66 : q.y + 22;
      sombra(ctx, true); retangulo(ctx, lx, ly, w, 44, 22, "#fff"); sombra(ctx, false);
      ctx.fillStyle = TINTA; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(rotulo, lx + 14, ly + 23);
    }
    ctx.restore();
    y += area.h + 30;
  }
  for (const v of cartoes) { cartaoEmbarque(ctx, t, v, M, y, LARGURA - 2 * M, alturaCartao); y += alturaCartao + 24; }
  if (!cartoes.length && p.viagem.voo) {
    ctx.font = "22px Poppins"; const h = alturaParagrafo(ctx, p.viagem.voo, LARGURA - 2 * M - 120, 34, 8) + 60;
    retangulo(ctx, M, y, LARGURA - 2 * M, h, 22, t.cartao); icone(ctx, "aviao", M + 50, y + 46, 36, t.c.principal);
    ctx.fillStyle = TINTA; paragrafo(ctx, p.viagem.voo, M + 96, y + 30, LARGURA - 2 * M - 120, 34, 8);
  }
  rodape(ctx, p, n, img);
  return canvas;
}

async function alojamento(d: DadosDesenho, t: Tema, img: Image | null, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Onde vão ficar", p.viagem.hotel ? "O vosso alojamento" : "O destino");
  if (p.viagem.hotel || p.viagem.transfer || p.viagem.bagagem) {
    const h = 470, fotoW = 520;
    sombra(ctx, true); retangulo(ctx, M, y, LARGURA - 2 * M, h, 26, "#ffffff"); sombra(ctx, false);
    const foto = d.imagens.hotel ?? d.imagens.capa;
    if (foto) cobrir(ctx, foto, M, y, fotoW, h, 26); else semFoto(ctx, t, M, y, fotoW, h, 26, p.viagem.destino);
    let ty = y + 50; const tx = M + fotoW + 44, tw = LARGURA - 2 * M - fotoW - 80;
    if (p.viagem.hotel) {
      ctx.fillStyle = t.c.principalTexto; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText("ALOJAMENTO", tx, ty); ty += 16;
      ctx.fillStyle = TINTA; ctx.font = t.titulo(40); ty += paragrafo(ctx, p.viagem.hotel, tx, ty, tw, 48, 3) + 20;
    }
    for (const [ic, valor] of [["hotel", p.viagem.quarto], ["estrela", p.viagem.regime], ["transfer", p.viagem.transfer], ["mala", p.viagem.bagagem]] as [Icone, string][]) {
      if (!valor || ty > y + h - 60) continue;
      ctx.beginPath(); ctx.arc(tx + 22, ty + 20, 22, 0, Math.PI * 2); ctx.fillStyle = t.c.suave; ctx.fill();
      icone(ctx, ic, tx + 22, ty + 20, 24, t.c.principalTexto);
      ctx.fillStyle = TINTA; ctx.font = "21px Poppins";
      ty += Math.max(46, paragrafo(ctx, valor, tx + 60, ty + 6, tw - 60, 30, 2) + 16);
    }
    y += h + 50;
  }

  const locais = d.p.dias.map((dia, i) => ({dia: i + 1, nome: dia.local, lat: dia.lat, lng: dia.lng})).filter(l => l.nome && l.lat !== null && l.lng !== null);
  const unicos = locais.filter((l, i) => locais.findIndex(o => o.nome.toLowerCase() === l.nome.toLowerCase()) === i);
  if (unicos.length) {
    ctx.fillStyle = t.c.principalTexto; ctx.font = "18px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText("O MAPA DA VIAGEM", M, y); y += 20;
    const legendaH = Math.ceil(unicos.length / 2) * 46 + 20;
    const area = {x: M, y, w: LARGURA - 2 * M, h: Math.max(380, ALTURA - 140 - y - legendaH - 20)};
    const pontos = unicos.map(l => ({lat: l.lat!, lng: l.lng!}));
    if (p.extras.destinoLat !== null && p.extras.destinoLng !== null && unicos.length === 1) pontos.push({lat: p.extras.destinoLat, lng: p.extras.destinoLng});
    const e = enquadrar(pontos.length > 1 ? pontos : [...pontos, {lat: pontos[0]!.lat + 0.03, lng: pontos[0]!.lng + 0.03}, {lat: pontos[0]!.lat - 0.03, lng: pontos[0]!.lng - 0.03}], area.w, area.h, 0.16, 13);
    await desenharFundoMapa(ctx, area, e, 24, t.escala >= 1.5 ? 2 : 1);
    ctx.save(); ctx.beginPath(); ctx.roundRect(area.x, area.y, area.w, area.h, 24); ctx.clip();
    // Afasta pinos que ficariam uns em cima dos outros (locais muito próximos).
    const posicoes: {x: number; y: number}[] = [];
    for (const l of unicos) {
      const q = noMapa({lat: l.lat!, lng: l.lng!}, area, e);
      while (posicoes.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 46)) q.x += 46;
      posicoes.push(q);
    }
    ctx.strokeStyle = t.c.principalA55; ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.beginPath(); posicoes.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); ctx.setLineDash([]);
    posicoes.forEach((q, i) => {
      sombra(ctx, true);
      ctx.beginPath(); ctx.arc(q.x, q.y - 34, 26, Math.PI * 0.78, Math.PI * 2.22); ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fillStyle = t.c.principal; ctx.fill();
      sombra(ctx, false);
      ctx.beginPath(); ctx.arc(q.x, q.y - 34, 18, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.fillStyle = t.c.principalTexto; ctx.font = "20px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), q.x, q.y - 33); ctx.textAlign = "left";
    });
    ctx.restore();
    y += area.h + 26;
    unicos.forEach((l, i) => {
      const col = i % 2, x = M + col * ((LARGURA - 2 * M) / 2), ly = y + Math.floor(i / 2) * 46;
      ctx.beginPath(); ctx.arc(x + 17, ly + 17, 17, 0, Math.PI * 2); ctx.fillStyle = t.c.principal; ctx.fill();
      ctx.fillStyle = t.c.sobrePrincipal; ctx.font = "17px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), x + 17, ly + 18); ctx.textAlign = "left";
      ctx.fillStyle = TINTA; ctx.font = "20px PoppinsBold"; ctx.fillText(l.nome, x + 48, ly + 18, (LARGURA - 2 * M) / 2 - 150);
      ctx.fillStyle = CINZA; ctx.font = "18px Poppins"; ctx.textAlign = "right"; ctx.fillText(`Dia ${locais.filter(o => o.nome.toLowerCase() === l.nome.toLowerCase()).map(o => o.dia).join(", ")}`, x + (LARGURA - 2 * M) / 2 - 30, ly + 18); ctx.textAlign = "left";
    });
  }
  rodape(ctx, p, n, img);
  return canvas;
}

const MOMENTOS: [keyof Pick<TravelPlanner["dias"][number], "manha" | "tarde" | "noite">, string, Icone][] = [["manha", "Manhã", "manha"], ["tarde", "Tarde", "tarde"], ["noite", "Noite", "noite"]];

function alturaDia(ctx: SKRSContext2D, dia: TravelPlanner["dias"][number], fotoH: number): number {
  ctx.font = "21px Poppins";
  const texto = MOMENTOS.reduce((s, [k]) => s + (dia[k] ? Math.max(70, alturaParagrafo(ctx, dia[k], LARGURA - 2 * M - 210, 31, 5) + 24) : 0), 0);
  return fotoH + 110 + texto + 30;
}

function cartaoDia(ctx: SKRSContext2D, d: DadosDesenho, t: Tema, i: number, y: number, fotoH: number) {
  const {p} = d, dia = p.dias[i]!, w = LARGURA - 2 * M, h = alturaDia(ctx, dia, fotoH);
  sombra(ctx, true); retangulo(ctx, M, y, w, h, 26, "#ffffff"); sombra(ctx, false);
  const foto = d.imagens.dias[i];
  if (foto) cobrir(ctx, foto, M, y, w, fotoH, 26); else semFoto(ctx, t, M, y, w, fotoH, 26, dia.local || p.viagem.destino);
  // Etiqueta "DIA X" sobre a fotografia.
  retangulo(ctx, M + 28, y + 28, 150, 104, 18, p.estilo === "moderno" ? t.c.escura : t.c.principal);
  ctx.fillStyle = p.estilo === "moderno" ? t.c.sobreEscura : t.c.sobrePrincipal; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = "18px PoppinsBold"; ctx.fillText("DIA", M + 103, y + 62);
  ctx.font = "50px PoppinsBold"; ctx.fillText(String(i + 1), M + 103, y + 116);
  ctx.textAlign = "left";
  const data = p.viagem.ida ? dataPlanner(somarDiasPlanner(p.viagem.ida, i), {weekday: "long", day: "numeric", month: "long"}) : "";
  if (data) {
    ctx.font = "19px PoppinsBold"; const dw = ctx.measureText(data).width + 36;
    retangulo(ctx, M + w - dw - 28, y + 28, dw, 46, 23, "rgba(255,255,255,0.92)");
    ctx.fillStyle = TINTA; ctx.textBaseline = "middle"; ctx.fillText(data, M + w - dw - 10, y + 52);
  }
  let ty = y + fotoH + 36;
  ctx.fillStyle = TINTA; ctx.font = t.titulo(42); ctx.textBaseline = "top";
  ctx.fillText(t.maiusculas ? (dia.titulo || `Dia ${i + 1}`).toUpperCase() : dia.titulo || `Dia ${i + 1}`, M + 40, ty, w - 80);
  if (dia.local) { ctx.font = "19px Poppins"; ctx.fillStyle = t.c.principalTexto; icone(ctx, "pin", M + 52, ty + 76, 22, t.c.principalTexto); ctx.fillText(dia.local, M + 72, ty + 64, w - 120); }
  ty += 100;
  for (const [k, rotulo, ic] of MOMENTOS) {
    if (!dia[k]) continue;
    ctx.beginPath(); ctx.arc(M + 72, ty + 26, 30, 0, Math.PI * 2); ctx.fillStyle = t.c.suave; ctx.fill();
    icone(ctx, ic, M + 72, ty + 26, 30, t.c.principalTexto);
    ctx.fillStyle = t.c.principalTexto; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "top"; ctx.fillText(rotulo.toUpperCase(), M + 124, ty);
    ctx.fillStyle = TINTA; ctx.font = "21px Poppins";
    ty += Math.max(70, paragrafo(ctx, dia[k], M + 124, ty + 26, w - 210, 31, 5) + 24) ;
  }
  return h;
}

function paginasRoteiro(d: DadosDesenho, t: Tema, img: Image | null, primeiro: number) {
  const paginas = [];
  const medidor = createCanvas(10, 10).getContext("2d");
  // Texto de cada dia sem a fotografia: a fotografia estica ou encolhe para encher a página.
  const texto = d.p.dias.map(dia => alturaDia(medidor, dia, 0));
  const limite = ALTURA - 120, intervalo = 36;
  let i = 0, n = primeiro;
  while (i < d.p.dias.length) {
    const {canvas, ctx} = novaPagina(t);
    let y = i === 0 ? cabecalho(ctx, t, "Dia a dia", "O vosso roteiro") : M;
    const livre = limite - y;
    const doisCabem = i + 1 < d.p.dias.length && texto[i]! + texto[i + 1]! + intervalo + 2 * 240 <= livre;
    const dias = doisCabem ? [i, i + 1] : [i];
    const fotoH = Math.max(220, Math.min(doisCabem ? 470 : 820, (livre - dias.reduce((s, k) => s + texto[k]!, 0) - (dias.length - 1) * intervalo) / dias.length));
    for (const k of dias) y += cartaoDia(ctx, d, t, k, y, fotoH) + intervalo;
    i += dias.length;
    rodape(ctx, d.p, n++, img);
    paginas.push(canvas);
  }
  return paginas;
}

const MESES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function grafClima(ctx: SKRSContext2D, p: TravelPlanner, x: number, y: number, w: number, h: number, t: Tema) {
  retangulo(ctx, x, y, w, h, 24, t.cartao);
  ctx.fillStyle = t.c.principalTexto; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillText("CLIMA AO LONGO DO ANO", x + 34, y + 46);
  const mesesViagem = new Set<number>();
  if (p.viagem.ida) { mesesViagem.add(Number(p.viagem.ida.slice(5, 7)) - 1); if (p.viagem.regresso) mesesViagem.add(Number(p.viagem.regresso.slice(5, 7)) - 1); }
  const clima = p.extras.clima;
  const viagem = [...mesesViagem].map(m => clima[m]!).filter(Boolean);
  if (viagem.length) {
    const max = Math.round(viagem.reduce((s, c) => s + c.max, 0) / viagem.length), min = Math.round(viagem.reduce((s, c) => s + c.min, 0) / viagem.length);
    ctx.textAlign = "right"; ctx.fillStyle = TINTA; ctx.font = "34px PoppinsBold"; ctx.fillText(`${max}° / ${min}°`, x + w - 34, y + 52);
    ctx.font = "16px Poppins"; ctx.fillStyle = CINZA; ctx.fillText("média durante a viagem", x + w - 34, y + 76); ctx.textAlign = "left";
  }
  // Colunas da mínima à máxima, numa escala que começa abaixo da mínima do ano — as diferenças entre meses ficam visíveis.
  const topo = Math.max(...clima.map(c => c.max)) + 2, base = Math.min(...clima.map(c => c.min)) - 6;
  const gx = x + 40, gy = y + 116, gw = w - 80, gh = h - 200, coluna = gw / 12;
  const yDe = (v: number) => gy + gh - (v - base) / (topo - base) * gh;
  clima.forEach((c, m) => {
    const cx = gx + m * coluna + coluna / 2, destaque = mesesViagem.has(m);
    if (destaque) retangulo(ctx, gx + m * coluna + 3, gy - 34, coluna - 6, gh + 84, 14, t.c.destaqueFundo);
    retangulo(ctx, cx - 17, yDe(c.max), 34, gy + gh - yDe(c.max), 10, destaque ? t.c.destaque : t.c.barraMax);
    retangulo(ctx, cx - 17, yDe(c.min), 34, gy + gh - yDe(c.min), 10, destaque ? t.c.destaqueEscuro : t.c.barraMin);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = destaque ? TINTA : CINZA; ctx.font = destaque ? "17px PoppinsBold" : "16px Poppins";
    ctx.fillText(`${Math.round(c.max)}°`, cx, yDe(c.max) - 10);
    ctx.font = destaque ? "17px PoppinsBold" : "16px PoppinsBold"; ctx.fillText(MESES[m]!, cx, gy + gh + 34);
  });
  ctx.textAlign = "left";
  retangulo(ctx, x + 34, y + h - 38, 18, 18, 4, t.c.barraMax); retangulo(ctx, x + 196, y + h - 38, 18, 18, 4, t.c.barraMin);
  ctx.font = "15px Poppins"; ctx.fillStyle = CINZA; ctx.textBaseline = "middle";
  ctx.fillText("máxima", x + 60, y + h - 28); ctx.fillText("mínima", x + 222, y + h - 28);
  ctx.textAlign = "right"; ctx.fillText("Temperaturas médias aproximadas", x + w - 34, y + h - 28); ctx.textAlign = "left";
}

function relogios(ctx: SKRSContext2D, t: Tema, fuso: number, x: number, y: number) {
  const desenhar = (cx: number, horas: number, rotulo: string) => {
    ctx.beginPath(); ctx.arc(cx, y, 40, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = t.c.principal; ctx.lineWidth = 4; ctx.stroke();
    const ah = ((horas % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + Math.cos(ah) * 22, y + Math.sin(ah) * 22); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y - 32); ctx.stroke();
    ctx.fillStyle = CINZA; ctx.font = "15px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(rotulo, cx, y + 50); ctx.textAlign = "left";
  };
  desenhar(x, 12, "LISBOA 12h");
  const destino = ((12 + fuso) % 24 + 24) % 24;
  desenhar(x + 120, destino, `DESTINO ${Math.round(destino * 10) / 10}h`.replace(".", ","));
}

function cartaoDica(ctx: SKRSContext2D, dica: DicaPlanner, x: number, y: number, w: number, t: Tema, desenhar: boolean): number {
  ctx.font = "19px Poppins";
  const h = 110 + alturaParagrafo(ctx, dica.texto, w - 60, 29, 14) + 20;
  if (!desenhar) return h;
  retangulo(ctx, x, y, w, h, 22, dica.sensivel ? t.c.destaqueSuave : t.cartao, dica.sensivel ? t.c.destaque : undefined);
  ctx.beginPath(); ctx.arc(x + 54, y + 52, 28, 0, Math.PI * 2); ctx.fillStyle = dica.sensivel ? t.c.destaque : t.c.principal; ctx.fill();
  icone(ctx, ICONE_DICA[dica.tema], x + 54, y + 52, 28, dica.sensivel ? t.c.sobreDestaque : t.c.sobrePrincipal);
  ctx.fillStyle = TINTA; ctx.font = "22px PoppinsBold"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  paragrafo(ctx, dica.titulo, x + 98, y + 40, w - 120, 26, 2);
  ctx.font = "19px Poppins"; ctx.fillStyle = "#2a2a2a";
  paragrafo(ctx, dica.texto, x + 30, y + 100, w - 60, 29, 14);
  return h;
}

function paginasDicas(d: DadosDesenho, t: Tema, img: Image | null, primeiro: number) {
  const {p} = d, paginas = [];
  const dicas = p.dicas.filter(x => x.texto);
  let n = primeiro, k = 0, primeira = true;
  const medidor = createCanvas(10, 10).getContext("2d");
  const colW = (LARGURA - 2 * M - 30) / 2;
  while (primeira || k < dicas.length) {
    const {canvas, ctx} = novaPagina(t);
    let topo = primeira ? cabecalho(ctx, t, "Antes de partir", "Dicas para a viagem") : M;
    if (primeira) {
      // Faixa de informação rápida.
      const info: [Icone, string, string][] = [["moeda", "Moeda", p.extras.moeda], ["lingua", "Língua", p.extras.lingua], ["tomada", "Tomadas", p.extras.tomada]].filter(([, , v]) => v) as [Icone, string, string][];
      const temFuso = p.extras.fuso !== null;
      if (info.length || temFuso) {
        const larguraInfo = temFuso ? LARGURA - 2 * M - 300 : LARGURA - 2 * M;
        retangulo(ctx, M, topo, LARGURA - 2 * M, 150, 24, t.cartao);
        const cw = larguraInfo / Math.max(1, info.length);
        info.forEach(([ic, rotulo, valor], i) => {
          const x = M + i * cw + 30;
          ctx.beginPath(); ctx.arc(x + 26, topo + 75, 26, 0, Math.PI * 2); ctx.fillStyle = t.c.principal; ctx.fill(); icone(ctx, ic, x + 26, topo + 75, 26, t.c.sobrePrincipal);
          ctx.fillStyle = CINZA; ctx.font = "15px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText(rotulo.toUpperCase(), x + 66, topo + 66);
          ctx.fillStyle = TINTA; ctx.font = "21px PoppinsBold"; paragrafo(ctx, valor, x + 66, topo + 74, cw - 100, 26, 2);
        });
        if (temFuso) relogios(ctx, t, p.extras.fuso!, LARGURA - M - 220, topo + 62);
        topo += 180;
      }
      if (p.extras.clima.length === 12) { grafClima(ctx, p, M, topo, LARGURA - 2 * M, 380, t); topo += 410; }
      primeira = false;
    }
    const colunas = [topo, topo], limite = ALTURA - 120;
    while (k < dicas.length) {
      const c = colunas[0]! <= colunas[1]! ? 0 : 1, h = cartaoDica(medidor, dicas[k]!, 0, 0, colW, t, false);
      if (colunas[c]! + h > limite && colunas[c]! > topo) break;
      cartaoDica(ctx, dicas[k]!, M + c * (colW + 30), colunas[c]!, colW, t, true);
      colunas[c] = colunas[c]! + h + 26; k++;
    }
    rodape(ctx, p, n++, img);
    paginas.push(canvas);
  }
  return paginas;
}

function contactos(d: DadosDesenho, t: Tema, img: Image | null, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Estamos sempre convosco", "Contactos");
  if (d.consultor) {
    sombra(ctx, true); retangulo(ctx, M, y, LARGURA - 2 * M, 230, 26, "#ffffff"); sombra(ctx, false);
    ctx.beginPath(); ctx.arc(M + 110, y + 115, 72, 0, Math.PI * 2); ctx.fillStyle = t.c.principal; ctx.fill();
    ctx.fillStyle = t.c.sobrePrincipal; ctx.font = "58px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(d.consultor.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase(), M + 110, y + 118); ctx.textAlign = "left";
    ctx.fillStyle = t.c.principalTexto; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText("O VOSSO CONSULTOR DE VIAGENS", M + 220, y + 74);
    ctx.fillStyle = TINTA; ctx.font = t.titulo(44); ctx.fillText(d.consultor.nome, M + 220, y + 128, LARGURA - 2 * M - 260);
    icone(ctx, "email", M + 236, y + 172, 26, t.c.principalTexto); ctx.font = "22px Poppins"; ctx.fillStyle = "#333"; ctx.fillText(d.consultor.email, M + 266, y + 180);
    y += 270;
  }
  if (p.emergencia.texto) {
    ctx.font = "21px Poppins"; const h = alturaParagrafo(ctx, p.emergencia.texto, LARGURA - 2 * M - 80, 32, 10) + 120;
    retangulo(ctx, M, y, LARGURA - 2 * M, h, 24, t.c.destaqueSuave, t.c.destaque);
    ctx.beginPath(); ctx.arc(M + 58, y + 56, 28, 0, Math.PI * 2); ctx.fillStyle = t.c.destaque; ctx.fill(); icone(ctx, "telefone", M + 58, y + 56, 28, t.c.sobreDestaque);
    ctx.fillStyle = TINTA; ctx.font = "24px PoppinsBold"; ctx.textBaseline = "middle"; ctx.fillText("Emergência no destino", M + 104, y + 56);
    ctx.font = "21px Poppins"; paragrafo(ctx, p.emergencia.texto, M + 40, y + 102, LARGURA - 2 * M - 80, 32, 10);
    y += h + 30;
  }
  ctx.font = "19px Poppins"; ctx.fillStyle = CINZA;
  y += paragrafo(ctx, "Confirmem os requisitos de entrada, vistos e vacinas junto das autoridades competentes e da embaixada do país de destino antes de partir. Levem cópia dos documentos de viagem e do seguro.", M, y, LARGURA - 2 * M, 29) + 40;
  // Despedida com fotografia.
  const fotoY = y, fotoH = Math.min(1000, ALTURA - 130 - fotoY);
  if (fotoH > 260) {
    // Uma fotografia do meio da viagem; a da capa já abriu o documento.
    const comFoto = d.imagens.dias.filter(Boolean);
    const foto = comFoto[Math.floor(comFoto.length / 2)] ?? d.imagens.capa;
    if (foto) cobrir(ctx, foto, M, fotoY, LARGURA - 2 * M, fotoH, 26); else semFoto(ctx, t, M, fotoY, LARGURA - 2 * M, fotoH, 26, "");
    ctx.save(); ctx.beginPath(); ctx.roundRect(M, fotoY, LARGURA - 2 * M, fotoH, 26); ctx.clip();
    const g = ctx.createLinearGradient(0, fotoY, 0, fotoY + fotoH); g.addColorStop(0.3, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = g; ctx.fillRect(M, fotoY, LARGURA - 2 * M, fotoH); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = t.titulo(84); ctx.textBaseline = "alphabetic";
    ctx.fillText(t.maiusculas ? "BOA VIAGEM!" : "Boa viagem!", M + 50, fotoY + fotoH - 60);
  }
  rodape(ctx, p, n, img);
  return canvas;
}

/** Todas as páginas, como JPEG. */
export async function desenharPlanner(d: DadosDesenho): Promise<Buffer[]> {
  registarFontes();
  const t = tema(d.p.estilo, d.marca, d.escala ?? 2), img = await logo();
  const paginas = [capa(d, t, img)];
  paginas.push(await viagem(d, t, img, paginas.length + 1));
  paginas.push(await alojamento(d, t, img, paginas.length + 1));
  if (d.p.dias.length) paginas.push(...paginasRoteiro(d, t, img, paginas.length + 1));
  if (d.p.dicas.some(x => x.texto) || d.p.extras.clima.length) paginas.push(...paginasDicas(d, t, img, paginas.length + 1));
  paginas.push(contactos(d, t, img, paginas.length + 1));
  // Sem subamostragem de cor: o texto fica nítido no JPEG.
  return Promise.all(paginas.map(async c => t.escala >= 1.5
    ? sharp(await c.encode("png")).jpeg({quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true}).toBuffer()
    : c.encode("jpeg", 82)));
}
