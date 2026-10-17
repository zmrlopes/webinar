import {ErroReserva, imagemReserva, type CaixaReserva} from "./reservas";
import {FONTES_RESERVA, fonteReserva, pesoFonteReserva, type FonteReserva} from "./reservas-fontes";

export const FONTES_EDITOR_PUBLICACAO = FONTES_RESERVA.filter(f => f.ficheiros.length > 0);
export interface TextoEditorPublicacao extends CaixaReserva {
  id: string; nome: string; texto: string; fonte: FonteReserva; tamanho: number;
  cor: string; negrito: boolean; italico: boolean; sombra: boolean; alinhar: "left" | "center" | "right";
  recorteOriginal?: string;
}
export interface EstiloTextoPublicacao {id: string; fonte: FonteReserva; tamanho: number; cor: string; negrito: boolean; italico: boolean; x: number; y: number; manterOriginal?:boolean; texto?:string; apagado?:boolean}
export interface AjustesEditorPublicacao {
  textos: EstiloTextoPublicacao[]; fundo: string; escurecimento: number; credito: string;
}
export interface EditorPublicacaoReserva {
  versao: 1; origemId: string; imagemOriginal: string; fundoLimpo: string; textos: TextoEditorPublicacao[];
  decoracoes: (CaixaReserva & {tipo?:"cartao"|"emoji"})[]; marca: CaixaReserva; ajustes: AjustesEditorPublicacao;
}
export function ajustesIniciaisPublicacao(textos: TextoEditorPublicacao[]): AjustesEditorPublicacao {
  return {textos: textos.map(({id,fonte,tamanho,cor,negrito,italico,x,y})=>({id,fonte,tamanho,cor,negrito,italico,x,y,manterOriginal:true})),fundo:"",escurecimento:.5,credito:""};
}
export function textoAlteradoPublicacao(texto: TextoEditorPublicacao, estilo: EstiloTextoPublicacao) {
  return estilo.apagado===true||conteudoTextoPublicacao(texto,estilo)!==texto.texto||estilo.manterOriginal===false||(["fonte","tamanho","cor","negrito","italico","x","y"] as const).some(k => texto[k] !== estilo[k]);
}
export function conteudoTextoPublicacao(texto: TextoEditorPublicacao, estilo: EstiloTextoPublicacao) {return estilo.texto??texto.texto;}
export function textoVisivelPublicacao(texto: TextoEditorPublicacao, estilo: EstiloTextoPublicacao) {return !estilo.apagado&&conteudoTextoPublicacao(texto,estilo).trim().length>0;}
export function validarAjustesPublicacao(valor: unknown, editor: EditorPublicacaoReserva): AjustesEditorPublicacao {
  const v = valor as Partial<AjustesEditorPublicacao> | null;
  if (!v || !Array.isArray(v.textos) || v.textos.length !== editor.textos.length) throw new ErroReserva("Os textos do editor são inválidos.");
  const ids = new Set<string>();
  const textos = v.textos.map(t => {
    const original = editor.textos.find(e => e.id === t?.id);
    if (!original || ids.has(t.id)) throw new ErroReserva("O texto selecionado não existe nesta publicação.");
    ids.add(t.id);
    if ((t.texto!==undefined&&(typeof t.texto!=="string"||t.texto.length>1600)) || (t.apagado!==undefined&&typeof t.apagado!=="boolean")) throw new ErroReserva("Cada texto pode ter até 1600 caracteres.");
    if (!FONTES_EDITOR_PUBLICACAO.some(f=>f.id===t.fonte) || !Number.isFinite(t.tamanho) || t.tamanho < 10 || t.tamanho > 220 || !/^#[0-9a-f]{6}$/i.test(t.cor) || typeof t.negrito !== "boolean" || typeof t.italico !== "boolean") throw new ErroReserva("Revê o tipo, o tamanho e a cor da letra.");
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || t.x < 0 || t.x > 100-original.w || t.y < 0 || t.y > 98) throw new ErroReserva("Mantém o texto dentro da publicação.");
    return {id:t.id,fonte:t.fonte,tamanho:t.tamanho,cor:t.cor,negrito:t.negrito,italico:t.italico,x:t.x,y:t.y,manterOriginal:t.manterOriginal!==false,...(t.texto!==undefined?{texto:t.texto}:{}),...(t.apagado!==undefined?{apagado:t.apagado}:{})};
  });
  if (typeof v.escurecimento !== "number" || !Number.isFinite(v.escurecimento) || v.escurecimento < 0 || v.escurecimento > .85 || typeof v.credito !== "string" || v.credito.length > 300) throw new ErroReserva("O fundo escolhido é inválido.");
  return {textos,fundo:imagemReserva(v.fundo),escurecimento:v.escurecimento,credito:v.credito.trim()};
}
function linhasEditor(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  return texto.split("\n").flatMap(paragrafo => {
    const linhas:string[]=[],palavras=paragrafo.split(/\s+/);let atual="";
    for(const palavra of palavras){const proxima=atual?`${atual} ${palavra}`:palavra;if(atual&&ctx.measureText(proxima).width>largura){linhas.push(atual);atual=palavra;}else atual=proxima;}
    linhas.push(atual);return linhas;
  });
}
export function prepararTextoEditor(ctx: CanvasRenderingContext2D, texto: TextoEditorPublicacao, estilo: EstiloTextoPublicacao, largura: number) {
  ctx.font = `${estilo.italico?"italic ":""}${pesoFonteReserva(estilo.fonte,estilo.negrito)} ${estilo.tamanho}px ${fonteReserva(estilo.fonte).familia}`;
  const linhas=linhasEditor(ctx,conteudoTextoPublicacao(texto,estilo),texto.w/100*largura),medidas=linhas.map(l=>ctx.measureText(l||"Ag"));
  const subida=Math.max(...medidas.map(m=>m.actualBoundingBoxAscent)),descida=Math.max(...medidas.map(m=>m.actualBoundingBoxDescent));
  return {linhas,subida,altura:subida+descida+(linhas.length-1)*estilo.tamanho*1.15};
}
/** Ao corrigir o conteúdo, reduz a letra se necessário para caber na caixa original. */
export function ajustarConteudoTextoPublicacao(ctx:CanvasRenderingContext2D,texto:TextoEditorPublicacao,estilo:EstiloTextoPublicacao,conteudo:string,largura:number,altura:number):EstiloTextoPublicacao {
  const proximo={...estilo,texto:conteudo};
  while(proximo.tamanho>10){const preparado=prepararTextoEditor(ctx,texto,proximo,largura);if(preparado.altura<=texto.h/100*altura&&preparado.linhas.every(l=>ctx.measureText(l).width<=texto.w/100*largura))break;proximo.tamanho=Math.max(10,proximo.tamanho-1);}
  return proximo;
}
/** O original é o ponto de partida; só os textos alterados recebem um remendo do fundo limpo. */
export function desenharEditorPublicacao(ctx: CanvasRenderingContext2D, original: CanvasImageSource, limpo: CanvasImageSource, fundo: CanvasImageSource | null, editor: EditorPublicacaoReserva, ajustes: AjustesEditorPublicacao, largura: number, altura: number, recortes:Map<string,CanvasImageSource>=new Map()) {
  ctx.clearRect(0,0,largura,altura);
  if (fundo) {
    const img=fundo as HTMLImageElement,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,escala=Math.max(largura/iw,altura/ih);
    ctx.drawImage(fundo,(largura-iw*escala)/2,(altura-ih*escala)/2,iw*escala,ih*escala);
    const gradiente=ctx.createLinearGradient(0,0,0,altura);gradiente.addColorStop(0,`rgba(0,0,0,${ajustes.escurecimento*.4})`);gradiente.addColorStop(1,`rgba(0,0,0,${ajustes.escurecimento})`);ctx.fillStyle=gradiente;ctx.fillRect(0,0,largura,altura);
    for(const b of editor.decoracoes){const x=b.x/100*largura,y=b.y/100*altura,w=b.w/100*largura,h=b.h/100*altura;ctx.save();ctx.beginPath();if(b.tipo==="emoji")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);else ctx.roundRect(x,y,w,h,Math.min(18,h*.15));ctx.clip();ctx.drawImage(limpo,x,y,w,h,x,y,w,h);ctx.restore();}
  } else {
    ctx.drawImage(original,0,0,largura,altura);
    for(const t of editor.textos){const estilo=ajustes.textos.find(e=>e.id===t.id)!;if(!textoAlteradoPublicacao(t,estilo))continue;
      const x=Math.max(0,t.x/100*largura-10),y=Math.max(0,t.y/100*altura-10),w=Math.min(largura-x,t.w/100*largura+20),h=Math.min(altura-y,t.h/100*altura+20);ctx.drawImage(limpo,x,y,w,h,x,y,w,h);
    }
  }
  for(const t of editor.textos){const estilo=ajustes.textos.find(e=>e.id===t.id)!;if(!fundo&&!textoAlteradoPublicacao(t,estilo))continue;
    if(!textoVisivelPublicacao(t,estilo))continue;
    const recorte=recortes.get(t.id);
    if(recorte&&conteudoTextoPublicacao(t,estilo)===t.texto&&estilo.manterOriginal!==false&&estilo.fonte===t.fonte&&estilo.cor===t.cor&&estilo.negrito===t.negrito&&estilo.italico===t.italico){
      const escala=estilo.tamanho/t.tamanho;ctx.drawImage(recorte,estilo.x/100*largura,estilo.y/100*altura,t.w/100*largura*escala,t.h/100*altura*escala);continue;
    }
    ctx.save();const {linhas,subida}=prepararTextoEditor(ctx,t,estilo,largura),x=estilo.x/100*largura,y=estilo.y/100*altura,w=t.w/100*largura;
    ctx.fillStyle=estilo.cor;ctx.textAlign=t.alinhar;ctx.textBaseline="alphabetic";
    if(t.sombra){ctx.shadowColor="#00000099";ctx.shadowBlur=Math.max(2,estilo.tamanho*.08);ctx.shadowOffsetY=2;}
    const tx=t.alinhar==="center"?x+w/2:t.alinhar==="right"?x+w:x;
    linhas.forEach((linha,i)=>ctx.fillText(linha,tx,y+subida+i*estilo.tamanho*1.15));ctx.restore();
  }
  // A marca original fica por cima de qualquer letra ou fotografia.
  const m=editor.marca,x=Math.floor(m.x/100*largura),y=Math.floor(m.y/100*altura),w=Math.ceil((m.x+m.w)/100*largura)-x,h=Math.ceil((m.y+m.h)/100*altura)-y;
  ctx.drawImage(original,x,y,w,h,x,y,w,h);
  if(fundo&&ajustes.credito){ctx.fillStyle="#ffffff";ctx.fillRect(0,altura-24,largura,24);ctx.fillStyle="#333333";ctx.font=`11px ${fonteReserva("poppins").familia}`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(ajustes.credito,largura/2,altura-12,largura-20);}
}
