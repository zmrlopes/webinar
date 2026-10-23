import {ErroReserva, type CaixaReserva} from "./reservas";

export interface FormaPublicacao extends CaixaReserva {
  id: string; nome: string; cor: string; opacidade: number;
  figura: "retangulo" | "elipse" | "poligono"; raio: number;
  pontos: {x:number;y:number}[];
}
export interface GraficoPublicacao extends CaixaReserva {id:string;nome:string;imagem:string}
export interface EstiloFormaPublicacao {id:string;cor:string}
export interface LeituraGraficoPublicacao extends CaixaReserva {
  nome:string;cor:string;mascara:"elipse"|"cor"|"recorte";
}
const caixa={x:{type:"number",minimum:0,maximum:100},y:{type:"number",minimum:0,maximum:100},w:{type:"number",minimum:0,maximum:100},h:{type:"number",minimum:0,maximum:100}};
export const esquemaFormasPublicacao={type:"array",maxItems:16,items:{type:"object",additionalProperties:false,properties:{
  ...caixa,nome:{type:"string"},cor:{type:"string"},opacidade:{type:"number"},
  figura:{type:"string",enum:["retangulo","elipse","poligono"]},raio:{type:"number"},
  pontos:{type:"array",maxItems:48,items:{type:"object",additionalProperties:false,properties:{x:caixa.x,y:caixa.y},required:["x","y"]}},
},required:[...Object.keys(caixa),"nome","cor","opacidade","figura","raio","pontos"]}};
export const esquemaGraficosPublicacao={type:"array",maxItems:20,items:{type:"object",additionalProperties:false,properties:{
  ...caixa,nome:{type:"string"},cor:{type:"string"},mascara:{type:"string",enum:["elipse","cor","recorte"]},
},required:[...Object.keys(caixa),"nome","cor","mascara"]}};
export const instrucaoCamadasPublicacao=`Separa TODOS os elementos gráficos da fotografia, sem restringir a cores: formas contém cartões, retângulos preenchidos, faixas, fundos de botões e outros painéis geométricos, mesmo brancos, pretos, coloridos ou translúcidos, em qualquer zona da imagem. Cada forma tem {nome,x,y,w,h,cor:"#RRGGBB",opacidade:0.9,figura:"retangulo",raio:0,pontos:[]}. Coordenadas das caixas em PERCENTAGENS da imagem inteira (0–100), opacidade entre 0 e 1. Retângulos arredondados usam raio em percentagem do lado menor (0–50). Elipses usam figura=elipse. Cartões com borda ondulada/rasgada/irregular usam figura=poligono e 12–48 pontos ao longo de TODO o contorno, em ordem; cada ponto está em percentagens LOCAIS da caixa (0–100), e não da imagem inteira. Usa cor e transparência do preenchimento, distinguindo a textura da fotografia visível através dele. Não incluis a fotografia, as sombras naturais da fotografia nem os textos nas formas. Sombreados suaves/degradés ficam em sombreados, sem os duplicar nas formas.
graficos contém TODOS os ícones, pictogramas, autocolantes e decorações ilustradas que devem sobreviver à troca da fotografia, com caixas ajustadas sem margens: {nome,x,y,w,h,cor:"#RRGGBB",mascara:"cor"}. Pictogramas dentro de círculos coloridos usam mascara=elipse, incluindo o círculo E o pictograma branco como UM gráfico. Pictogramas de uma cor sem círculo usam mascara=cor e a sua cor principal exata. Gráficos com várias cores usam mascara=recorte. Os textos ficam APENAS em textos; as caixas gráficas não devem conter legendas. Exclui sempre o logótipo/nome iCliGo e o seu cartão de ambas as listas. Não trates palmeiras, edifícios ou outras partes da fotografia como gráficos. Máximo 16 formas e 20 gráficos. Devolve listas vazias apenas se esses elementos não existirem.`;

