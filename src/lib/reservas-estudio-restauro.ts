import type {ElementoEstudio} from './reservas-estudio';

type Pix = Uint8ClampedArray;
type Caixa = {x:number;y:number;w:number;h:number};
export function caixaRestauro(e:ElementoEstudio,W:number,H:number,margem=0):Caixa {
  const a=e.rotacao*Math.PI/180,w=e.w/100*W,h=e.h/100*H;
  const rw=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),rh=Math.abs(w*Math.sin(a))+Math.abs(h*Math.cos(a));
  const x=Math.max(0,Math.floor((e.x+e.w/2)/100*W-rw/2-margem)),y=Math.max(0,Math.floor((e.y+e.h/2)/100*H-rh/2-margem));
  return {x,y,w:Math.max(0,Math.min(W,Math.ceil((e.x+e.w/2)/100*W+rw/2+margem))-x),h:Math.max(0,Math.min(H,Math.ceil((e.y+e.h/2)/100*H+rh/2+margem))-y)};
}
const mediana=(v:number[])=>{v.sort((a,b)=>a-b);return v[Math.floor(v.length/2)]??1;};

/** Mede a iluminação da fotografia fora das letras, cartões, ícones e marca.
 * A interpolação preenche as zonas tapadas sem confundir texto branco com luz.
 * Assim a placa limpa recupera também degradés que a análise não identificou. */
export function luzFundoEstudio(original:Pix,fundo:Pix,W:number,H:number,elementos:ElementoEstudio[]):Float32Array {
  const passo=64,nx=Math.ceil(W/passo),ny=Math.ceil(H/passo),n=nx*ny;
  const excluido=new Uint8Array(W*H);
  for(const e of elementos){if(e.oculto||e.tipo==='sombra')continue;const b=caixaRestauro(e,W,H,8);for(let y=b.y;y<b.y+b.h;y++)excluido.fill(1,y*W+b.x,y*W+b.x+b.w);}
  const luz=new Float32Array(n*3).fill(1),conhecido=new Uint8Array(n);
  for(let gy=0;gy<ny;gy++)for(let gx=0;gx<nx;gx++){
    const canais=[[],[],[]] as number[][],q=gy*nx+gx;
    for(let y=gy*passo+2;y<Math.min(H,(gy+1)*passo);y+=4)for(let x=gx*passo+2;x<Math.min(W,(gx+1)*passo);x+=4){
      if(excluido[y*W+x])continue;const p=(y*W+x)*4;
      if([0,1,2].some(c=>fundo[p+c]!<25||original[p+c]!<3))continue;
      for(let c=0;c<3;c++)canais[c]!.push(Math.max(.08,Math.min(3,original[p+c]!/fundo[p+c]!)));
    }
    if(canais[0]!.length>=8){conhecido[q]=1;for(let c=0;c<3;c++)luz[q*3+c]=mediana(canais[c]!);}
  }
  // Sem fotografia visível suficiente, mantém os tons disponíveis.
  if(!conhecido.some(Boolean))return new Float32Array(W*H*3).fill(1);
  for(let c=0;c<3;c++){const media=mediana(Array.from({length:n},(_,q)=>conhecido[q]?luz[q*3+c]!:NaN).filter(Number.isFinite));for(let q=0;q<n;q++)if(!conhecido[q])luz[q*3+c]=media;}
  for(let k=0;k<180;k++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const q=y*nx+x;if(conhecido[q])continue;
    const vizinhos=[x? q-1:-1,x<nx-1?q+1:-1,y?q-nx:-1,y<ny-1?q+nx:-1].filter(v=>v>=0);
    for(let c=0;c<3;c++)luz[q*3+c]=vizinhos.reduce((s,v)=>s+luz[v*3+c]!,0)/vizinhos.length;
  }
  // Suaviza pequenas diferenças de textura/compressão entre as duas fotografias.
  const suave=new Float32Array(luz);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)for(let c=0;c<3;c++){
    const v:number[]=[];for(let yy=Math.max(0,y-1);yy<=Math.min(ny-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(nx-1,x+1);xx++)v.push(luz[(yy*nx+xx)*3+c]!);
    suave[(y*nx+x)*3+c]=mediana(v);
  }
  const resultado=new Float32Array(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const fx=Math.max(0,Math.min(nx-1,(x+.5)/passo-.5)),fy=Math.max(0,Math.min(ny-1,(y+.5)/passo-.5)),ix=Math.floor(fx),iy=Math.floor(fy),dx=fx-ix,dy=fy-iy;
    for(let c=0;c<3;c++)resultado[(y*W+x)*3+c]=
      suave[(iy*nx+ix)*3+c]!*(1-dx)*(1-dy)+suave[(iy*nx+Math.min(nx-1,ix+1))*3+c]!*dx*(1-dy)+
      suave[(Math.min(ny-1,iy+1)*nx+ix)*3+c]!*(1-dx)*dy+suave[(Math.min(ny-1,iy+1)*nx+Math.min(nx-1,ix+1))*3+c]!*dx*dy;
  }
  return resultado;
}

/** Apaga apenas os glifos no local antigo. O fundo da nova posição nunca é
 * substituído: desenhar por cima não precisa de uma operação de limpeza. */
