import sharp from "sharp";
import {pontoNaForma,type FormaPublicacao,type GraficoPublicacao,type LeituraGraficoPublicacao} from "./reservas-imagem-camadas";
import type {EditorPublicacaoReserva} from "./reservas-imagem-editor";

type Componente={pixels:number[];x0:number;y0:number;x1:number;y1:number};
function componentes(data:Buffer,width:number,height:number,cor:number[],tolerancia:number,caixa={x0:0,y0:0,x1:width-1,y1:height-1}):Componente[]{
  const vistos=new Uint8Array(width*height),saida:Componente[]=[];
  const valido=(q:number)=>cor.every((v,c)=>Math.abs(data[q*4+c]!-v)<tolerancia);
  for(let y=caixa.y0;y<=caixa.y1;y++)for(let x=caixa.x0;x<=caixa.x1;x++){
    const p=y*width+x;if(vistos[p]||!valido(p))continue;
    const pixels=[p];vistos[p]=1;let x0=x,y0=y,x1=x,y1=y;
    for(let n=0;n<pixels.length;n++){
      const q=pixels[n]!,xx=q%width,yy=Math.floor(q/width);x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const nx=xx+dx!,ny=yy+dy!,v=ny*width+nx;if(nx<caixa.x0||nx>caixa.x1||ny<caixa.y0||ny>caixa.y1||vistos[v]||!valido(v))continue;vistos[v]=1;pixels.push(v);}
    }
    if(pixels.length>=6)saida.push({pixels,x0,y0,x1,y1});
  }
  return saida;
}
function simplificar(pontos:{x:number;y:number}[],tolerancia:number):{x:number;y:number}[]{
  if(pontos.length<3)return pontos;const a=pontos[0]!,b=pontos.at(-1)!,dx=b.x-a.x,dy=b.y-a.y;let maior=0,indice=0;
  for(let i=1;i<pontos.length-1;i++){const p=pontos[i]!,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d>maior){maior=d;indice=i;}}
  return maior>tolerancia?[...simplificar(pontos.slice(0,indice+1),tolerancia).slice(0,-1),...simplificar(pontos.slice(indice),tolerancia)]:[a,b];
}
/** A visão sugere a forma; os píxeis medem o contorno real e evitam coordenadas aproximadas. */
export async function refinarFormasPublicacao(bytes:Buffer,formas:FormaPublicacao[],largura:number,altura:number):Promise<FormaPublicacao[]>{
  const {data,info}=await sharp(bytes).resize(Math.round(largura/2),Math.round(altura/2)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return formas.map(f=>{
    const rgb=[1,3,5].map(n=>parseInt(f.cor.slice(n,n+2),16)),caixa={x0:Math.max(0,Math.floor((f.x-8)/100*info.width)),y0:Math.max(0,Math.floor((f.y-12)/100*info.height)),x1:Math.min(info.width-1,Math.ceil((f.x+f.w+8)/100*info.width)),y1:Math.min(info.height-1,Math.ceil((f.y+f.h+12)/100*info.height))};
    const candidatos=componentes(data,info.width,info.height,rgb,f.opacidade<1?80:45,caixa).filter(c=>c.pixels.length>f.w/100*info.width*f.h/100*info.height*.15&&c.x1-c.x0>f.w/100*info.width*.4&&c.y1-c.y0>f.h/100*info.height*.4).sort((a,b)=>b.pixels.length-a.pixels.length),c=candidatos[0];
    if(!c)return f;
    if(c.x0===caixa.x0&&caixa.x0>0||c.y0===caixa.y0&&caixa.y0>0||c.x1===caixa.x1&&caixa.x1<info.width-1||c.y1===caixa.y1&&caixa.y1<info.height-1)return f;
    const top=new Int32Array(info.width).fill(info.height),bottom=new Int32Array(info.width).fill(-1);
    for(const p of c.pixels){const x=p%info.width,y=Math.floor(p/info.width);top[x]=Math.min(top[x]!,y);bottom[x]=Math.max(bottom[x]!,y+1);}
    const cima:{x:number;y:number}[]=[],baixo:{x:number;y:number}[]=[];
    for(let x=c.x0;x<=c.x1;x++)if(bottom[x]!>=0){cima.push({x,y:top[x]!});baixo.push({x:x+1,y:bottom[x]!});}
    const pontos=[...simplificar(cima,1),...simplificar(baixo.reverse(),1)],w=c.x1-c.x0+1,h=c.y1-c.y0+1;
    return{...f,x:c.x0/info.width*100,y:c.y0/info.height*100,w:w/info.width*100,h:h/info.height*100,figura:"poligono",raio:0,pontos:pontos.map(p=>({x:(p.x-c.x0)/w*100,y:(p.y-c.y0)/h*100}))};
  });
}

/** Corrige as caixas aproximadas das letras ao separar cartões e pictogramas. */
export async function refinarRecortesCamadas(editor:EditorPublicacaoReserva,largura:number,altura:number){
  const bytes=Buffer.from(editor.imagemOriginal.split(",")[1]!,"base64"),original=await sharp(bytes).resize(largura,altura).ensureAlpha().raw().toBuffer();
  const placa=editor.fundoLimpo?await sharp(Buffer.from(editor.fundoLimpo.split(",")[1]!,"base64")).resize(largura,altura).ensureAlpha().raw().toBuffer():null;
  const textos=structuredClone(editor.textos);let limpou=false;
  for(const t of editor.textos){
    const pad=Math.max(4,Math.min(45,t.tamanho*.2)),left=Math.max(0,Math.floor(t.x/100*largura-pad)),top=Math.max(0,Math.floor(t.y/100*altura-pad)),right=Math.min(largura,Math.ceil((t.x+t.w)/100*largura+pad)),bottom=Math.min(altura,Math.ceil((t.y+t.h)/100*altura+pad)),w=right-left,h=bottom-top;
    const rgb=[1,3,5].map(n=>parseInt(t.cor.slice(n,n+2),16)),mascara=new Uint8Array(w*h);
    const formas=(editor.formas??[]).filter(f=>pontoNaForma(f,(t.x+t.w/2)/100*largura,(t.y+t.h/2)/100*altura,largura,altura));
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const xx=left+x,yy=top+y,px=xx/largura*100,py=yy/altura*100;
      if(formas.length&&!formas.some(f=>pontoNaForma(f,xx,yy,largura,altura)))continue;
      if((editor.graficos??[]).some(g=>px>=g.x-.3&&px<=g.x+g.w+.3&&py>=g.y-.3&&py<=g.y+g.h+.3))continue;
      if(textos.some(o=>o.id!==t.id&&px>=o.x&&px<=o.x+o.w&&py>=o.y&&py<=o.y+o.h))continue;
      const p=(yy*largura+xx)*4,dist=Math.max(...rgb.map((v,c)=>Math.abs(v-original[p+c]!))),a=Math.round(255*Math.max(0,Math.min(1,(90-dist)/45)));
      if(a<12)continue;mascara[y*w+x]=a;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    }
    // Pontos escuros da fotografia junto ao texto não são novas palavras.
    const colunas=Array.from({length:w},(_,x)=>{let n=0;for(let y=0;y<h;y++)if(mascara[y*w+x]!>12)n++;return n;}),grupos:{inicio:number;fim:number;area:number}[]=[];
    const intervalo=Math.max(6,Math.min(16,t.tamanho*.08));let grupo:{inicio:number;fim:number;area:number}|null=null;
    for(let x=0;x<w;x++)if(colunas[x]){if(!grupo||x-grupo.fim>intervalo){grupo={inicio:x,fim:x,area:0};grupos.push(grupo);}grupo.fim=x;grupo.area+=colunas[x]!;}
    const palavras=t.texto.trim().split(/\s+/).length;
    if(grupos.length>palavras){const manter=grupos.slice().sort((a,b)=>b.area-a.area).slice(0,palavras);x0=w;y0=h;x1=-1;y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!manter.some(g=>x>=g.inicio&&x<=g.fim)){mascara[y*w+x]=0;continue;}if(mascara[y*w+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}}
    if(x1<=x0||y1<=y0)continue;
    const nw=x1-x0+1,nh=y1-y0+1,recorte=Buffer.alloc(nw*nh*4);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const a=mascara[y*w+x]!,p=((top+y)*largura+left+x)*4,q=((y-y0)*nw+x-x0)*4;
      for(let c=0;c<3;c++)recorte[q+c]=original[p+c]!;recorte[q+3]=a;
      if(!a||!placa||Math.max(...rgb.map((v,c)=>Math.abs(v-placa[p+c]!)))>90)continue;
      // Só preenche restos de letras que a antiga placa não tinha abrangido.
      const amostras:number[][]=[];
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])for(let d=1;d<=50;d++){
        const sx=x+dx!*d,sy=y+dy!*d;if(sx<0||sy<0||sx>=w||sy>=h)break;
        if(mascara[sy*w+sx]!>12)continue;const s=((top+sy)*largura+left+sx)*4;
        if(Math.max(...rgb.map((v,c)=>Math.abs(v-placa[s+c]!)))<100)continue;
        amostras.push([placa[s]!,placa[s+1]!,placa[s+2]!,1/d]);break;
      }
      if(amostras.length){const soma=amostras.reduce((v,s)=>v+s[3]!,0);for(let c=0;c<3;c++)placa[p+c]=Math.round(amostras.reduce((v,s)=>v+s[c]!*s[3]!,0)/soma);limpou=true;}
    }
    const estilo=editor.ajustes.textos.find(e=>e.id===t.id),nx=(left+x0)/largura*100,ny=(top+y0)/altura*100;
    if(estilo){if(estilo.x===t.x)estilo.x=nx;if(estilo.y===t.y)estilo.y=ny;}
    t.x=nx;t.y=ny;t.w=nw/largura*100;t.h=nh/altura*100;t.recorteOriginal=`data:image/png;base64,${(await sharp(recorte,{raw:{width:nw,height:nh,channels:4}}).png().toBuffer()).toString("base64")}`;
  }
  if(limpou&&placa)editor.fundoLimpo=`data:image/webp;base64,${(await sharp(placa,{raw:{width:largura,height:altura,channels:4}}).webp({quality:94}).toBuffer()).toString("base64")}`;
}

