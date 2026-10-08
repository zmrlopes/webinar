"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { Documento } from '@/lib/documentos';
import type { PastaDocumentos } from '@/lib/documentos-pastas';
import { BibliotecaPastas } from './biblioteca-pastas';
import { lerEmailGuardado } from '../armazenamento';
import s from './documentos.module.css';
type Item=Documento & {url:string};
export function DocumentosPagina({embutida=false}:{embutida?:boolean}={}) {
  const [itens,setItens]=useState<Item[]>([]);
  const [pastas,setPastas]=useState<PastaDocumentos[]>([]);
  const [estado,setEstado]=useState('carregar');
  const [erro,setErro]=useState('');
  async function carregar() {
    const email=lerEmailGuardado();
    if(!email) { setEstado('identificar'); return; }
    try {
      const r=await fetch('/api/consultor/documentos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const c=await r.json();
      if(!r.ok) throw new Error(c.erro || 'não foi possível carregar os documentos');
      setItens(c.documentos); setPastas(c.pastas??[]); setEstado('pronto');
    } catch(e) {setErro(e instanceof Error ? e.message : 'falha de ligação');setEstado('erro');}
  }
  useEffect(()=>{void carregar(); const timer=setInterval(()=>void carregar(),50*60*1000);return()=>clearInterval(timer);},[]);
  const Contentor=embutida ? 'div' : 'main';
  return <Contentor className={`${s.pagina}${embutida ? ` ${s.embutida}` : ''}`}><div className={s.caixa}>
    {!embutida && <><Link href="/consultor" className={s.voltar}>← Voltar ao painel</Link>
    <h1>Documentos</h1><p className={s.subtitulo}>Apresentações, guias e materiais de apoio para o teu negócio.</p></>}
    {estado==='carregar' && <p>A carregar documentos…</p>}
    {estado==='identificar' && <p>Primeiro identifica-te no <Link href="/consultor">painel do consultor</Link>.</p>}
    {estado==='erro' && <><p role="alert" className={s.erro}>{erro}</p><button className={s.botao} onClick={()=>void carregar()}>Tentar novamente</button></>}
    {estado==='pronto' && <BibliotecaPastas itens={itens} pastas={pastas}/>}
  </div></Contentor>;
}
