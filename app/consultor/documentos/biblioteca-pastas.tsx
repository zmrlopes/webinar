"use client";
import { useState } from 'react';
import type { Documento } from '@/lib/documentos';
import type { PastaDocumentos } from '@/lib/documentos-pastas';
import { formatarTamanho } from '@/lib/documentos-formatos';
import s from './documentos.module.css';

type Item = Documento & {url: string};
const normalizar = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function IconePasta() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;
}
export function BibliotecaPastas({itens,pastas}: {itens: Item[]; pastas: PastaDocumentos[]}) {
  const [pastaAtiva,setPastaAtiva]=useState<string|null>(null);
  const [pesquisa,setPesquisa]=useState('');
  const semPasta=itens.filter(d=>!d.pasta_id).length;
  const todasPastas=[...pastas,...(semPasta ? [{id:'sem-pasta',nome:'Sem pasta',total:semPasta}] : [])];
  const nomePasta=(id: string|null) => todasPastas.find(p=>p.id===id)?.nome ?? 'Sem pasta';
  const visiveis=itens.filter(d=>(pastaAtiva===null || (pastaAtiva==='sem-pasta' ? !d.pasta_id : d.pasta_id===pastaAtiva)) && normalizar(`${d.titulo} ${d.nome} ${d.descricao} ${d.categoria} ${nomePasta(d.pasta_id)}`).includes(normalizar(pesquisa.trim())));
  function abrir(id: string|null) {setPastaAtiva(id);setPesquisa('');}
  const mostraDocumentos=pastaAtiva!==null || !!pesquisa.trim();
  return <div>
    <nav className={s.caminhoPastas} aria-label="Localização nos documentos">
      {pastaAtiva===null ? <strong>Documentos</strong> : <><button type="button" onClick={()=>abrir(null)}>← Todas as pastas</button><span aria-hidden="true">/</span><strong aria-current="page">{nomePasta(pastaAtiva)}</strong></>}
    </nav>
    <div className={s.filtros}><input type="search" aria-label="Pesquisar documentos" placeholder={pastaAtiva===null ? 'Pesquisar em todas as pastas…' : 'Pesquisar nesta pasta…'} value={pesquisa} onChange={e=>setPesquisa(e.target.value)}/></div>
    {!mostraDocumentos && <>
      <p className={s.meta}>Abre uma pasta para consultar os documentos.</p>
      <div className={s.gradePastas}>{todasPastas.map(p=><button type="button" key={p.id} className={s.cartaoPasta} onClick={()=>abrir(p.id)}>
        <span className={s.iconePasta}><IconePasta /></span><span className={s.nomePasta}><strong>{p.nome}</strong><span>{p.total} {p.total===1 ? 'documento' : 'documentos'}</span></span><span className={s.setaPasta} aria-hidden="true">→</span>
      </button>)}</div>
      {!todasPastas.length && <p className={s.subtitulo}>Ainda não há documentos disponíveis.</p>}
    </>}
    {mostraDocumentos && <>
      <p className={s.meta}>{visiveis.length} {visiveis.length===1 ? 'documento' : 'documentos'}{pastaAtiva===null ? ' encontrados' : ' nesta pasta'}</p>
      <div className={s.grade}>{visiveis.map(d=><article className={s.cartao} key={d.id}>
        {pastaAtiva===null && <button type="button" className={s.linkPasta} onClick={()=>abrir(d.pasta_id??'sem-pasta')}>Pasta: {nomePasta(d.pasta_id)}</button>}
        <span className={s.etiqueta}>{d.categoria}</span><h2>{d.titulo}</h2>{d.descricao && <p>{d.descricao}</p>}
        <p className={s.meta}>{d.nome.split('.').pop()?.toUpperCase()} · {formatarTamanho(d.tamanho)}</p><div className={s.acoes}><a className={s.botao} href={d.url}>Descarregar</a></div>
      </article>)}</div>
      {!visiveis.length && <p className={s.subtitulo}>{pesquisa.trim() ? 'Nenhum documento corresponde à pesquisa.' : 'Ainda não há documentos nesta pasta.'}</p>}
    </>}
  </div>;
}