/** Recorta os gráficos reais; não volta a desenhar ícones nem inclui a fotografia. */
export async function extrairGraficosPublicacao(bytes:Buffer,leituras:LeituraGraficoPublicacao[],largura:number,altura:number):Promise<GraficoPublicacao[]>{
  const {data,info}=await sharp(bytes).resize(largura,altura).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const usadas:CaixaSelecionada[]=[];
  const paleta:number[][]=[];
  type CaixaSelecionada={x0:number;y0:number;x1:number;y1:number};
  return Promise.all(leituras.map(async(g,i)=>{
    let left=Math.floor(g.x/100*largura),top=Math.floor(g.y/100*altura),right=Math.min(largura,Math.ceil((g.x+g.w)/100*largura)),bottom=Math.min(altura,Math.ceil((g.y+g.h)/100*altura));
    let rgb=[1,3,5].map(n=>parseInt(g.cor.slice(n,n+2),16));
    const distancia=(p:number)=>Math.max(...rgb.map((v,c)=>Math.abs(v-data[p+c]!)));
    let mascara=g.mascara;
    if(mascara==="recorte"&&Math.min(...rgb)>220)mascara="cor";
    if(mascara!=="recorte"){
      const gw=right-left,gh=bottom-top,cx=(left+right)/2,cy=(top+bottom)/2;
      const procurar=(cor:number[])=>componentes(data,largura,altura,cor,65).filter(c=>c.pixels.length>gw*gh*.12&&c.x1-c.x0>gw*.3&&c.x1-c.x0<gw*2&&c.y1-c.y0>gh*.25&&c.y1-c.y0<gh*2&&!usadas.some(u=>Math.abs(c.x0-u.x0)<10&&Math.abs(c.y0-u.y0)<10)).sort((a,b)=>Math.hypot((a.x0+a.x1)/2-cx,(a.y0+a.y1)/2-cy)-Math.hypot((b.x0+b.x1)/2-cx,(b.y0+b.y1)/2-cy));
      let c=procurar(rgb)[0];
      if(!c)for(const cor of paleta){const candidato=procurar(cor)[0];if(candidato){rgb=cor;c=candidato;break;}}
      if(c){
        rgb=[0,1,2].map(canal=>{const v=c!.pixels.map(p=>data[p*4+canal]!).sort((a,b)=>a-b);return v[Math.floor(v.length/2)]!;});
        if(!paleta.some(cor=>cor.every((v,i)=>Math.abs(v-rgb[i]!)<15)))paleta.push(rgb);
        // Junta pequenos pormenores soltos do mesmo pictograma (rodas, alças...).
        const proximos=componentes(data,largura,altura,rgb,65,{x0:Math.max(0,c.x0-32),y0:Math.max(0,c.y0-32),x1:Math.min(largura-1,c.x1+32),y1:Math.min(altura-1,c.y1+32)});
        left=Math.min(...proximos.map(p=>p.x0));top=Math.min(...proximos.map(p=>p.y0));right=Math.max(...proximos.map(p=>p.x1))+1;bottom=Math.max(...proximos.map(p=>p.y1))+1;
        usadas.push({x0:c.x0,y0:c.y0,x1:c.x1,y1:c.y1});
        if(c.pixels.length/((right-left)*(bottom-top))<.45)mascara="cor";
      }
    }
    const width=right-left,height=bottom-top,saida=Buffer.alloc(width*height*4);
    const bordas=[[],[],[]] as number[][];
    if(mascara==="recorte")for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(!x||!y||x===width-1||y===height-1){const p=((top+y)*largura+left+x)*4;for(let c=0;c<3;c++)bordas[c]!.push(data[p+c]!);}
    const fundo=bordas.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]??0);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const p=((top+y)*largura+left+x)*4,q=(y*width+x)*4;
      const dist=mascara==="recorte"?Math.max(...fundo.map((v,c)=>Math.abs(v-data[p+c]!))):distancia(p);
      const a=mascara==="elipse"?Math.max(0,Math.min(1,(1-Math.hypot((x+.5-width/2)/(width/2),(y+.5-height/2)/(height/2)))*Math.min(width,height)/2+.5))
        :mascara==="cor"?Math.max(0,Math.min(1,(105-dist)/40)):Math.max(0,Math.min(1,(dist-18)/35));
      for(let c=0;c<3;c++)saida[q+c]=data[p+c]!;
      saida[q+3]=Math.round(a*255);
    }
    return{id:`grafico-${i+1}`,nome:g.nome,x:left/largura*100,y:top/altura*100,w:width/largura*100,h:height/altura*100,imagem:`data:image/png;base64,${(await sharp(saida,{raw:{width,height,channels:4}}).png().toBuffer()).toString("base64")}`};
  }));
}
