"use client";
import {useEffect,useRef,useState,type ChangeEvent,type PointerEvent} from 'react';
import {desenharEstudio,elementoEstudio,validarProjetoEstudio,type ElementoEstudio,type ProjetoEstudio} from '@/lib/reservas-estudio';
import {carregarFonteReserva,comprimirImagemReserva} from '@/lib/reservas-canvas';
import {dimensoesReserva} from '@/lib/reservas';
import {FONTES_EDITOR_PUBLICACAO} from '@/lib/reservas-imagem-editor';
import css from './reservas-estudio.module.css';
type Props={projeto:ProjetoEstudio;ocupado:boolean;onGuardar:(p:ProjetoEstudio)=>Promise<void>;onFechar:()=>void;onAlterado:(v:boolean)=>void};
export function EstudioReservas({projeto,ocupado,onGuardar,onFechar,onAlterado}:Props){
  const [p,setP]=useState(()=>structuredClone(projeto)),[selecionado,setSelecionado]=useState(''),[aba,setAba]=useState('Camadas'),[zoom,setZoom]=useState(45),[erro,setErro]=useState(''),[pronto,setPronto]=useState(false),[carregando,setCarregando]=useState(false),[versao,setVersao]=useState(0);
  const atual=useRef(p),canvas=useRef<HTMLCanvasElement>(null),input=useRef<HTMLInputElement>(null),inputProjeto=useRef<HTMLInputElement>(null),destinoImagem=useRef(''),cache=useRef(new Map<string,Promise<HTMLImageElement>>()),passado=useRef<ProjetoEstudio[]>([]),futuro=useRef<ProjetoEstudio[]>([]);
  const raiz=useRef<HTMLElement>(null),visor=useRef<HTMLDivElement>(null);
  const arrasto=useRef<{px:number;py:number;elemento:ElementoEstudio;antes:ProjetoEstudio;redimensionar:boolean}|null>(null);
  const e=p.elementos.find(e=>e.id===selecionado),{largura,altura}=dimensoesReserva(p.formato),alterado=JSON.stringify(p)!==JSON.stringify(projeto),bloqueado=ocupado||carregando;
  useEffect(()=>{onAlterado(alterado);},[alterado,onAlterado]);
  function ajustarZoom(){if(visor.current)setZoom(Math.max(10,Math.min(100,Math.floor(Math.min((visor.current.clientWidth-48)/largura,(window.innerWidth<=700?450:680)/altura)*100))));}
  useEffect(()=>{const observer=new ResizeObserver(ajustarZoom);if(visor.current)observer.observe(visor.current);return()=>observer.disconnect();},[largura,altura]);
  function substituir(n:ProjetoEstudio){atual.current=n;setP(n);}
  function mudar(n:ProjetoEstudio){if(bloqueado)return;passado.current=[...passado.current.slice(-39),atual.current];futuro.current=[];substituir(n);setVersao(v=>v+1);}
  function desfazer(){const n=passado.current.pop();if(n){futuro.current.push(atual.current);substituir(n);setVersao(v=>v+1);}}
  function refazer(){const n=futuro.current.pop();if(n){passado.current.push(atual.current);substituir(n);setVersao(v=>v+1);}}
  function patch(v:Partial<ElementoEstudio>,texto=false){if(!e||e.bloqueado&&v.bloqueado!==false)return;mudar({...p,elementos:p.elementos.map(n=>n.id===e.id?{...n,...v,...(texto?{recorte:''}:{})}:n)});}
  function apagar(){if(!e||e.tipo==='marca'||e.bloqueado)return;mudar({...p,elementos:p.elementos.filter(n=>n.id!==e.id)});setSelecionado('');}
  function restaurar(){mudar(structuredClone(projeto));setSelecionado('');setErro('');}
  function duplicar(){if(!e||e.tipo==='marca'||e.bloqueado)return;const n={...e,id:crypto.randomUUID(),nome:(e.nome+' · cópia').slice(0,100),x:Math.min(100-e.w,e.x+2),y:Math.min(100-e.h,e.y+2)};mudar({...p,elementos:[...p.elementos,n]});setSelecionado(n.id);}
  function adicionar(tipo:'texto'|'forma',figura:'retangulo'|'elipse'='retangulo'){const n=elementoEstudio(tipo,crypto.randomUUID());n.figura=figura;n.nome=tipo==='texto'?'Novo texto':figura==='elipse'?'Elipse':'Retângulo';mudar({...p,elementos:[...p.elementos,n]});setSelecionado(n.id);setAba(tipo==='texto'?'Texto':'Elementos');}
  function ordenar(delta:number){if(!e||e.bloqueado)return;const elementos=[...p.elementos],i=elementos.findIndex(n=>n.id===e.id),j=Math.max(0,Math.min(elementos.length-1,i+delta));elementos.splice(i,1);elementos.splice(j,0,e);mudar({...p,elementos});}
  function imagem(src:string){let promessa=cache.current.get(src);if(!promessa){promessa=new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{cache.current.delete(src);reject(Error('Não foi possível abrir uma imagem.'));};i.src=src;});cache.current.set(src,promessa);}return promessa;}
  useEffect(()=>{let vivo=true;setPronto(false);void(async()=>{try{await Promise.all([...new Set(p.elementos.filter(e=>e.tipo==='texto').map(e=>e.fonte))].map(carregarFonteReserva));const imgs=new Map<string,CanvasImageSource>();await Promise.all(Object.entries(p.recursos).map(async([id,src])=>imgs.set(id,await imagem(src))));if(!vivo||!canvas.current)return;canvas.current.width=largura;canvas.current.height=altura;desenharEstudio(canvas.current.getContext('2d')!,p,imgs);setPronto(true);}catch(ex){if(vivo)setErro(ex instanceof Error?ex.message:'Não foi possível desenhar.');}})();return()=>{vivo=false;};},[p,largura,altura]);
  useEffect(()=>{function tecla(ev:KeyboardEvent){if(bloqueado||!(ev.target instanceof HTMLElement)||!raiz.current?.contains(ev.target)||ev.target.closest('input,textarea,select,[contenteditable]'))return;const ctrl=ev.ctrlKey||ev.metaKey;
    if(ctrl&&ev.key.toLowerCase()==='z'){ev.preventDefault();if(ev.shiftKey)refazer();else desfazer();}
    else if(ctrl&&ev.key.toLowerCase()==='y'){ev.preventDefault();refazer();}
    else if(ctrl&&ev.key.toLowerCase()==='d'){ev.preventDefault();duplicar();}
    else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();apagar();}
    else if(e&&!e.bloqueado&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();const passo=ev.shiftKey?1:.1;patch({x:Math.max(0,Math.min(100-e.w,e.x+(ev.key==='ArrowLeft'?-passo:ev.key==='ArrowRight'?passo:0))),y:Math.max(0,Math.min(100-e.h,e.y+(ev.key==='ArrowUp'?-passo:ev.key==='ArrowDown'?passo:0)))});}
  }window.addEventListener('keydown',tecla);return()=>window.removeEventListener('keydown',tecla);});
  function inicio(ev:PointerEvent<HTMLElement>,n:ElementoEstudio,redimensionar=false){ev.stopPropagation();setSelecionado(n.id);if(n.bloqueado||bloqueado)return;arrasto.current={px:ev.clientX,py:ev.clientY,elemento:n,antes:atual.current,redimensionar};ev.currentTarget.setPointerCapture(ev.pointerId);}
  function mover(ev:PointerEvent<HTMLElement>){const a=arrasto.current,rect=canvas.current?.getBoundingClientRect();if(!a||!rect)return;const n=a.elemento,dx=(ev.clientX-a.px)/rect.width*100,dy=(ev.clientY-a.py)/rect.height*100;let patch:Partial<ElementoEstudio>;
    if(a.redimensionar){const rad=n.rotacao*Math.PI/180,px=dx*largura/100,py=dy*altura/100,w=Math.max(1,Math.min(100-n.x,n.w+(px*Math.cos(rad)+py*Math.sin(rad))/largura*100)),h=Math.max(1,Math.min(100-n.y,n.h+(-px*Math.sin(rad)+py*Math.cos(rad))/altura*100));if(n.tipo==='marca'||ev.shiftKey){const escala=Math.min(w/n.w,h/n.h);patch={w:n.w*escala,h:n.h*escala};}else patch={w,h};}
    else patch={x:Math.max(0,Math.min(100-n.w,n.x+dx)),y:Math.max(0,Math.min(100-n.h,n.y+dy))};
    substituir({...a.antes,elementos:a.antes.elementos.map(e=>e.id===n.id?{...e,...patch}:e)});
  }
  function terminar(){const a=arrasto.current;if(a&&JSON.stringify(a.antes)!==JSON.stringify(atual.current)){passado.current=[...passado.current.slice(-39),a.antes];futuro.current=[];setVersao(v=>v+1);}arrasto.current=null;}
  function cancelarArrasto(){if(arrasto.current)substituir(arrasto.current.antes);arrasto.current=null;}
  async function carregar(ev:ChangeEvent<HTMLInputElement>){const file=ev.target.files?.[0];ev.target.value='';if(!file)return;setCarregando(true);setErro('');try{const src=await comprimirImagemReserva(file),id=crypto.randomUUID(),novo=atual.current,recursos={...novo.recursos,[id]:src};let proximo:ProjetoEstudio;
    if(destinoImagem.current==='fundo')proximo={...novo,recursos,fundo:id};
    else if(destinoImagem.current)proximo={...novo,recursos,elementos:novo.elementos.map(e=>e.id===destinoImagem.current?{...e,recurso:id}:e)};
    else{const n={...elementoEstudio('imagem',id),nome:file.name.slice(0,100),recurso:id,h:30};proximo={...novo,recursos,elementos:[...novo.elementos,n]};setSelecionado(id);}
    const validado=validarProjetoEstudio(proximo,projeto);passado.current=[...passado.current.slice(-39),novo];futuro.current=[];substituir(validado);setVersao(v=>v+1);
  }catch(ex){setErro(ex instanceof Error?ex.message:'Não foi possível abrir a imagem.');}finally{setCarregando(false);}}
  function escolherImagem(destino=''){destinoImagem.current=destino;input.current?.click();}
  function descarregar(blob:Blob,nome:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportar(){if(pronto)canvas.current?.toBlob(b=>{if(b)descarregar(b,'publicacao.png');},'image/png');}
  async function importar(ev:ChangeEvent<HTMLInputElement>){const f=ev.target.files?.[0];ev.target.value='';if(!f)return;try{if(f.size>3_900_000)throw Error('Escolhe um projeto até 3,9 MB.');mudar(validarProjetoEstudio(JSON.parse(await f.text()),projeto));setSelecionado('');}catch(ex){setErro(ex instanceof Error?ex.message:'Projeto inválido.');}}
  async function guardar(){try{setErro('');await onGuardar(validarProjetoEstudio(p,projeto));}catch(ex){setErro(ex instanceof Error?ex.message:'Revê o projeto.');}}
  function fechar(){if(!alterado||window.confirm('Fechar o editor e descartar os ajustes por guardar?')){onAlterado(false);onFechar();}}
  function numero(label:string,campo:'x'|'y'|'w'|'h'|'rotacao'|'tamanho'|'raio',min:number,max:number){if(!e)return null;return <label>{label}<input type="number" aria-label={label} min={min} max={max} step={campo==='tamanho'?1:.1} value={Math.round(e[campo]*10)/10} onChange={ev=>{const n=Number(ev.target.value);if(Number.isFinite(n))patch({[campo]:Math.max(min,Math.min(max,n))},campo==='tamanho');}}/></label>;}
  return <section ref={raiz} className={css.estudio} aria-label="Estúdio de templates" data-historico={versao}>
    <header className={css.topo}><div><strong>Estúdio de templates</strong><span>{alterado?'Alterações por guardar':'Versão guardada'} · {p.formato==='story'?'Story':'Feed'}</span></div><div className={css.acoes}>
      <button disabled={bloqueado||!passado.current.length} onClick={desfazer} title="Ctrl+Z">↶ Desfazer</button><button disabled={bloqueado||!futuro.current.length} onClick={refazer} title="Ctrl+Shift+Z">↷ Refazer</button>
      <button disabled={bloqueado||!alterado} onClick={restaurar}>Restaurar versão aberta</button>
      <button disabled={bloqueado||!pronto} onClick={exportar}>Descarregar PNG</button><button className={css.primario} disabled={bloqueado||!pronto} onClick={guardar}>Guardar versão</button><button disabled={bloqueado} onClick={fechar}>Fechar</button>
    </div></header>
    {erro&&<p role="alert" className={css.erro}>{erro}</p>}
    <input type="file" ref={input} hidden accept="image/png,image/jpeg,image/webp" onChange={ev=>void carregar(ev)}/><input type="file" ref={inputProjeto} hidden accept="application/json,.json" onChange={ev=>void importar(ev)}/>
    <div className={css.corpo}><nav className={css.ferramentas} aria-label="Ferramentas do editor">{[['Elementos','◇'],['Texto','T'],['Imagens','▧'],['Camadas','▤'],['Projeto','▱']].map(([nome,icone])=><button type="button" key={nome} aria-pressed={aba===nome} onClick={()=>setAba(nome!)}><b>{icone}</b>{nome}</button>)}</nav>
      <aside className={css.painel}><fieldset disabled={bloqueado}><h3>{aba}</h3>
        {aba==='Texto'&&<button onClick={()=>adicionar('texto')}>＋ Acrescentar texto</button>}
        {aba==='Elementos'&&<div className={css.acoes}><button onClick={()=>adicionar('forma')}>▭ Retângulo</button><button onClick={()=>adicionar('forma','elipse')}>○ Elipse</button><button onClick={()=>{const n={...elementoEstudio('sombra',crypto.randomUUID()),nome:'Degradé',cor:'#000000',sombra:{x:0,y:0,w:100,h:100,cor:'#000000',direcao:'baixo' as const,paragens:[{posicao:0,opacidade:0},{posicao:1,opacidade:.8}]}};mudar({...p,elementos:[...p.elementos,n]});setSelecionado(n.id);}}>▥ Degradé</button></div>}
        {aba==='Imagens'&&<><button onClick={()=>escolherImagem()}>＋ Adicionar imagem</button><h4>Fotografia de fundo</h4><button onClick={()=>escolherImagem('fundo')}>Trocar fotografia</button><button onClick={()=>mudar({...p,fundo:''})}>Usar só cor</button><label>Cor do fundo<input type="color" value={p.corFundo} onChange={ev=>mudar({...p,corFundo:ev.target.value})}/></label></>}
        {aba==='Projeto'&&<><label>Formato<select value={p.formato} onChange={ev=>mudar({...p,formato:ev.target.value as ProjetoEstudio['formato']})}><option value="story">Story · 1080 × 1920</option><option value="feed">Feed · 1080 × 1350</option></select></label><p>Revê a composição depois de mudar o formato.</p><button onClick={()=>descarregar(new Blob([JSON.stringify(p)],{type:'application/json'}),'template-editavel.json')}>Descarregar projeto editável</button><button onClick={()=>inputProjeto.current?.click()}>Importar projeto editável</button></>}
        {aba==='Camadas'&&<><p>Do topo para o fundo. Escolhe uma camada para editar.</p><ol className={css.camadas}>{[...p.elementos].reverse().map(n=><li key={n.id}><button aria-pressed={selecionado===n.id} onClick={()=>setSelecionado(n.id)}><span>{n.tipo==='texto'?'T':n.tipo==='marca'?'◆':n.tipo==='imagem'?'▧':'◇'}</span><span>{n.nome}</span><small>{n.bloqueado?'🔒':n.oculto?'Oculto':''}</small></button></li>)}</ol></>}
        {e&&<div className={css.propriedades}><h4>Elemento selecionado</h4><label>Nome<input value={e.nome} maxLength={100} onChange={ev=>patch({nome:ev.target.value})} disabled={e.bloqueado}/></label><button onClick={()=>patch({bloqueado:!e.bloqueado})}>{e.bloqueado?'Desbloquear':'Bloquear'}</button><fieldset disabled={e.bloqueado}>
          {e.tipo==='texto'&&<><label>Texto<textarea rows={3} maxLength={1600} value={e.texto} onChange={ev=>patch({texto:ev.target.value},true)}/></label><label>Tipo de letra<select value={e.fonte} onChange={ev=>patch({fonte:ev.target.value as ElementoEstudio['fonte']},true)}>{FONTES_EDITOR_PUBLICACAO.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>{numero('Tamanho da letra','tamanho',10,220)}<label>Alinhamento<select value={e.alinhar} onChange={ev=>patch({alinhar:ev.target.value as ElementoEstudio['alinhar']},true)}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><div className={css.acoes}><button aria-pressed={e.negrito} onClick={()=>patch({negrito:!e.negrito},true)}><b>Negrito</b></button><button aria-pressed={e.italico} onClick={()=>patch({italico:!e.italico},true)}><i>Itálico</i></button></div><p>Aumenta a caixa se o texto não couber.</p></>}
          {['texto','forma','sombra'].includes(e.tipo)&&<><label>Cor<input type="color" value={e.cor} onChange={ev=>patch({cor:ev.target.value},e.tipo==='texto')}/></label>{projeto.elementos.some(n=>n.id===e.id&&n.cor!==e.cor)&&<button onClick={()=>patch({cor:projeto.elementos.find(n=>n.id===e.id)!.cor},e.tipo==='texto')}>Repor cor da versão aberta</button>}</>}
          {e.tipo==='texto'&&<button aria-pressed={e.sombraTexto===true} onClick={()=>patch({sombraTexto:!e.sombraTexto})}>Sombra das letras</button>}
          {e.tipo==='forma'&&e.figura==='retangulo'&&numero('Cantos arredondados','raio',0,50)}
          {e.tipo==='imagem'&&<><button onClick={()=>escolherImagem(e.id)}>Trocar esta imagem</button><label>Enquadramento<select value={e.ajuste} onChange={ev=>patch({ajuste:ev.target.value as 'cover'|'contain'})}><option value="contain">Imagem completa</option><option value="cover">Preencher a caixa</option></select></label></>}
          <div className={css.grelha}>{numero('X (%)','x',0,100-e.w)}{numero('Y (%)','y',0,100-e.h)}{numero('Largura (%)','w',.1,100-e.x)}{numero('Altura (%)','h',.1,100-e.y)}</div>{numero('Rotação (°)','rotacao',-180,180)}
          {e.tipo!=='marca'&&<><label>Opacidade · {Math.round(e.opacidade*100)}%<input type="range" min={0} max={100} value={Math.round(e.opacidade*100)} onChange={ev=>patch({opacidade:Number(ev.target.value)/100})}/></label><button onClick={()=>patch({oculto:!e.oculto})}>{e.oculto?'Mostrar':'Ocultar'}</button></>}
          <div className={css.acoes}><button onClick={()=>patch({x:(100-e.w)/2})}>Centrar ↔</button><button onClick={()=>patch({y:(100-e.h)/2})}>Centrar ↕</button><button onClick={()=>ordenar(1)}>Trazer à frente</button><button onClick={()=>ordenar(-1)}>Enviar atrás</button>{e.tipo!=='marca'&&<><button onClick={duplicar}>Duplicar</button><button onClick={apagar}>Eliminar</button></>}</div>
          {e.tipo==='marca'&&<p>O desenho iCliGo mantém-se protegido. Podes mudar o tamanho e a posição.</p>}</fieldset></div>}
        {!e&&aba!=='Projeto'&&<p>Seleciona um elemento na tela ou nas Camadas.</p>}
      </fieldset></aside>
      <div className={css.area}><div className={css.zoom}><span>{largura} × {altura}</span><button type="button" onClick={ajustarZoom}>Ajustar</button><label>Zoom <input aria-label="Zoom" type="range" min={10} max={100} value={zoom} onChange={ev=>setZoom(Number(ev.target.value))}/>{zoom}%</label></div><div ref={visor} className={css.rolar}><div className={css.tela} style={{width:largura*zoom/100,height:altura*zoom/100}} onPointerDown={()=>setSelecionado('')}>
        <canvas ref={canvas} aria-label="Publicação editável"/>
        {p.elementos.filter(n=>!n.oculto).map(n=><div key={n.id} role="button" tabIndex={0} aria-label={'Selecionar '+n.nome} aria-pressed={selecionado===n.id} className={css.alvo} data-selecionado={selecionado===n.id} data-bloqueado={n.bloqueado} style={{left:n.x+'%',top:n.y+'%',width:n.w+'%',height:n.h+'%',transform:'rotate('+n.rotacao+'deg)'}} onFocus={()=>setSelecionado(n.id)} onPointerDown={ev=>inicio(ev,n)} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={cancelarArrasto} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setSelecionado(n.id);setAba(n.tipo==='texto'?'Texto':n.tipo==='imagem'?'Imagens':'Elementos');}}}>
          {selecionado===n.id&&!n.bloqueado&&<button type="button" className={css.pega} aria-label={'Redimensionar '+n.nome} onPointerDown={ev=>inicio(ev,n,true)} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={cancelarArrasto}/>}
        </div>)}
      </div></div><footer>{carregando?'A carregar a imagem…':!pronto?'A preparar a pré-visualização…':'Arrasta para mover · canto para redimensionar · setas para ajustar · Ctrl+Z para desfazer'}</footer></div>
    </div>
  </section>;
}