function validarCaixa(v:CaixaReserva){
  if(!v||![v.x,v.y,v.w,v.h].every(Number.isFinite)||v.x<0||v.y<0||v.x>=100||v.y>=100||v.w<=0||v.h<=0||v.x+v.w>100.1||v.y+v.h>100.1)throw new ErroReserva("Não foi possível separar uma forma ou um gráfico da publicação.",422);
  return {x:v.x,y:v.y,w:Math.min(v.w,100-v.x),h:Math.min(v.h,100-v.y)};
}
/** Recorta a parte visível de caixas aproximadas da IA junto às margens. */
export function ajustarLimitesLeituraPublicacao(valor:unknown):unknown{
  if(!Array.isArray(valor))return valor;
  return valor.map(v=>{
    if(!v||![v.x,v.y,v.w,v.h].every(n=>Number.isFinite(n)&&n>=0&&n<=100))return v;
    return {...v,w:Math.min(v.w,100-v.x),h:Math.min(v.h,100-v.y)};
  });
}
function validarNomeCor(v:{nome:string;cor:string}){
  if(typeof v.nome!=="string"||!v.nome.trim()||v.nome.length>100||typeof v.cor!=="string"||!/^#[0-9a-f]{6}$/i.test(v.cor))throw new ErroReserva("Não foi possível reconhecer a cor de um elemento gráfico.",422);
}
export function validarFormasPublicacao(valor:unknown):FormaPublicacao[]{
  if(!Array.isArray(valor)||valor.length>16)throw new ErroReserva("Não foi possível separar os cartões da publicação.",422);
  return valor.map((v,i)=>{
    const b=validarCaixa(v);validarNomeCor(v);
    if(!["retangulo","elipse","poligono"].includes(v.figura)||!Number.isFinite(v.opacidade)||v.opacidade<=0||v.opacidade>1||!Number.isFinite(v.raio)||v.raio<0||v.raio>50||!Array.isArray(v.pontos)||v.pontos.length>64||v.figura==="poligono"&&v.pontos.length<3)throw new ErroReserva("O contorno de um cartão não é válido.",422);
    const pontos=v.pontos.map((p:{x:number;y:number})=>{if(!p||![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>100||p.y>100)throw new ErroReserva("O contorno de um cartão não é válido.",422);return{x:p.x,y:p.y};});
    return {...b,id:`forma-${i+1}`,nome:v.nome.trim(),cor:v.cor.toLowerCase(),opacidade:v.opacidade,figura:v.figura,raio:v.raio,pontos};
  });
}
export function validarGraficosPublicacao(valor:unknown):LeituraGraficoPublicacao[]{
  if(!Array.isArray(valor)||valor.length>20)throw new ErroReserva("Não foi possível separar os ícones da publicação.",422);
  return valor.map(v=>{const b=validarCaixa(v);validarNomeCor(v);if(!["elipse","cor","recorte"].includes(v.mascara))throw new ErroReserva("O recorte de um gráfico não é válido.",422);return{...b,nome:v.nome.trim(),cor:v.cor.toLowerCase(),mascara:v.mascara};});
}
export function estilosFormasPublicacao(formas:FormaPublicacao[],estilos?:EstiloFormaPublicacao[]):EstiloFormaPublicacao[]{
  if(estilos===undefined)return formas.map(({id,cor})=>({id,cor}));
  if(!Array.isArray(estilos)||estilos.length!==formas.length)throw new ErroReserva("As formas do editor são inválidas.");
  const ids=new Set<string>();
  return estilos.map(v=>{if(!v||!formas.some(f=>f.id===v.id)||ids.has(v.id)||typeof v.cor!=="string"||!/^#[0-9a-f]{6}$/i.test(v.cor))throw new ErroReserva("A cor do preenchimento não é válida.");ids.add(v.id);return{id:v.id,cor:v.cor.toLowerCase()};});
}
export function formaAlteradaPublicacao(f:FormaPublicacao,estilos?:EstiloFormaPublicacao[]){return (estilos?.find(e=>e.id===f.id)?.cor??f.cor).toLowerCase()!==f.cor.toLowerCase();}
export function caminhoFormaPublicacao(ctx:CanvasRenderingContext2D,f:FormaPublicacao,largura:number,altura:number){
  const x=f.x/100*largura,y=f.y/100*altura,w=f.w/100*largura,h=f.h/100*altura;
  ctx.beginPath();
  if(f.figura==="elipse")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
  else if(f.figura==="poligono"){f.pontos.forEach((p,i)=>{const px=x+p.x/100*w,py=y+p.y/100*h;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.closePath();}
  else ctx.roundRect(x,y,w,h,f.raio/100*Math.min(w,h));
}
export function desenharFormasPublicacao(ctx:CanvasRenderingContext2D,formas:FormaPublicacao[],estilos:EstiloFormaPublicacao[]|undefined,largura:number,altura:number){
  for(const f of formas){ctx.save();caminhoFormaPublicacao(ctx,f,largura,altura);ctx.globalAlpha=f.opacidade;ctx.fillStyle=estilos?.find(e=>e.id===f.id)?.cor??f.cor;ctx.fill();ctx.restore();}
}
/** Muda só o pigmento do cartão, conservando a fotografia que se vê através dele. */
export function pontoNaForma(f:FormaPublicacao,x:number,y:number,largura:number,altura:number){
  const w=f.w/100*largura,h=f.h/100*altura,px=x-f.x/100*largura,py=y-f.y/100*altura;
  if(px<0||py<0||px>w||py>h)return false;
  if(f.figura==="elipse")return ((px-w/2)/(w/2))**2+((py-h/2)/(h/2))**2<=1;
  if(f.figura==="poligono"){
    const lx=px/w*100,ly=py/h*100;let dentro=false;
    for(let i=0,j=f.pontos.length-1;i<f.pontos.length;j=i++){const a=f.pontos[i]!,b=f.pontos[j]!;if((a.y>ly)!==(b.y>ly)&&lx<(b.x-a.x)*(ly-a.y)/(b.y-a.y)+a.x)dentro=!dentro;}
    return dentro;
  }
  const r=f.raio/100*Math.min(w,h),dx=Math.max(0,r-px,px-w+r),dy=Math.max(0,r-py,py-h+r);
  return dx*dx+dy*dy<=r*r;
}
export function recolorirFormaPublicacao(ctx:CanvasRenderingContext2D,f:FormaPublicacao,cor:string,largura:number,altura:number,porCima:FormaPublicacao[]=[]){
  const x=Math.floor(f.x/100*largura),y=Math.floor(f.y/100*altura),w=Math.min(largura-x,Math.ceil(f.w/100*largura)),h=Math.min(altura-y,Math.ceil(f.h/100*altura));
  const bloco=ctx.getImageData(x,y,w,h),diferenca=[1,3,5].map(i=>(parseInt(cor.slice(i,i+2),16)-parseInt(f.cor.slice(i,i+2),16))*f.opacidade);
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pontoNaForma(f,x+xx+.5,y+yy+.5,largura,altura)){
    const p=(yy*w+xx)*4,fator=porCima.reduce((a,s)=>pontoNaForma(s,x+xx+.5,y+yy+.5,largura,altura)?a*(1-s.opacidade):a,1);
    for(let c=0;c<3;c++)bloco.data[p+c]=Math.max(0,Math.min(255,Math.round(bloco.data[p+c]!+diferenca[c]!*fator)));
  }
  ctx.putImageData(bloco,x,y);
}
