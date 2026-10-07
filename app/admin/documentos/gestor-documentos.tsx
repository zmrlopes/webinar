"use client";
import { useRef,useState } from 'react';
import type { Documento } from '@/lib/documentos';
import { extrairTextoDocumento } from '@/lib/documentos-extrair';
import { FORMATOS_DOCUMENTOS,formatarTamanho,TAMANHO_PARTE,TAMANHO_MAX_DOCUMENTO,tipoDocumento } from '@/lib/documentos-formatos';
import s from '../../consultor/documentos/documentos.module.css';
async function pedido(url:string,opcoes?:RequestInit) {
  const r=await fetch(url,opcoes);
  const c=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(c.erro || `pedido falhou (${r.status})`);
  return c;
}
export function GestorDocumentos({iniciais}:{iniciais:Documento[]}) {
  const [itens,setItens]=useState(iniciais);
  const [ficheiros,setFicheiros]=useState<File[]>([]);
  const [titulo,setTitulo]=useState('');
  const [categoria,setCategoria]=useState('Geral');
  const [descricao,setDescricao]=useState('');
  const [texto,setTexto]=useState('');
  const [ocupado,setOcupado]=useState(false);
  const [progresso,setProgresso]=useState(0);
  const [mensagem,setMensagem]=useState('');
  const [erro,setErro]=useState('');
  const input=useRef<HTMLInputElement>(null);
  async function atualizar(){setItens((await pedido('/api/admin/documentos')).documentos);}
  async function enviar(e:React.FormEvent) {
    e.preventDefault();if(!ficheiros.length) return;
    setOcupado(true);setErro('');setMensagem('');setProgresso(0);
    let concluidos=0;
    const avisos:string[]=[];
    try {
      for(const f of ficheiros) {
        if(!tipoDocumento(f.name) || f.size>TAMANHO_MAX_DOCUMENTO || !f.size) throw new Error(`${f.name}: formato inválido ou tamanho superior a 1 GB`);
        setMensagem(`A ler ${f.name}…`);
        let extraido=ficheiros.length===1 ? texto.trim() : '';
        if(!extraido) {
          try {extraido=await extrairTextoDocumento(f.name,new Uint8Array(await f.arrayBuffer()));}
          catch {avisos.push(`${f.name}: não foi possível extrair texto`);}
        }
        const {id}=await pedido('/api/admin/documentos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:f.name,tamanho:f.size,titulo:ficheiros.length===1 ? titulo : f.name.replace(/\.[^.]+$/,''),categoria,descricao})});
        try {
          for(let offset=0;offset<f.size;offset+=TAMANHO_PARTE) {
            const parte=f.slice(offset,offset+TAMANHO_PARTE);
            const opcoes={method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:parte};
            let gravado=false;
            for(let tentativa=0;tentativa<3;tentativa++) {
              try {await pedido(`/api/admin/documentos/${id}?parte=${offset/TAMANHO_PARTE}`,opcoes);gravado=true;break;} catch(e) {if(tentativa===2) throw e;}
            }
            if(!gravado) throw new Error('falha no upload');
            setMensagem(`A enviar ${f.name}…`);
            setProgresso(Math.round((concluidos+Math.min(offset+TAMANHO_PARTE,f.size)/f.size)/ficheiros.length*100));
          }
          await pedido(`/api/admin/documentos/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:extraido})});
        } catch(e) {await pedido(`/api/admin/documentos/${id}`,{method:'DELETE'}).catch(()=>{});throw e;}
        if(!extraido) avisos.push(`${f.name}: disponível para download; sem texto para a base de conhecimento`);
        concluidos++;
      }
      setMensagem(`${concluidos} documento(s) publicado(s). ${avisos.join('. ')}`);
      setFicheiros([]);setTitulo('');setTexto('');if(input.current) input.current.value='';
    } catch(e) {setMensagem(concluidos ? `${concluidos} documento(s) já publicado(s).` : '');setErro(e instanceof Error ? e.message : 'falha no upload');}
    finally {await atualizar().catch(()=>{});setOcupado(false);}
  }
  async function alterar(d:Documento,apagar=false) {
    if(apagar && !window.confirm(`Apagar “${d.titulo}” e o respetivo conhecimento?`)) return;
    setOcupado(true);setErro('');
    try {await pedido(`/api/admin/documentos/${d.id}`,{method:apagar?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},body:apagar?undefined:JSON.stringify({publicado:!d.publicado})});await atualizar();}
    catch(e){setErro(e instanceof Error ? e.message : 'falha ao guardar');}
    finally{setOcupado(false);}
  }
  return <main className={s.pagina}><div className={s.caixa}><h1>Documentos</h1><p className={s.subtitulo}>Publica materiais para a equipa. O texto extraído fica disponível para o assistente de objeções.</p>
    <form onSubmit={e=>void enviar(e)} className={s.formulario}>
      <label>Ficheiros<input ref={input} disabled={ocupado} type="file" multiple required accept={Object.keys(FORMATOS_DOCUMENTOS).map(e=>'.'+e).join(',')} onChange={e=>{const files=Array.from(e.target.files||[]);setFicheiros(files);setTitulo(files[0]?.name.replace(/\.[^.]+$/,'')||'');}}/><small>PDF, PowerPoint, Word, Excel, TXT e CSV. Até 1 GB por ficheiro. Podes selecionar vários.</small></label>
      {ficheiros.length<=1 && <label>Título<input disabled={ocupado} required maxLength={250} value={titulo} onChange={e=>setTitulo(e.target.value)}/></label>}
      <label>Categoria<input disabled={ocupado} required maxLength={150} value={categoria} onChange={e=>setCategoria(e.target.value)} list="categorias-documentos"/><datalist id="categorias-documentos">{[...new Set(itens.map(d=>d.categoria))].map(c=><option key={c} value={c}/>)}</datalist></label>
      <label>Descrição<textarea disabled={ocupado} maxLength={2000} value={descricao} onChange={e=>setDescricao(e.target.value)}/></label>
      {ficheiros.length<=1 && <label>Texto para a base de conhecimento (opcional)<textarea disabled={ocupado} maxLength={2_000_000} value={texto} onChange={e=>setTexto(e.target.value)}/><small>Deixa vazio para extrair automaticamente. Para PDFs digitalizados e formatos antigos (.ppt, .doc, .xls), podes colar o texto aqui.</small></label>}
      <button disabled={ocupado || !ficheiros.length} className={s.botao}>Enviar e publicar</button>
      {ocupado && <progress aria-label="Progresso do upload" value={progresso} max={100}/>}
    </form>
    {mensagem && <p role="status" className={s.sucesso}>{mensagem}</p>}{erro && <p role="alert" className={s.erro}>{erro}</p>}
    <div className={s.grade}>{itens.map(d=><article key={d.id} className={s.cartao}><span className={s.etiqueta}>{d.categoria}</span><h2>{d.titulo}</h2><p className={s.meta}>{formatarTamanho(d.tamanho)} · {d.publicado?'Publicado':'Oculto'}</p><p className={s.meta}>{d.conhecimento_estado==='indexado'?'✓ Na base de conhecimento':'Sem texto na base de conhecimento'}</p><div className={s.acoes}><a href={`/api/admin/documentos/${d.id}`} className={`${s.botao} ${s.secundario}`}>Descarregar</a><button disabled={ocupado} onClick={()=>void alterar(d)} className={`${s.botao} ${s.secundario}`}>{d.publicado?'Ocultar':'Publicar'}</button><button disabled={ocupado} onClick={()=>void alterar(d,true)} className={`${s.botao} ${s.secundario}`}>Apagar</button></div></article>)}</div>
    {!itens.length && <p>Ainda não há documentos. Envia o primeiro acima.</p>}
  </div></main>;
}
