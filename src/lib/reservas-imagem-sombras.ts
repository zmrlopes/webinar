import {ErroReserva, type CaixaReserva} from "./reservas";

/** Camadas de desenho independentes da fotografia e das sombras das letras. */
export interface SombreadoPublicacao extends CaixaReserva {
  cor: string;
  direcao: "baixo" | "cima" | "esquerda" | "direita" | "radial";
  paragens: {posicao: number; opacidade: number}[];
}
const direcoes = ["baixo", "cima", "esquerda", "direita", "radial"] as const;
export const esquemaSombreadosPublicacao = {
  type: "array", maxItems: 8, items: {
    type: "object", additionalProperties: false,
    properties: {
      x: {type: "number", minimum: 0, maximum: 100}, y: {type: "number", minimum: 0, maximum: 100}, w: {type: "number", minimum: 0, maximum: 100}, h: {type: "number", minimum: 0, maximum: 100},
      cor: {type: "string"}, direcao: {type: "string", enum: direcoes},
      paragens: {type: "array", minItems: 2, maxItems: 8, items: {
        type: "object", additionalProperties: false,
        properties: {posicao: {type: "number", minimum: 0, maximum: 1}, opacidade: {type: "number", minimum: 0, maximum: 1}},
        required: ["posicao", "opacidade"],
      }},
    }, required: ["x", "y", "w", "h", "cor", "direcao", "paragens"],
  },
};
export const instrucaoSombreadosPublicacao = `Identifica também os sombreados/gradientes gráficos por baixo dos textos como camadas independentes da fotografia: sombreados=[{x,y,w,h,cor:"#000000",direcao:"baixo",paragens:[{posicao:0,opacidade:0},{posicao:1,opacidade:0.8}]}]. Coordenadas em PERCENTAGENS da imagem inteira (0–100); posições e opacidades das paragens entre 0 e 1, com primeira posição 0 e última 1. Direção baixo/cima/esquerda/direita indica o sentido do gradiente; radial vai do centro até à borda de uma elipse. Para uma faixa uniforme usa opacidade igual nas duas paragens. Inclui véus escuros, faixas translúcidas e manchas suaves de contraste, preservando posição, cor e intensidade aproximada. Não confundas sombras naturais da fotografia, objetos escuros, cartões opacos, marca ou a pequena sombra das próprias letras com estes sombreados. Não inventes sombreados onde não existem. Devolve [] se não houver. Máximo 8 camadas e 8 paragens por camada.`;

export function validarSombreadosPublicacao(valor: unknown): SombreadoPublicacao[] {
  const erro = () => new ErroReserva("Não foi possível separar os sombreados da publicação. Tenta abrir o editor novamente.", 422);
  if (!Array.isArray(valor) || valor.length > 8) throw erro();
  return valor.map(v => {
    if (!v || ![v.x,v.y,v.w,v.h].every(Number.isFinite) || v.x < 0 || v.y < 0 || v.w <= 0 || v.h <= 0 || v.x+v.w > 100.1 || v.y+v.h > 100.1 || !/^#[0-9a-f]{6}$/i.test(v.cor) || !direcoes.includes(v.direcao) || !Array.isArray(v.paragens) || v.paragens.length < 2 || v.paragens.length > 8) throw erro();
    const paragens = v.paragens.map((p: SombreadoPublicacao["paragens"][number], i: number) => {
      if (!p || !Number.isFinite(p.posicao) || !Number.isFinite(p.opacidade) || p.posicao < 0 || p.posicao > 1 || p.opacidade < 0 || p.opacidade > 1 || (i > 0 && p.posicao <= v.paragens[i-1].posicao)) throw erro();
      return {posicao: p.posicao, opacidade: p.opacidade};
    });
    if (paragens[0].posicao !== 0 || paragens.at(-1)!.posicao !== 1) throw erro();
    return {x:v.x,y:v.y,w:Math.min(v.w,100-v.x),h:Math.min(v.h,100-v.y),cor:v.cor,direcao:v.direcao,paragens};
  });
}

export function desenharSombreadosPublicacao(ctx: CanvasRenderingContext2D, camadas: SombreadoPublicacao[], largura: number, altura: number) {
  for (const c of camadas) {
    ctx.save();
    // Coordenadas locais permitem também gradientes radiais elípticos.
    ctx.translate(c.x/100*largura,c.y/100*altura);
    ctx.scale(c.w/100*largura,c.h/100*altura);
    const gradiente = c.direcao === "radial" ? ctx.createRadialGradient(.5,.5,0,.5,.5,.5)
      : c.direcao === "cima" ? ctx.createLinearGradient(0,1,0,0)
      : c.direcao === "esquerda" ? ctx.createLinearGradient(1,0,0,0)
      : c.direcao === "direita" ? ctx.createLinearGradient(0,0,1,0)
      : ctx.createLinearGradient(0,0,0,1);
    const rgb = [1,3,5].map(i=>parseInt(c.cor.slice(i,i+2),16)).join(",");
    for (const p of c.paragens) gradiente.addColorStop(p.posicao,`rgba(${rgb},${p.opacidade})`);
    ctx.fillStyle=gradiente;ctx.fillRect(0,0,1,1);ctx.restore();
  }
}
