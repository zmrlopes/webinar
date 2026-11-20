import assert from "node:assert/strict";
import {createCanvas, Image} from "@napi-rs/canvas";
import sharp from "sharp";
import {comprimirImagemReserva} from "../src/lib/reservas-canvas";
import {imagemReserva} from "../src/lib/reservas";

// Imagem detalhada: o PNG ultrapassa o limite mesmo com o lado maior a 1500 px.
const pixels = Buffer.alloc(1500 * 1500 * 3);
let estado = 123456789;
for (let i = 0; i < pixels.length; i++) {
  estado ^= estado << 13; estado ^= estado >>> 17; estado ^= estado << 5;
  pixels[i] = estado & 255;
}
const png = await sharp(pixels, {raw: {width: 1500, height: 1500, channels: 3}}).png().toBuffer();
const ficheiro = new File([new Uint8Array(png)], "referencia.png", {type: "image/png"});
const transparente = await sharp({create: {width: 100, height: 200, channels: 4, background: "#00000000"}}).png().toBuffer();
const ficheiroTransparente = new File([new Uint8Array(transparente)], "transparente.png", {type: "image/png"});
const originais = new Map(["document", "Image"].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
const criarURL = URL.createObjectURL, revogarURL = URL.revokeObjectURL;
let modo: "normal" | "sem-webp" | "so-jpeg" | "reduzir" | "invalido" = "normal";
let revogacoes = 0;
const tentativas: {tipo: string; lado: number}[] = [];

try {
  Object.defineProperty(globalThis, "Image", {configurable: true, value: Image});
  URL.createObjectURL = f => `data:image/png;base64,${(f === ficheiroTransparente ? transparente : png).toString("base64")}`;
  URL.revokeObjectURL = () => {revogacoes++;};
  Object.defineProperty(globalThis, "document", {configurable: true, value: {
    createElement: (tag: string) => {
      assert.equal(tag, "canvas");
      const canvas = createCanvas(1, 1);
      return {
        get width() {return canvas.width;}, set width(v: number) {canvas.width = v;},
        get height() {return canvas.height;}, set height(v: number) {canvas.height = v;},
        getContext: () => canvas.getContext("2d"),
        toDataURL: (tipo: "image/webp" | "image/jpeg", qualidade: number) => {
          tentativas.push({tipo, lado: Math.max(canvas.width, canvas.height)});
          if (modo === "invalido" || (modo === "reduzir" && Math.max(canvas.width, canvas.height) > 1080)) return "data:,";
          if (modo === "so-jpeg" && tipo === "image/webp") return "data:,";
          // Comportamento do canvas quando o navegador não consegue codificar WebP.
          if (tipo === "image/webp" && modo === "sem-webp") return canvas.toDataURL("image/png");
          return canvas.toDataURL(tipo, qualidade);
        },
      };
    },
  }});
  async function comprimir(f = ficheiro) {
    tentativas.length = 0;
    const resultado = await comprimirImagemReserva(f);
    assert(resultado.length <= 1_100_000);
    assert.equal(imagemReserva(resultado), resultado, "O servidor aceita o formato e tamanho preparados");
    return sharp(Buffer.from(resultado.split(",")[1]!, "base64"));
  }

  const normal = await comprimir();
  assert((await normal.metadata()).width! <= 1500);
  assert.equal((await normal.metadata()).format, "webp");
  modo = "sem-webp";
  const fallback = await comprimir();
  assert.equal((await fallback.metadata()).format, "jpeg", "Um PNG pesado devolvido em vez de WebP usa JPEG");
  const webp = tentativas.filter(t => t.tipo === "image/webp");
  assert.equal(webp.length, new Set(webp.map(t => t.lado)).size, "Não repete qualidades ignoradas pelo codificador PNG");
  modo = "reduzir";
  const reduzida = await comprimir();
  assert.equal((await reduzida.metadata()).width, 1080, "Reduz as dimensões quando a exportação maior falha");
  assert.equal((await reduzida.metadata()).height, 1080);
  const pequena = await comprimir(ficheiroTransparente);
  assert.equal((await pequena.metadata()).width, 100, "Não amplia imagens pequenas");
  assert.equal((await pequena.metadata()).height, 200);
  assert.equal((await pequena.metadata()).hasAlpha, true, "Preserva a transparência em formatos que a suportam");
  modo = "so-jpeg";
  const opaca = await comprimir(ficheiroTransparente);
  assert.equal((await opaca.metadata()).format, "jpeg");
  assert((await opaca.raw().toBuffer()).every(c => c >= 254), "A alternativa JPEG usa branco nas zonas transparentes");
  modo = "invalido";
  await assert.rejects(() => comprimirImagemReserva(ficheiro), /Não foi possível reduzir/);
  assert.equal(revogacoes, 6, "Liberta o recurso local também em erro");
  await assert.rejects(() => comprimirImagemReserva(new File(["PDF"], "ref.pdf", {type: "application/pdf"})), /PNG, JPG ou WebP/);
  await assert.rejects(() => comprimirImagemReserva(new File([new Uint8Array(15_000_001)], "ref.png", {type: "image/png"})), /15 MB/);
  console.log("Reservas upload: compressão real, navegador sem WebP, redução, proporções, transparência, limites e limpeza OK.");
} finally {
  URL.createObjectURL = criarURL; URL.revokeObjectURL = revogarURL;
  for (const [k, descriptor] of originais) {
    if (descriptor) Object.defineProperty(globalThis, k, descriptor);
    else Reflect.deleteProperty(globalThis, k);
  }
}