export function mascaraElementoEstudio(original:Pix,placa:Pix,luz:Float32Array,W:number,H:number,e:ElementoEstudio,margem:number){
  const b=caixaRestauro(e,W,H,margem),mascara=new Uint8Array(b.w*b.h),core=caixaRestauro(e,W,H);
  const grupos=new Map<number,{n:number;somas:number[]}>();
  for(let y=core.y;y<core.y+core.h;y++)for(let x=core.x;x<core.x+core.w;x++){
    const p=(y*W+x)*4,q=(y*W+x)*3;
    if(Math.max(...[0,1,2].map(c=>Math.abs(original[p+c]!-Math.min(255,placa[p+c]!*luz[q+c]!))))<45)continue;
    const chave=(original[p]!>>4)*256+(original[p+1]!>>4)*16+(original[p+2]!>>4),g=grupos.get(chave)??{n:0,somas:[0,0,0]};
    g.n++;for(let c=0;c<3;c++)g.somas[c]!+=original[p+c]!;grupos.set(chave,g);
  }
  const dominante=[...grupos.values()].sort((a,b)=>b.n-a.n)[0];
  // A cor vem dos píxeis: análises antigas podem chamar laranja a letras brancas.
  const cor=e.tipo==='marca'?[255,255,255]:dominante?dominante.somas.map(v=>v/dominante.n):[1,3,5].map(i=>parseInt(e.cor.slice(i,i+2),16));
  for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
    const pos=(b.y+y)*W+b.x+x,p=pos*4,q=pos*3;
    const fundo=[0,1,2].map(c=>Math.min(255,placa[p+c]!*luz[q+c]!)),contraste=cor.map((v,c)=>v-fundo[c]!);
    const canal=[0,1,2].sort((a,b)=>Math.abs(contraste[b]!)-Math.abs(contraste[a]!))[0]!;
    if(Math.abs(contraste[canal]!)<30)continue;
    const alpha=Math.max(0,Math.min(1,(original[p+canal]!-fundo[canal]!)/contraste[canal]!));
    if(alpha<.12||Math.max(...cor.map((v,c)=>Math.abs(original[p+c]!-(fundo[c]!*(1-alpha)+v*alpha))))>38)continue;
    mascara[y*b.w+x]=Math.round(alpha*255);
  }
  return {b,mascara,cor};
}

export function limparElementosEstudio(original:Pix,placa:Pix,luz:Float32Array,W:number,H:number,elementos:ElementoEstudio[],todos:ElementoEstudio[]=[]):Pix {
  const saida=new Uint8ClampedArray(original);
  const proteger=new Uint8Array(W*H),ids=new Set(elementos.map(e=>e.id)),zonas=elementos.map(e=>caixaRestauro(e,W,H,32));
  for(const e of todos){
    if(ids.has(e.id)||e.oculto||!['texto','marca','imagem'].includes(e.tipo))continue;
    const b=caixaRestauro(e,W,H);
    if(!zonas.some(z=>z.x<b.x+b.w&&z.x+z.w>b.x&&z.y<b.y+b.h&&z.y+z.h>b.y))continue;
    const {mascara}=mascaraElementoEstudio(original,placa,luz,W,H,e,0);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)if(mascara[y*b.w+x]!>25)proteger[(b.y+y)*W+b.x+x]=1;
  }
  for(const e of elementos){
    const texto=e.tipo==='texto',marca=e.tipo==='marca',pad=marca?32:texto?Math.ceil(Math.max(6,e.tamanho*.12)):4;
    const {b,mascara}=mascaraElementoEstudio(original,placa,luz,W,H,e,pad);if(!b.w||!b.h)continue;
    const raio=texto?Math.min(10,Math.max(6,Math.ceil(e.tamanho*.06))):marca?7:1;
    const horizontal=new Uint8Array(mascara.length),dilatada=new Uint8Array(mascara.length);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){let a=0;for(let dx=-raio;dx<=raio;dx++)if(x+dx>=0&&x+dx<b.w)a=Math.max(a,mascara[y*b.w+x+dx]!>50?255:0);horizontal[y*b.w+x]=a;}
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){let a=0;for(let dy=-raio;dy<=raio;dy++)if(y+dy>=0&&y+dy<b.h)a=Math.max(a,horizontal[(y+dy)*b.w+x]!);dilatada[y*b.w+x]=a;}
    const amostras=[[],[],[]] as number[][];
    for(let y=0;y<b.h;y+=2)for(let x=0;x<b.w;x+=2){
      if(dilatada[y*b.w+x])continue;const pos=(b.y+y)*W+b.x+x,q=pos*4;
      for(let c=0;c<3;c++){const v=placa[q+c]!*luz[pos*3+c]!;if(v>15){const r=original[q+c]!/v;if(r>.3&&r<2)amostras[c]!.push(r);}}
    }
    const ajuste=amostras.map(v=>v.length>=12?mediana(v):1);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
      let soma=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(y+dy>=0&&y+dy<b.h&&x+dx>=0&&x+dx<b.w){soma+=dilatada[(y+dy)*b.w+x+dx]!;n++;}
      const a=soma/(n*255);if(!a)continue;
      const pos=(b.y+y)*W+b.x+x,q=pos*4;
      if(proteger[pos])continue;
      for(let c=0;c<3;c++)saida[q+c]=Math.round(original[q+c]!*(1-a)+Math.min(255,placa[q+c]!*luz[pos*3+c]!*ajuste[c]!)*a);
    }
  }
  return saida;
}
