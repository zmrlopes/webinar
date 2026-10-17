import path from "node:path";
import sharp from "sharp";
import {createWorker,OEM,PSM,type Line} from "tesseract.js";
import {createCanvas,GlobalFonts} from "@napi-rs/canvas";
import {fonteReserva,pesoFonteReserva} from "./reservas-fontes";
import type {CaixaReserva} from "./reservas";
import type {TextoEditorPublicacao} from "./reservas-imagem-editor";
import type {EditorPublicacaoReserva} from "./reservas-imagem-editor";

const normalizar=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
function semelhanca(a:string,b:string){
  a=normalizar(a);b=normalizar(b);if(!a||!b)return 0;
  const linha=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let antes=linha[0]!;linha[0]=i;for(let j=1;j<=b.length;j++){const atual=linha[j]!;linha[j]=Math.min(linha[j]!+1,linha[j-1]!+1,antes+(a[i-1]===b[j-1]?0:1));antes=atual;}}
  return 1-linha[b.length]!/Math.max(a.length,b.length);
}
/** A visão sugere o estilo; o OCR local determina os limites reais das letras. */
export async function refinarTextosPublicacao(bytes:Buffer,textos:TextoEditorPublicacao[],largura:number,altura:number){
  const worker=await createWorker("por",OEM.LSTM_ONLY,{langPath:path.join(process.cwd(),"assets/ocr"),gzip:false,cacheMethod:"none",workerPath:path.join(process.cwd(),"node_modules/tesseract.js/src/worker-script/node/index.js"),corePath:path.join(process.cwd(),"node_modules/tesseract.js-core")});
  try{
    await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,user_defined_dpi:"150"});
    const ler=async(imagem:Buffer)=>{const {data}=await worker.recognize(imagem,{}, {blocks:true});return (data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines));};
    const originais=await ler(await sharp(bytes).png().toBuffer());
    const brancas=await ler(await sharp(bytes).greyscale().threshold(210).negate().png().toBuffer());
    const todas=[...originais,...brancas],saida:TextoEditorPublicacao[]=[];
    for(const t of textos){
      const blocos=t.texto.split("\n").map(v=>v.trim()).filter(Boolean);
      const encontrados:Line[]=[];
      for(const linha of blocos){
        const anterior=encontrados.at(-1),maiusculas=linha===linha.toUpperCase();
        const opcoes=todas.filter(l=>semelhanca(l.text,linha)>.64&&(!anterior||(l.bbox.y0>=anterior.bbox.y0+5&&l.bbox.y0-anterior.bbox.y1<Math.max(150,(anterior.bbox.y1-anterior.bbox.y0)*2)))).map(l=>({l,pontos:semelhanca(l.text,linha)*3+(l.confidence/100)*.25+((l.text.trim()===l.text.trim().toUpperCase())===maiusculas?.35:0)-(l.bbox.y1-l.bbox.y0)/altura*6})).sort((a,b)=>b.pontos-a.pontos);
        if(opcoes[0])encontrados.push(opcoes[0].l);
      }
      // Cada linha fica selecionável separadamente (datas, hotel, regime, preço...).
      if(encontrados.length===blocos.length){
        encontrados.forEach((l,i)=>{const {x0,y0,x1,y1}=l.bbox,pad=2;saida.push({...t,id:`${t.id}-${i}`,nome:blocos.length===1?t.nome:blocos[i]!.slice(0,80),texto:blocos[i]!,x:Math.max(0,x0-pad)/largura*100,y:Math.max(0,y0-pad)/altura*100,w:Math.min(largura-Math.max(0,x0-pad),x1-x0+pad*2)/largura*100,h:Math.min(altura-Math.max(0,y0-pad),y1-y0+pad*2)/altura*100});});
      }else saida.push(t);
    }
    // Recortes com transparência mantêm as letras originais ao trocar o fundo.
    for(const t of saida){
      const left=Math.max(0,Math.floor(t.x/100*largura)),top=Math.max(0,Math.floor(t.y/100*altura)),width=Math.min(largura-left,Math.ceil(t.w/100*largura)),height=Math.min(altura-top,Math.ceil(t.h/100*altura));
      const {data,info}=await sharp(bytes).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const rgb=[1,3,5].map(i=>parseInt(t.cor.slice(i,i+2),16));
      for(let p=0;p<data.length;p+=info.channels){const distancia=Math.max(...rgb.map((v,c)=>Math.abs(data[p+c]!-v)));data[p+3]=Math.round(255*Math.max(0,Math.min(1,(90-distancia)/55)));if(data[p+3]===0){data[p]=0;data[p+1]=0;data[p+2]=0;}}
      t.recorteOriginal=`data:image/png;base64,${(await sharp(data,{raw:info}).png().toBuffer()).toString("base64")}`;
      const fonte=fonteReserva(t.fonte);for(const f of fonte.ficheiros)if(!GlobalFonts.has(fonte.familia)||f.peso==="700")GlobalFonts.registerFromPath(path.join(process.cwd(),"public/fonts",f.url),fonte.familia);
      const ctx=createCanvas(1,1).getContext("2d");ctx.font=`${t.italico?"italic ":""}${pesoFonteReserva(t.fonte,t.negrito)} 100px ${fonte.familia}`;
      const medida=ctx.measureText(t.texto),h=medida.actualBoundingBoxAscent+medida.actualBoundingBoxDescent;
      if(h>0&&!t.texto.includes("\n"))t.tamanho=Math.max(10,Math.min(220,Math.round((height-4)/h*100)));
    }
    return saida;
  }finally{await worker.terminate();}
}
export async function decoracoesPublicacao(bytes:Buffer,textos:TextoEditorPublicacao[],largura:number,altura:number):Promise<EditorPublicacaoReserva["decoracoes"]>{
  const {data,info}=await sharp(bytes).resize({width:Math.round(largura/2),height:Math.round(altura/2)}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const saida:EditorPublicacaoReserva["decoracoes"]=[];
  for(const tipo of ["cartao","emoji"] as const){
    const vistos=new Uint8Array(info.width*info.height),valido=(p:number)=>{const i=p*info.channels,r=data[i]!,g=data[i+1]!,b=data[i+2]!;return tipo==="cartao"?Math.min(r,g,b)>235&&Math.max(r,g,b)-Math.min(r,g,b)<15:r>185&&g>95&&b<120&&r-b>100;};
    for(let p=0;p<vistos.length;p++){if(vistos[p]||!valido(p))continue;const fila=[p];vistos[p]=1;let x0=info.width,y0=info.height,x1=0,y1=0;
      for(let n=0;n<fila.length;n++){const q=fila[n]!,x=q%info.width,y=Math.floor(q/info.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const v of [x>0?q-1:-1,x<info.width-1?q+1:-1,y>0?q-info.width:-1,y<info.height-1?q+info.width:-1])if(v>=0&&!vistos[v]&&valido(v)){vistos[v]=1;fila.push(v);}}
      const w=x1-x0+1,h=y1-y0+1;
      if(tipo==="cartao"&&fila.length>700&&w>60&&w/h>1.4&&fila.length/(w*h)>.5){const b={x:x0/info.width*100,y:y0/info.height*100,w:w/info.width*100,h:h/info.height*100,tipo};if(textos.some(t=>t.x+t.w/2>b.x&&t.x+t.w/2<b.x+b.w&&t.y+t.h/2>b.y&&t.y+t.h/2<b.y+b.h))saida.push(b);}
      if(tipo==="emoji"&&fila.length>70&&w>10&&w<60&&h>10&&h<70){const size=Math.max(w,h)*1.15,cx=(x0+x1)/2,top=y1-size+3,b={x:Math.max(0,cx-size/2)/info.width*100,y:Math.max(0,top)/info.height*100,w:size/info.width*100,h:size/info.height*100,tipo};if(textos.some(t=>t.y<40&&b.x>=t.x+t.w-3&&b.x-t.x-t.w<12&&Math.abs(b.y-t.y)<6))saida.push(b);}
    }
  }
  return saida.slice(0,12);
}
/** Faz a fotografia retocada encontrar a cor original em todos os lados da antiga marca. */
export async function harmonizarMarcaPublicacao(original:Buffer,retocada:Buffer,marca:CaixaReserva,largura:number,altura:number){
  const alvo=await sharp(original).resize(largura,altura).ensureAlpha().raw().toBuffer(),limpo=await sharp(retocada).resize(largura,altura).ensureAlpha().raw().toBuffer(),saida=Buffer.from(limpo);
  const mx=Math.floor(marca.x/100*largura),my=Math.floor(marca.y/100*altura),mw=Math.ceil(marca.w/100*largura),mh=Math.ceil(marca.h/100*altura),left=Math.max(0,mx-28),top=Math.max(0,my-28),right=Math.min(largura-1,mx+mw+27),bottom=Math.min(altura-1,my+mh+27);
  const w=right-left+1,h=bottom-top+1,correcao=new Float32Array(w*h*3),media=[0,0,0],somas=[0,0,0],quadrados=[0,0,0];let n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!x||!y||x===w-1||y===h-1){const p=((top+y)*largura+left+x)*4;for(let c=0;c<3;c++){somas[c]!+=alvo[p+c]!;quadrados[c]!+=alvo[p+c]!**2;}n++;}
  // Céu, paredes e outros fundos suaves usam a continuação da fotografia original,
  // evitando inserir nuvens ou texturas novas num pequeno retângulo.
  const suave=somas.every((s,c)=>Math.sqrt(Math.max(0,quadrados[c]!/n-(s/n)**2))<25);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!x||!y||x===w-1||y===h-1){const p=((top+y)*largura+left+x)*4,q=(y*w+x)*3;for(let c=0;c<3;c++){correcao[q+c]=alvo[p+c]!-(suave?0:limpo[p+c]!);media[c]!+=correcao[q+c]!;}}
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)for(let c=0;c<3;c++)correcao[(y*w+x)*3+c]=media[c]!/Math.max(1,n);
  // A correção harmónica liga as margens sem projetar linhas ou grelhas para dentro da fotografia.
  for(let passo=0;passo<400;passo++){let diferenca=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const q=(y*w+x)*3;for(let c=0;c<3;c++){const atual=correcao[q+c]!,alvo=(correcao[q+c-3]!+correcao[q+c+3]!+correcao[q+c-w*3]!+correcao[q+c+w*3]!)/4,d=alvo-atual;correcao[q+c]=atual+1.8*d;diferenca=Math.max(diferenca,Math.abs(d));}}if(diferenca<.025)break;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=((top+y)*largura+left+x)*4,q=(y*w+x)*3,dist=Math.max(0,mx-3-left-x,left+x-mx-mw-2,my-3-top-y,top+y-my-mh-2),f=Math.min(1,dist/25),a=1-f*f*(3-2*f);for(let c=0;c<3;c++){const corrigido=(suave?0:limpo[p+c]!)+correcao[q+c]!;saida[p+c]=Math.max(0,Math.min(255,Math.round(limpo[p+c]!*(1-a)+corrigido*a)));}}
  return sharp(saida,{raw:{width:largura,height:altura,channels:4}}).webp({quality:94}).toBuffer();
}
/** Só retoca os píxeis das letras; conserva a luz e a textura fora dos glifos. */
export async function placaLimpaPublicacao(original:Buffer,retocada:Buffer,textos:TextoEditorPublicacao[],largura:number,altura:number,marca?:CaixaReserva){
  const alvo=await sharp(original).ensureAlpha().raw().toBuffer(),limpo=await sharp(retocada).resize(largura,altura).ensureAlpha().raw().toBuffer(),saida=Buffer.from(alvo);
  for(const t of textos){
    if(!t.recorteOriginal)continue;
    const left=Math.max(0,Math.floor(t.x/100*largura)),top=Math.max(0,Math.floor(t.y/100*altura)),w=Math.min(largura-left,Math.ceil(t.w/100*largura)),h=Math.min(altura-top,Math.ceil(t.h/100*altura));
    const {data,info}=await sharp(Buffer.from(t.recorteOriginal.split(",")[1]!,"base64")).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const amostras=[[],[],[]] as number[][];
    for(let y=Math.max(0,top-12);y<Math.min(altura,top+h+12);y+=3)for(let x=Math.max(0,left-12);x<Math.min(largura,left+w+12);x+=3){if(x>=left-2&&x<left+w+2&&y>=top-2&&y<top+h+2)continue;const p=(y*largura+x)*4;for(let c=0;c<3;c++)if(limpo[p+c]!>10)amostras[c]!.push(alvo[p+c]!/limpo[p+c]!);}
    const fatores=amostras.map(v=>{v.sort((a,b)=>a-b);return Math.max(.2,Math.min(2,v[Math.floor(v.length/2)]??1));});
    const mascara=Buffer.alloc((w+20)*(h+20));
    for(let y=0;y<Math.min(h,info.height);y++)for(let x=0;x<Math.min(w,info.width);x++){const a=data[(y*info.width+x)*4+3]!;if(a<12)continue;for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const p=(y+10+dy)*(w+20)+x+10+dx;mascara[p]=255;}}
    const suave=await sharp(mascara,{raw:{width:w+20,height:h+20,channels:1}}).greyscale().blur(1).raw().toBuffer();
    for(let y=-10;y<h+10;y++)for(let x=-10;x<w+10;x++){const xx=left+x,yy=top+y;if(xx<0||yy<0||xx>=largura||yy>=altura)continue;const a=suave[(y+10)*(w+20)+x+10]!/255;if(!a)continue;const p=(yy*largura+xx)*4;for(let c=0;c<3;c++)saida[p+c]=Math.round(saida[p+c]!*(1-a)+Math.min(255,limpo[p+c]!*fatores[c]!)*a);}
  }
  if(marca){const left=Math.max(0,Math.floor(marca.x/100*largura)-6),top=Math.max(0,Math.floor(marca.y/100*altura)-6),right=Math.min(largura,Math.ceil((marca.x+marca.w)/100*largura)+6),bottom=Math.min(altura,Math.ceil((marca.y+marca.h)/100*altura)+6);for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const p=(y*largura+x)*4,a=Math.min(1,(x-left+1)/3,(right-x)/3,(y-top+1)/3,(bottom-y)/3);for(let c=0;c<3;c++)saida[p+c]=Math.round(saida[p+c]!*(1-a)+limpo[p+c]!*a);}}
  const placa=await sharp(saida,{raw:{width:largura,height:altura,channels:4}}).webp({quality:94}).toBuffer();
  return marca?harmonizarMarcaPublicacao(original,placa,marca,largura,altura):placa;
}
