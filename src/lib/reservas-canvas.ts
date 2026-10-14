import { dimensoesReserva, textoElementoReserva, type ElementoReserva, type MaterialReserva } from "./reservas";

const imagens = new Map<string, Promise<HTMLImageElement>>();
let fontesProntas: Promise<void> | undefined;
async function carregarFontes() {
  if (!fontesProntas) fontesProntas = Promise.all([
    new FontFace("ReservaCondensada", "url(/fonts/BebasNeue-Regular.ttf)"),
    new FontFace("ReservaGeometrica", "url(/fonts/Montserrat-Variable.ttf)", {weight: "100 900"}),
  ].map(async fonte => {(document.fonts as FontFaceSet & {add(fonte: FontFace): void}).add(await fonte.load());})).then(() => {}).catch(erro => {fontesProntas = undefined; throw new Error(`Não foi possível carregar as fontes do modelo: ${erro instanceof Error ? erro.message : "tenta novamente"}`);});
  await fontesProntas;
}
function carregarImagem(src: string): Promise<HTMLImageElement> {
  const guardada = imagens.get(src);
  if (guardada) return guardada;
  const promessa = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {imagens.delete(src); reject(new Error("Não foi possível carregar uma das imagens."));};
    img.src = src;
  });
  if (imagens.size > 25) imagens.clear();
  imagens.set(src, promessa);
  return promessa;
}
function desenharImagem(ctx: CanvasRenderingContext2D, img: HTMLImageElement, e: ElementoReserva, x: number, y: number, w: number, h: number) {
  const c = e.recorte;
  let sx = c ? c.x / 100 * img.width : 0, sy = c ? c.y / 100 * img.height : 0;
  let sw = c ? c.w / 100 * img.width : img.width, sh = c ? c.h / 100 * img.height : img.height;
  const proporcao = w / h;
  if (sw / sh > proporcao) {const nova = sh * proporcao; sx += (sw - nova) / 2; sw = nova;}
  else {const nova = sw / proporcao; sy += (sh - nova) / 2; sh = nova;}
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function linhasTexto(ctx: CanvasRenderingContext2D, texto: string, w: number): string[] {
  return texto.split("\n").flatMap(paragrafo => {
    const linhas: string[] = []; let linha = "";
    for (const palavra of paragrafo.split(/\s+/)) {
      const nova = linha ? `${linha} ${palavra}` : palavra;
      if (ctx.measureText(nova).width > w && linha) {linhas.push(linha); linha = palavra;} else linha = nova;
    }
    linhas.push(linha); return linhas;
  });
}
function desenharIcone(ctx: CanvasRenderingContext2D, e: ElementoReserva, x: number, y: number, w: number, h: number) {
  const paths = {
    aviao: "M12 3v8l8 5v2l-8-2v5l3 2H9l3-2v-5l-8 2v-2l8-5Z",
    hotel: "M3 21V4h18v17M1 21h22M6 8h3m6 0h3M6 12h3m6 0h3M9 21v-5h6v5",
    refeicao: "M5 2v6m3-6v6m3-6v6M5 6h6v3a3 3 0 0 1-6 0ZM8 12v10M19 22V2c-5 0-5 11 0 11",
    mala: "M8 5V2h8v3M4 5h16v16H4ZM8 5v16M16 5v16M7 21v2m10-2v2",
    transfer: "M4 4h16v15H4ZM4 12h16M7 4V2h10v2M7 19v3m10-3v3M7 16h1m8 0h1",
    calendario: "M3 5h18v17H3ZM7 2v6m10-6v6M3 11h18M7 15h2m6 0h2M7 18h2",
    ligacao: "M10 13a5 5 0 0 0 7 .5l4-4a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-4 4a5 5 0 0 0 7 7l2-2",
  };
  const tamanho = Math.min(w, h); ctx.save(); ctx.translate(x + (w-tamanho)/2, y + (h-tamanho)/2); ctx.scale(tamanho/26, tamanho/26);
  ctx.strokeStyle = e.cor; ctx.fillStyle = e.cor; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const p = new Path2D(paths[e.icone!]); if (e.icone === "aviao") ctx.fill(p); else ctx.stroke(p); ctx.restore();
}
export async function desenharReserva(canvas: HTMLCanvasElement, material: MaterialReserva, exemplo = true): Promise<void> {
  await carregarFontes();
  const {largura, altura} = dimensoesReserva(material.formato);
  // Carrega tudo antes de desenhar; a mesma função produz a pré-visualização e o PNG final.
  const fontes = material.elementos.filter(e => e.tipo === "foto" || e.tipo === "grafico" && (!e.icone || e.imagem)).map(e => e.imagem || (e.recorte ? material.referencia : "")).filter(Boolean);
  const carregadas = new Map<string, HTMLImageElement>();
  await Promise.all([...new Set([...fontes, "/icligo-logo.png"])].map(async src => carregadas.set(src, await carregarImagem(src))));
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("O navegador não suporta a criação de imagens.");
  canvas.width = largura; canvas.height = altura;
  const fundo = ctx.createLinearGradient(0, 0, 0, altura);
  fundo.addColorStop(0, material.fundo); fundo.addColorStop(1, material.fundoFinal);
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, largura, altura);
  for (const e of material.elementos.filter(e => e.tipo !== "marca")) {
    const x = e.x / 100 * largura, y = e.y / 100 * altura, w = e.w / 100 * largura, h = e.h / 100 * altura;
    ctx.save(); ctx.globalAlpha = e.opacidade;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(e.raio / 100 * largura, w / 2, h / 2)); ctx.clip();
    if (e.tipo === "forma") {
      ctx.fillStyle = e.cor;
      if (e.corFinal) {
        const gradiente = ctx.createLinearGradient(x, y, x, y + h);
        const rgba = (cor: string, alfa: number) => `rgba(${parseInt(cor.slice(1,3),16)},${parseInt(cor.slice(3,5),16)},${parseInt(cor.slice(5,7),16)},${alfa})`;
        gradiente.addColorStop(0, rgba(e.cor, e.opacidade)); gradiente.addColorStop(1, rgba(e.corFinal, e.opacidadeFinal ?? 1));
        ctx.globalAlpha = 1; ctx.fillStyle = gradiente;
      }
      if (e.figura === "elipse") {ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();}
      else ctx.fillRect(x, y, w, h);
    } else if (e.tipo === "foto" || e.tipo === "grafico") {
      if (e.tipo === "grafico" && e.icone && !e.imagem) {desenharIcone(ctx, e, x, y, w, h); ctx.restore(); continue;}
      const src = e.imagem || (e.recorte ? material.referencia : ""), img = carregadas.get(src);
      if (img) desenharImagem(ctx, img, e.imagem ? {...e, recorte: undefined} : e, x, y, w, h);
      else if (exemplo) {ctx.fillStyle = "#ffffff18"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.textAlign = "center"; ctx.fillText("Escolhe uma fotografia", x + w / 2, y + h / 2, w - 16);}
    } else {
      const texto = textoElementoReserva(e, material.dados, exemplo);
      const fonte = e.fonte === "serif" ? "Georgia, serif" : e.fonte === "condensada" ? "ReservaCondensada, sans-serif" : e.fonte === "geometrica" ? "ReservaGeometrica, sans-serif" : "Arial, sans-serif";
      let tamanho = e.tamanho / 100 * largura, linhas: string[] = [];
      let subida = 0, descida = 0, alturaTexto = 0;
      do {
        ctx.font = `${e.fonte === "condensada" ? "400 " : e.negrito ? e.fonte === "geometrica" ? "800 " : "bold " : "400 "}${tamanho}px ${fonte}`;
        linhas = linhasTexto(ctx, texto, w);
        const medidas = linhas.map(l => ctx.measureText(l || "Ag"));
        subida = Math.max(...medidas.map(m => m.actualBoundingBoxAscent)); descida = Math.max(...medidas.map(m => m.actualBoundingBoxDescent));
        alturaTexto = subida + descida + (linhas.length - 1) * tamanho * 1.18;
        if (alturaTexto <= h && linhas.every(l => ctx.measureText(l).width <= w)) break;
        tamanho -= 1;
      } while (tamanho > 7);
      ctx.fillStyle = e.cor; ctx.textAlign = e.alinhar; ctx.textBaseline = "alphabetic";
      if (e.sombra) {ctx.shadowColor = "#00000099"; ctx.shadowBlur = Math.max(2, tamanho * .09); ctx.shadowOffsetY = Math.max(1, tamanho * .035);}
      const tx = e.alinhar === "left" ? x : e.alinhar === "right" ? x + w : x + w / 2;
      const ty = y + subida + Math.max(0, e.vertical === "top" ? 0 : e.vertical === "bottom" ? h - alturaTexto : (h - alturaTexto) / 2);
      linhas.forEach((linha, i) => ctx.fillText(linha, tx, ty + i * tamanho * 1.18, w));
    }
    ctx.restore();
  }
  // Marca canónica sempre por cima, sem aplicar cores, recortes ou texto do editor.
  const marca = material.elementos.find(e => e.tipo === "marca");
  if (marca) {
    const x = marca.x / 100 * largura, y = marca.y / 100 * altura, w = marca.w / 100 * largura, h = marca.h / 100 * altura;
    if (!material.marcaEstilo || material.marcaEstilo === "cartao") {ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(12, h / 5)); ctx.fill();}
    const icon = carregadas.get("/icligo-logo.png")!, tamanho = Math.min(h * .76, w * .22);
    ctx.drawImage(icon, x + h * .12, y + (h - tamanho) / 2, tamanho, tamanho);
    const tx = x + h * .12 + tamanho + w * .04, espaco = x + w - tx - 8;
    ctx.fillStyle = material.marcaEstilo === "clara" ? "#ffffff" : "#ff6b4a"; ctx.font = `bold ${Math.min(h * .34, espaco / 4)}px Arial`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("icligo", tx, y + h * .38, espaco);
    ctx.fillStyle = material.marcaEstilo === "clara" ? "#ffffff" : "#344153"; ctx.font = `${Math.min(h * .16, espaco / 10)}px Arial`; ctx.fillText("travel partners", tx, y + h * .71, espaco);
  }
  // Atribuições das imagens sugeridas acompanham também o ficheiro exportado.
  const creditos = [...new Set(material.elementos.map(e => e.credito).filter(Boolean))].join(" · ");
  if (creditos) {ctx.fillStyle = "#ffffff"; ctx.fillRect(0, altura - 28, largura, 28); ctx.fillStyle = "#333333"; ctx.font = "11px Arial"; ctx.textAlign = "center"; ctx.fillText(creditos, largura / 2, altura - 10, largura - 20);}
}

export async function comprimirImagemReserva(ficheiro: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(ficheiro.type)) throw new Error("Escolhe uma imagem PNG, JPG ou WebP.");
  if (ficheiro.size > 15_000_000) throw new Error("A imagem deve ter menos de 15 MB.");
  const url = URL.createObjectURL(ficheiro);
  try {
    const img = await carregarImagem(url); const escala = Math.min(1, 1500 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
    const ctx = c.getContext("2d"); if (!ctx) throw new Error("Não foi possível preparar a imagem.");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const qualidade of [.86, .72, .55]) {const resultado = c.toDataURL("image/webp", qualidade); if (resultado.length <= 1_100_000) return resultado;}
    throw new Error("A imagem é demasiado complexa. Escolhe uma versão mais pequena.");
  } finally {URL.revokeObjectURL(url); imagens.delete(url);}
}
export async function pngReserva(material: MaterialReserva): Promise<Blob> {
  const canvas = document.createElement("canvas"); await desenharReserva(canvas, material, false);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Não foi possível criar o PNG.")), "image/png"));
}
