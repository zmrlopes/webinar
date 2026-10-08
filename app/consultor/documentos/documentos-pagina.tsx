"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { Documento } from '@/lib/documentos';
import type { PastaDocumentos } from '@/lib/documentos-pastas';
import { BibliotecaPastas } from './biblioteca-pastas';
import { formatarTamanho } from '@/lib/documentos-formatos';
import { lerEmailGuardado } from '../armazenamento';
import s from './documentos.module.css';
type Item=Documento & {url:string};
export function DocumentosPagina({embutida=false}:{embutida?:boolean}={}) {
  const [itens,setItens]=useState<Item[]>([]);
  const [pastas,setPastas]=useState<PastaDocumentos[]>([]);
  const [estado,setEstado]=useState('carregar');
  const [erro,setErro]=useState('');
  const [pesquisa,setPesquisa]=useState('');
  const [categoria,setCategoria]=useState('');
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
  const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visiveis=itens.filter(d=>(!categoria || d.categoria===categoria) && normalizar(`${d.titulo} ${d.nome} ${d.descricao} ${d.categoria}`).includes(normalizar(pesquisa)));
  const Contentor=embutida ? 'div' : 'main';
  return <Contentor className={`${s.pagina}${embutida ? ` ${s.embutida}` : ''}`}><div className={s.caixa}>
    {!embutida && <><Link href="/consultor" className={s.voltar}>← Voltar ao painel</Link>
    <h1>Documentos</h1><p className={s.subtitulo}>Apresentações, guias e materiais de apoio para o teu negócio.</p></>}
    {estado==='carregar' && <p>A carregar documentos…</p>}
    {estado==='identificar' && <p>Primeiro identifica-te no <Link href="/consultor">painel do consultor</Link>.</p>}
    {estado==='erro' && <><p role="alert" className={s.erro}>{erro}</p><button className={s.botao} onClick={()=>void carregar()}>Tentar novamente</button></>}
    {estado==='pronto' && embutida && <BibliotecaPastas itens={itens} pastas={pastas}/>}
    {estado==='pronto' && !embutida && <>
      <div className={s.filtros}><input type="search" aria-label="Pesquisar documentos" placeholder="Pesquisar documento ou orador…" value={pesquisa} onChange={e=>setPesquisa(e.target.value)}/><select aria-label="Categoria" value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{[...new Set(itens.map(d=>d.categoria))].sort().map(c=><option key={c}>{c}</option>)}</select></div>
      <p className={s.meta}>{visiveis.length} {visiveis.length===1 ? 'documento' : 'documentos'}</p>
      <div className={s.grade}>{visiveis.map(d=><article className={s.cartao} key={d.id}><span className={s.etiqueta}>{d.categoria}</span><h2>{d.titulo}</h2>{d.descricao && <p>{d.descricao}</p>}<p className={s.meta}>{d.nome.split('.').pop()?.toUpperCase()} · {formatarTamanho(d.tamanho)}</p><div className={s.acoes}><a className={s.botao} href={d.url}>Descarregar</a></div></article>)}</div>
      {!visiveis.length && <p className={s.subtitulo}>{itens.length ? 'Nenhum documento corresponde à pesquisa.' : 'Ainda não há documentos disponíveis.'}</p>}
    </>}
  </div></Contentor>;
}
