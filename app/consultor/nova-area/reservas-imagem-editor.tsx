"use client";

import {useEffect,useRef,useState,type ChangeEvent} from "react";
import {carregarFonteReserva,comprimirImagemReserva} from "@/lib/reservas-canvas";
import {dimensoesReserva,type FormatoReserva} from "@/lib/reservas";
import {fonteReserva,type FonteReserva} from "@/lib/reservas-fontes";
import {FONTES_EDITOR_PUBLICACAO,desenharEditorPublicacao,prepararTextoEditor,type AjustesEditorPublicacao,type EditorPublicacaoReserva,type EstiloTextoPublicacao} from "@/lib/reservas-imagem-editor";
import css from "./reservas.module.css";
import styles from "./reservas-imagem-editor.module.css";

type Foto={titulo:string;url:string;credito:string};
type Props={email:string;destino:string;formato:FormatoReserva;editor:EditorPublicacaoReserva;ocupado:boolean;onGuardar:(ajustes:AjustesEditorPublicacao)=>Promise<void>;onFechar:()=>void;onAlterado:(valor:boolean)=>void};
export function EditorRapidoPublicacao({email,destino,formato,editor,ocupado,onGuardar,onFechar,onAlterado}:Props){
  const [ajustes,setAjustes]=useState(()=>structuredClone(editor.ajustes)),[selecionado,setSelecionado]=useState(editor.textos[0]?.id??"");
  const [erro,setErro]=useState(""),[carregando,setCarregando]=useState(false),[pronto,setPronto]=useState(false),[fotos,setFotos]=useState<Foto[]>([]),[podeDesfazer,setPodeDesfazer]=useState(false);
  const [alturas,setAlturas]=useState<Record<string,number>>({});
  const canvas=useRef<HTMLCanvasElement>(null),inputFundo=useRef<HTMLInputElement>(null),historico=useRef<AjustesEditorPublicacao[]>([]),imagens=useRef(new Map<string,Promise<HTMLImageElement>>());
  const inicioArrasto=useRef<{id:string;px:number;py:number;x:number;y:number;antes:AjustesEditorPublicacao;guardou:boolean}|null>(null);
  const {largura,altura}=dimensoesReserva(formato),texto=editor.textos.find(t=>t.id===selecionado),estilo=ajustes.textos.find(t=>t.id===selecionado);
  const alterado=JSON.stringify(ajustes)!==JSON.stringify(editor.ajustes),desativado=ocupado||carregando;
  useEffect(()=>{onAlterado(alterado);},[alterado,onAlterado]);
  function imagem(src:string){let p=imagens.current.get(src);if(!p){p=new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{imagens.current.delete(src);reject(new Error("Não foi possível abrir a imagem de fundo."));};img.src=src;});if(imagens.current.size>8)imagens.current.clear();imagens.current.set(src,p);}return p;}
  useEffect(()=>{
    let vivo=true;setPronto(false);
    void (async()=>{
      try{
        await Promise.all([...new Set([...ajustes.textos.map(t=>t.fonte),"poppins" as const])].map(carregarFonteReserva));
        const [original,limpo,fundo]=await Promise.all([imagem(editor.imagemOriginal),imagem(editor.fundoLimpo),ajustes.fundo?imagem(ajustes.fundo):null]);
        if(!vivo||!canvas.current)return;
        const auxiliar=document.createElement("canvas");auxiliar.width=largura;auxiliar.height=altura;const ctx=auxiliar.getContext("2d")!;
        const recortes=new Map<string,CanvasImageSource>();await Promise.all(editor.textos.filter(t=>t.recorteOriginal).map(async t=>recortes.set(t.id,await imagem(t.recorteOriginal!))));
        if(!vivo||!canvas.current)return;
        desenharEditorPublicacao(ctx,original,limpo,fundo,editor,ajustes,largura,altura,recortes);
        canvas.current.width=largura;canvas.current.height=altura;canvas.current.getContext("2d")!.drawImage(auxiliar,0,0);
        setAlturas(Object.fromEntries(editor.textos.map(t=>[t.id,Math.max(t.h,prepararTextoEditor(ctx,t,ajustes.textos.find(e=>e.id===t.id)!,largura).altura/altura*100)])));
        setErro("");setPronto(true);
      }catch(e){if(vivo)setErro(e instanceof Error?e.message:"Não foi possível preparar a pré-visualização.");}
    })();return()=>{vivo=false;};
  },[editor,ajustes,largura,altura]); // eslint-disable-line react-hooks/exhaustive-deps
  function lembrar(antes:AjustesEditorPublicacao){historico.current=[...historico.current.slice(-11),antes];setPodeDesfazer(true);}
  function alterar(proximo:AjustesEditorPublicacao){lembrar(ajustes);setAjustes(proximo);}
  function mudarTexto(patch:Partial<EstiloTextoPublicacao>){if(!estilo)return;alterar({...ajustes,textos:ajustes.textos.map(t=>t.id===selecionado?{...t,...patch}:t)});}
  function desfazer(){const anterior=historico.current.pop();if(anterior)setAjustes(anterior);setPodeDesfazer(historico.current.length>0);}
  async function fazer(acao:()=>Promise<void>){if(desativado)return;setCarregando(true);setErro("");try{await acao();}catch(e){setErro(e instanceof Error?e.message:"Não foi possível escolher esta imagem.");}finally{setCarregando(false);}}
  async function carregarFundo(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];e.target.value="";if(f)await fazer(async()=>alterar({...ajustes,fundo:await comprimirImagemReserva(f),credito:""}));}
  async function pedirFoto<T>(acao:string,extra:Record<string,unknown>):Promise<T>{const r=await fetch("/api/consultor/nova-area/reservas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,acao,...extra})});const c=await r.json();if(!r.ok)throw new Error(c.erro||"Não foi possível obter a fotografia.");return c;}
  function mover(e:React.PointerEvent<HTMLButtonElement>){
    const arrasto=inicioArrasto.current,ret=canvas.current?.getBoundingClientRect();if(!arrasto||!ret||desativado)return;
    const dx=(e.clientX-arrasto.px)/ret.width*100,dy=(e.clientY-arrasto.py)/ret.height*100;if(Math.abs(dx)+Math.abs(dy)<.4)return;
    if(!arrasto.guardou){lembrar(arrasto.antes);arrasto.guardou=true;}
    const t=editor.textos.find(t=>t.id===arrasto.id)!;
    setAjustes(a=>({...a,textos:a.textos.map(v=>v.id===arrasto.id?{...v,x:Math.max(0,Math.min(100-t.w,arrasto.x+dx)),y:Math.max(0,Math.min(98-(alturas[t.id]??t.h),arrasto.y+dy))}:v)}));
  }
  function fechar(){if(!alterado||window.confirm("Fechar o editor e descartar estes ajustes?")){onAlterado(false);onFechar();}}
  return <section className={styles.editor} aria-label="Editor rápido da publicação">
    <header className={styles.cabecalho}><div><h3>Edita a tua publicação</h3><p>Clica num texto para mudar a letra. Podes arrastá-lo para ajustar a posição.</p></div><div className={css.acoes}><button type="button" disabled={desativado||!podeDesfazer} onClick={desfazer}>↶ Desfazer</button><button type="button" disabled={desativado} onClick={fechar}>Fechar editor</button></div></header>
    {erro&&<p role="alert" className={css.erro}>{erro}</p>}
    <div className={styles.corpo}>
      <div className={styles.previsualizacao}><div className={styles.tela} style={{aspectRatio:`${largura}/${altura}`}}>
        <canvas ref={canvas} aria-label="Pré-visualização editável da publicação"/>
        {editor.textos.map(t=>{const s=ajustes.textos.find(v=>v.id===t.id)!;return <button type="button" key={t.id} className={styles.alvo} data-selecionado={t.id===selecionado} disabled={desativado} aria-label={`Editar ${t.nome}`} aria-pressed={t.id===selecionado} style={{left:`${s.x}%`,top:`${s.y}%`,width:`${t.w}%`,height:`${alturas[t.id]??t.h}%`}} onClick={()=>setSelecionado(t.id)} onPointerDown={e=>{if(desativado)return;setSelecionado(t.id);inicioArrasto.current={id:t.id,px:e.clientX,py:e.clientY,x:s.x,y:s.y,antes:ajustes,guardou:false};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={mover} onPointerUp={()=>{inicioArrasto.current=null;}} onPointerCancel={()=>{inicioArrasto.current=null;}}/>;})}
      </div><p className={styles.marca}>A marca iCliGo está protegida.</p></div>
      <fieldset className={styles.controles} disabled={desativado}>
        <label className={css.campo}><span>Texto selecionado</span><select value={selecionado} onChange={e=>setSelecionado(e.target.value)}>{editor.textos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
        {texto&&estilo&&<><p className={styles.amostra}>{texto.texto}</p>
          <label className={css.campo}><span>Tipo de letra</span><select aria-label="Tipo de letra da publicação" value={estilo.manterOriginal!==false?"original":estilo.fonte} style={{fontFamily:fonteReserva(estilo.fonte).familia}} onChange={e=>mudarTexto(e.target.value==="original"?{fonte:texto.fonte,manterOriginal:true}:{fonte:e.target.value as FonteReserva,manterOriginal:false})}><option value="original">Letra original</option>{FONTES_EDITOR_PUBLICACAO.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
          <div className={styles.linha}><label className={css.campo}><span>Tamanho da letra</span><input type="number" aria-label="Tamanho da letra da publicação" min={10} max={220} step={1} value={Math.round(estilo.tamanho)} onChange={e=>mudarTexto({tamanho:Math.max(10,Math.min(220,Number(e.target.value)||10))})}/></label><label className={css.campo}><span>Cor</span><input type="color" aria-label="Cor da letra da publicação" value={estilo.cor} onChange={e=>mudarTexto({cor:e.target.value})}/></label></div>
          <div className={css.acoes}><button type="button" aria-label="Negrito na publicação" aria-pressed={estilo.negrito} onClick={()=>mudarTexto({negrito:!estilo.negrito})}><strong>B</strong></button><button type="button" aria-label="Itálico na publicação" aria-pressed={estilo.italico} onClick={()=>mudarTexto({italico:!estilo.italico})}><em>I</em></button><button type="button" onClick={()=>{const t=editor.textos.find(t=>t.id===selecionado)!;mudarTexto({fonte:t.fonte,tamanho:t.tamanho,cor:t.cor,negrito:t.negrito,italico:t.italico,x:t.x,y:t.y,manterOriginal:true});}}>Repor este texto</button></div>
        </>}
        <div className={styles.fundo}><h4>Imagem de fundo</h4><p>Escolhe uma fotografia tua ou uma sugestão do destino.</p>
          <input ref={inputFundo} type="file" accept="image/png,image/jpeg,image/webp" className={css.inputOculto} aria-label="Imagem de fundo da publicação" onChange={e=>void carregarFundo(e)}/>
          {ajustes.fundo&&<img src={ajustes.fundo} alt="Imagem escolhida para fundo"/>}
          <div className={css.acoes}><button type="button" onClick={()=>inputFundo.current?.click()}>Carregar imagem de fundo</button><button type="button" onClick={()=>void fazer(async()=>{const r=await pedirFoto<{fotografias:Foto[]}>("fotografias",{destino});setFotos(r.fotografias.slice(0,6));})}>Sugestões de {destino}</button></div>
          {fotos.length>0&&<div className={styles.fotos}>{fotos.map(f=><button type="button" key={f.url} onClick={()=>void fazer(async()=>{const r=await pedirFoto<{imagem:string}>("usar-foto",{url:f.url});alterar({...ajustes,fundo:r.imagem,credito:f.credito});})}><img src={f.url} alt={f.titulo} loading="lazy"/><small>{f.titulo}</small></button>)}</div>}
          {ajustes.fundo&&<><label className={css.campo}><span>Escurecer fundo · {Math.round(ajustes.escurecimento*100)}%</span><input aria-label="Escurecer imagem de fundo" type="range" min={0} max={85} value={Math.round(ajustes.escurecimento*100)} onChange={e=>alterar({...ajustes,escurecimento:Number(e.target.value)/100})}/></label><button type="button" onClick={()=>alterar({...ajustes,fundo:"",credito:""})}>Repor fundo original</button></>}
        </div>
        {carregando&&<p role="status">A preparar a fotografia…</p>}
        <button type="button" className={css.primario} disabled={!alterado||!pronto} onClick={()=>void onGuardar(ajustes)}>Guardar versão editada</button><p className={styles.nota}>A publicação anterior mantém-se no histórico.</p>
      </fieldset>
    </div>
  </section>;
}
