import {ErroReserva, imagemReserva, dimensoesReserva, type FormatoReserva} from './reservas';
import {FONTES_EDITOR_PUBLICACAO, conteudoTextoPublicacao, type EditorPublicacaoReserva} from './reservas-imagem-editor';
import {fonteReserva, pesoFonteReserva, type FonteReserva} from './reservas-fontes';
import {desenharSombreadosPublicacao, validarSombreadosPublicacao, type SombreadoPublicacao} from './reservas-imagem-sombras';

export interface ElementoEstudio {
  id:string; tipo:'texto'|'forma'|'imagem'|'marca'|'sombra'; nome:string;
  x:number;y:number;w:number;h:number;rotacao:number;opacidade:number;bloqueado:boolean;oculto:boolean;
  texto:string;fonte:FonteReserva;tamanho:number;cor:string;negrito:boolean;italico:boolean;sombraTexto?:boolean;alinhar:'left'|'center'|'right';
  figura:'retangulo'|'elipse'|'poligono';raio:number;pontos:{x:number;y:number}[];
  recurso:string;recorte:string;ajuste:'cover'|'contain';sombra?:SombreadoPublicacao;
}
export interface ProjetoEstudio {versao:1;formato:FormatoReserva;fundo:string;corFundo:string;elementos:ElementoEstudio[];recursos:Record<string,string>}
export function elementoEstudio(tipo:ElementoEstudio['tipo'],id:string):ElementoEstudio {
  return {id,tipo,nome:tipo==='texto'?'Novo texto':tipo==='imagem'?'Imagem':'Forma',x:25,y:35,w:50,h:15,rotacao:0,opacidade:1,bloqueado:false,oculto:false,texto:'Escreve aqui',fonte:'poppins',tamanho:48,cor:'#4b5320',negrito:false,italico:false,alinhar:'left',figura:'retangulo',raio:0,pontos:[],recurso:'',recorte:'',ajuste:'contain'};
}
export function projetoDoEditor(editor:EditorPublicacaoReserva,formato:FormatoReserva,fundo:string):ProjetoEstudio {
  const recursos:Record<string,string>={fundo,marca:editor.logoBranco!};
  const elementos:ElementoEstudio[]=[];
  for(const [i,s] of (editor.sombreados??[]).entries())elementos.push({...elementoEstudio('sombra',`sombra-${i}`),...s,nome:'Sombreado',sombra:s});
  for(const f of editor.formas??[])elementos.push({...elementoEstudio('forma',f.id),...f,cor:editor.ajustes.formas?.find(a=>a.id===f.id)?.cor??f.cor});
  for(const g of editor.graficos??[]){recursos[g.id]=g.imagem;elementos.push({...elementoEstudio('imagem',g.id),x:g.x,y:g.y,w:g.w,h:g.h,nome:g.nome,recurso:g.id});}
  for(const t of editor.textos){const a=editor.ajustes.textos.find(a=>a.id===t.id)!;
    const recorte=a.manterOriginal!==false&&conteudoTextoPublicacao(t,a)===t.texto&&a.fonte===t.fonte&&a.cor===t.cor&&a.negrito===t.negrito&&a.italico===t.italico&&t.recorteOriginal;
    if(recorte)recursos[t.id]=recorte;
    const escala=recorte?a.tamanho/t.tamanho:1;
    elementos.push({...elementoEstudio('texto',t.id),x:a.x,y:a.y,w:Math.min(100-a.x,t.w*escala),h:Math.min(100-a.y,t.h*escala),nome:t.nome,texto:conteudoTextoPublicacao(t,a),fonte:a.fonte,tamanho:a.tamanho,cor:a.cor,negrito:a.negrito,italico:a.italico,sombraTexto:t.sombra,alinhar:t.alinhar,oculto:a.apagado===true,recorte:recorte?t.id:''});
  }
  elementos.push({...elementoEstudio('marca','marca'),...editor.marca,...editor.ajustes.marca,nome:'iCliGo · marca protegida',recurso:'marca'});
  if(editor.ajustes.fundo){recursos.fundo=editor.ajustes.fundo;if(editor.ajustes.escurecimento)elementos.unshift({...elementoEstudio('sombra','escurecimento'),x:0,y:0,w:100,h:100,cor:'#000000',nome:'Escurecimento',sombra:{x:0,y:0,w:100,h:100,cor:'#000000',direcao:'baixo',paragens:[{posicao:0,opacidade:editor.ajustes.escurecimento*.4},{posicao:1,opacidade:editor.ajustes.escurecimento}]}});}
  return {versao:1,formato,fundo:'fundo',corFundo:'#ffffff',elementos,recursos};
}
const numero=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const cor=(c:unknown):c is string=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
export function validarProjetoEstudio(valor:unknown,original:ProjetoEstudio):ProjetoEstudio {
  const v=valor as ProjetoEstudio;
  if(!v||v.versao!==1||!['story','feed'].includes(v.formato)||!cor(v.corFundo)||!Array.isArray(v.elementos)||v.elementos.length>100||!v.recursos||typeof v.recursos!=='object'||Array.isArray(v.recursos)||Object.keys(v.recursos).length>100)throw new ErroReserva('O projeto do editor é inválido.');
  const recursos:Record<string,string>=Object.create(null);
  for(const [id,imagem] of Object.entries(v.recursos)){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new ErroReserva('Recurso inválido.');recursos[id]=id==='marca'?original.recursos.marca!:imagemReserva(imagem,1_500_000);if(!recursos[id])throw new ErroReserva('Uma imagem já não está disponível.');}
  recursos.marca=original.recursos.marca!;
  if(v.fundo!==''&&(typeof v.fundo!=='string'||v.fundo==='marca'||!Object.hasOwn(recursos,v.fundo)))throw new ErroReserva('Escolhe uma imagem de fundo válida.');
  const ids=new Set<string>();let marcas=0;
  const elementos=v.elementos.map(e=>{
    if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(e.id)||ids.has(e.id)||!['texto','forma','imagem','marca','sombra'].includes(e.tipo)||typeof e.nome!=='string'||e.nome.length>100)throw new ErroReserva('Elemento inválido.');ids.add(e.id);
    if(!numero(e.x,0,100)||!numero(e.y,0,100)||!numero(e.w,.1,100)||!numero(e.h,.1,100)||e.x+e.w>100.01||e.y+e.h>100.01||!numero(e.rotacao,-180,180)||!numero(e.opacidade,0,1)||typeof e.bloqueado!=='boolean'||typeof e.oculto!=='boolean')throw new ErroReserva('Revê a posição e o tamanho dos elementos.');
    if(typeof e.texto!=='string'||e.texto.length>1600||!FONTES_EDITOR_PUBLICACAO.some(f=>f.id===e.fonte)||!numero(e.tamanho,10,220)||!cor(e.cor)||typeof e.negrito!=='boolean'||typeof e.italico!=='boolean'||e.sombraTexto!==undefined&&typeof e.sombraTexto!=='boolean'||!['left','center','right'].includes(e.alinhar))throw new ErroReserva('Revê o texto e o estilo.');
    if(!['retangulo','elipse','poligono'].includes(e.figura)||!numero(e.raio,0,50)||!Array.isArray(e.pontos)||e.pontos.length>64||e.pontos.some(p=>!p||!numero(p.x,0,100)||!numero(p.y,0,100))||e.figura==='poligono'&&e.pontos.length<3)throw new ErroReserva('Forma inválida.');
    if(!['cover','contain'].includes(e.ajuste)||typeof e.recurso!=='string'||typeof e.recorte!=='string')throw new ErroReserva('Imagem inválida.');
    if(e.tipo==='marca'){marcas++;if(e.id!=='marca'||e.recurso!=='marca'||e.oculto||e.opacidade!==1||e.recorte)throw new ErroReserva('O desenho da marca iCliGo está protegido.');}
    else if(e.id==='marca'||e.recurso==='marca'||e.recorte==='marca')throw new ErroReserva('A marca iCliGo não pode ser duplicada.');
    if(e.tipo==='imagem'&&!Object.hasOwn(recursos,e.recurso)||e.recorte&&!Object.hasOwn(recursos,e.recorte))throw new ErroReserva('Uma imagem já não está disponível.');
    if(e.recorte&&e.tipo!=='texto')throw new ErroReserva('O recorte só pode pertencer a um texto.');
    const sombra=e.tipo==='sombra'?validarSombreadosPublicacao([{...e.sombra,x:0,y:0,w:100,h:100}])[0]:undefined;
    return {...elementoEstudio(e.tipo,e.id),nome:e.nome,x:e.x,y:e.y,w:e.w,h:e.h,rotacao:e.rotacao,opacidade:e.opacidade,bloqueado:e.bloqueado,oculto:e.oculto,texto:e.texto,fonte:e.fonte,tamanho:e.tamanho,cor:e.cor,negrito:e.negrito,italico:e.italico,sombraTexto:e.sombraTexto===true,alinhar:e.alinhar,figura:e.figura,raio:e.raio,pontos:e.pontos.map(p=>({x:p.x,y:p.y})),recurso:e.recurso,recorte:e.recorte,ajuste:e.ajuste,...(sombra?{sombra}:{})};
  });
  if(marcas!==1)throw new ErroReserva('Mantém uma única marca iCliGo na publicação.');
  const usados=new Set([v.fundo,'marca',...elementos.flatMap(e=>[e.recurso,e.recorte])]);
  const projeto:ProjetoEstudio={versao:1,formato:v.formato,fundo:v.fundo,corFundo:v.corFundo,elementos,recursos:Object.fromEntries(Object.entries(recursos).filter(([id])=>usados.has(id)))};
  if(JSON.stringify(projeto).length>3_900_000)throw new ErroReserva('O projeto tem demasiadas imagens. Remove as que não precisas.');
  return projeto;
}
function desenharImagem(ctx:CanvasRenderingContext2D,img:CanvasImageSource,w:number,h:number,ajuste:'cover'|'contain'){
  const i=img as HTMLImageElement,iw=i.naturalWidth||i.width,ih=i.naturalHeight||i.height,s=ajuste==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.drawImage(img,(w-iw*s)/2,(h-ih*s)/2,iw*s,ih*s);ctx.restore();
}
export function desenharEstudio(ctx:CanvasRenderingContext2D,p:ProjetoEstudio,imagens:Map<string,CanvasImageSource>){
  const {largura:W,altura:H}=dimensoesReserva(p.formato);ctx.clearRect(0,0,W,H);ctx.fillStyle=p.corFundo;ctx.fillRect(0,0,W,H);
  const fundo=imagens.get(p.fundo);if(fundo)desenharImagem(ctx,fundo,W,H,'cover');
  for(const e of p.elementos){if(e.oculto)continue;const w=e.w/100*W,h=e.h/100*H;ctx.save();ctx.translate((e.x+e.w/2)/100*W,(e.y+e.h/2)/100*H);ctx.rotate(e.rotacao*Math.PI/180);ctx.translate(-w/2,-h/2);ctx.globalAlpha=e.opacidade;
    if(e.tipo==='forma'){ctx.beginPath();if(e.figura==='elipse')ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);else if(e.figura==='poligono'){e.pontos.forEach((p,i)=>i?ctx.lineTo(p.x/100*w,p.y/100*h):ctx.moveTo(p.x/100*w,p.y/100*h));ctx.closePath();}else ctx.roundRect(0,0,w,h,e.raio/100*Math.min(w,h));ctx.fillStyle=e.cor;ctx.fill();}
    if(e.tipo==='sombra'&&e.sombra)desenharSombreadosPublicacao(ctx,[{...e.sombra,x:0,y:0,w:100,h:100,cor:e.cor}],w,h);
    if(e.tipo==='imagem'||e.tipo==='marca'){const img=imagens.get(e.recurso);if(img)desenharImagem(ctx,img,w,h,e.tipo==='marca'?'contain':e.ajuste);}
    if(e.tipo==='texto'){
      if(e.sombraTexto){ctx.shadowColor='#00000099';ctx.shadowBlur=Math.max(2,e.tamanho*.08);ctx.shadowOffsetY=2;}
      const original=e.recorte&&imagens.get(e.recorte);
      if(original)ctx.drawImage(original,0,0,w,h);
      else {ctx.font=`${e.italico?'italic ':''}${pesoFonteReserva(e.fonte,e.negrito)} ${e.tamanho}px ${fonteReserva(e.fonte).familia}`;ctx.fillStyle=e.cor;ctx.textAlign=e.alinhar;ctx.textBaseline='alphabetic';
        const linhas:string[]=[];for(const paragrafo of e.texto.split('\n')){let linha='';for(const palavra of paragrafo.split(/\s+/)){const candidata=linha?`${linha} ${palavra}`:palavra;if(linha&&ctx.measureText(candidata).width>w){linhas.push(linha);linha=palavra;}else linha=candidata;}linhas.push(linha);}
        const subida=Math.max(...linhas.map(l=>ctx.measureText(l||'Ag').actualBoundingBoxAscent));
        const x=e.alinhar==='center'?w/2:e.alinhar==='right'?w:0;ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();linhas.forEach((l,i)=>ctx.fillText(l,x,subida+i*e.tamanho*1.15));
      }
    }ctx.restore();
  }
}
