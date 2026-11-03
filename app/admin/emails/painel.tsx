'use client';
import { useEffect, useState } from 'react';
import styles from './painel.module.css';
type Lista={id:string;nome:string;descricao:string};
type Campanha={id:string;assunto:string;corpo:string;agendado_em:string;cancelado_em:string|null;total:number;enviados:number;pendentes:number;incertos:number};
type Destinatario={email:string;estado:string;erro:string|null};
const dataTexto=(d:string)=>new Date(d).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'short',timeStyle:'short'});
export default function PainelEmails() {
 const [listas,setListas]=useState<Lista[]>([]),[campanhas,setCampanhas]=useState<Campanha[]>([]);
 const [selecionadas,setSelecionadas]=useState<string[]>([]),[pesquisa,setPesquisa]=useState('');
 const [assunto,setAssunto]=useState(''),[corpo,setCorpo]=useState(''),[data,setData]=useState('');
 const [previsao,setPrevisao]=useState<{total:number;amostra:string[]}|null>(null);
 const [rever,setRever]=useState(false),[ocupado,setOcupado]=useState(false),[aviso,setAviso]=useState(''),[configurado,setConfigurado]=useState(true);
 const [detalhe,setDetalhe]=useState<{campanha:Campanha;destinatarios:Destinatario[]}|null>(null);
 async function carregar() {
  try {
   const r=await fetch('/api/admin/emails',{cache:'no-store'});
   if(!r.ok) throw new Error('Não foi possível carregar os emails. Verifica as migrações e o acesso de admin.');
   const v=await r.json(); setListas(v.listas);setCampanhas(v.campanhas);setConfigurado(v.configurado);
  } catch(e) {setAviso(e instanceof Error?e.message:'Falha de ligação.');}
 }
 useEffect(()=>{void carregar();const t=setInterval(()=>{if(document.visibilityState==='visible') void carregar();},15000);return ()=>clearInterval(t);},[]);
 async function pedir(v:object) {
  const r=await fetch('/api/admin/emails',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
  const d=await r.json();if(!r.ok) throw new Error(d.erro||'Não foi possível concluir.');return d;
 }
 async function preparar(e:React.FormEvent) {
  e.preventDefault();setOcupado(true);setAviso('');
  try { const p=await pedir({acao:'prever',listas:selecionadas});setPrevisao(p);setRever(true); }
  catch(e) {setAviso(e instanceof Error?e.message:'Falha de ligação.');} finally {setOcupado(false);}
 }
 async function agendar() {
  setOcupado(true);setAviso('');
  try {
   const r=await pedir({acao:'agendar',listas:selecionadas,assunto,corpo,data});
   setAviso(`Email agendado para ${r.total} destinatários. A lista ficou guardada neste agendamento.`);setRever(false);setAssunto('');setCorpo('');setData('');await carregar();
  } catch(e) {setAviso(e instanceof Error?e.message:'Falha de ligação.');} finally {setOcupado(false);}
 }
 return <main className={styles.pagina}>
  <h1>Emails</h1><p>Escreve a mensagem, escolhe as listas e agenda o envio.</p>
  {!configurado&&<p role="alert">O envio de campanhas requer a configuração da Brevo (BREVO_API_KEY).</p>}
  {aviso&&<p role="status" className={styles.aviso}>{aviso}</p>}
  <form onSubmit={preparar} className={styles.form}>
   <fieldset disabled={ocupado||rever}><legend>1. Destinatários</legend>
    <input aria-label="Pesquisar listas" placeholder="Pesquisar lista, nome ou email da líder…" value={pesquisa} onChange={e=>setPesquisa(e.target.value)}/>
    <div className={styles.listas}>{listas.filter(l=>(l.nome+' '+l.descricao).toLocaleLowerCase('pt').includes(pesquisa.toLocaleLowerCase('pt'))).map(l=><label key={l.id} className={styles.lista}>
     <input type="checkbox" checked={selecionadas.includes(l.id)} onChange={e=>{setSelecionadas(e.target.checked?[...selecionadas,l.id]:selecionadas.filter(id=>id!==l.id));setPrevisao(null);}}/>
     <span><strong>{l.nome}</strong><small>{l.descricao}</small></span>
    </label>)}</div>
    <p>{selecionadas.length} listas selecionadas. Cada email recebe apenas uma cópia, mesmo que apareça em várias listas.</p>
   </fieldset>
   <fieldset disabled={ocupado||rever}><legend>2. Mensagem</legend>
    <label>Assunto<input required maxLength={200} value={assunto} onChange={e=>setAssunto(e.target.value)}/></label>
    <label>Corpo do email<textarea required maxLength={50000} rows={12} value={corpo} onChange={e=>setCorpo(e.target.value)} placeholder="Escreve o texto do email. Podes incluir links completos."/></label>
    <small>Texto simples, com as quebras de linha e os links que escreveres. Cada destinatário recebe um email individual.</small>
    <label>Data e hora de envio — Lisboa<input type="datetime-local" required value={data} onChange={e=>setData(e.target.value)}/></label>
    <small>O processamento começa na primeira execução automática após a hora escolhida (a cada minuto). Listas grandes são enviadas por lotes.</small>
   </fieldset>
   {!rever&&<button disabled={ocupado||!configurado||!selecionadas.length} type="submit">{ocupado?'A preparar…':'Rever agendamento'}</button>}
  </form>
  {rever&&previsao&&<section className={styles.caixa}>
   <h2>Confirmar agendamento</h2>
   <p><strong>{previsao.total} destinatários únicos</strong> · {data.replace('T',' às ')} (Lisboa)</p>
   <p>{listas.filter(l=>selecionadas.includes(l.id)).map(l=>l.nome).join(' · ')}</p>
   <h3>{assunto}</h3><pre>{corpo}</pre>
   <details><summary>Ver amostra dos destinatários (até 20)</summary>{previsao.amostra.map(e=><div key={e}>{e}</div>)}</details>
   <p>A lista é fixada ao confirmar; inscrições posteriores não entram neste envio.</p>
   <button type="button" disabled={ocupado||!previsao.total} onClick={()=>void agendar()}>{ocupado?'A agendar…':'Confirmar e agendar'}</button>{' '}
   <button type="button" disabled={ocupado} onClick={()=>setRever(false)}>Voltar a editar</button>
  </section>}
  <section className={styles.caixa}><h2>Agendamentos e histórico</h2><button type="button" onClick={()=>void carregar()}>Atualizar</button>
   {!campanhas.length&&<p>Ainda não há envios agendados.</p>}
   {campanhas.map(c=><article className={styles.campanha} key={c.id}>
    <h3>{c.assunto}</h3><p>{dataTexto(c.agendado_em)} · {c.cancelado_em?'Cancelado':c.enviados===c.total?'Concluído':c.pendentes===c.total?'Agendado':'Em processamento'}</p>
    <p>{c.total} destinatários · {c.enviados} aceites pelo fornecedor · {c.pendentes} {c.cancelado_em?'cancelados':'por enviar'} · {c.incertos} a verificar</p>
    <button type="button" onClick={async()=>{try {const r=await fetch(`/api/admin/emails?id=${c.id}`,{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();setDetalhe({campanha:c,destinatarios:d.destinatarios});}catch{setAviso('Não foi possível abrir o detalhe.');}}}>Ver mensagem e destinatários</button>{' '}
    {!c.cancelado_em&&c.pendentes>0&&<button type="button" disabled={ocupado} onClick={async()=>{setOcupado(true);try{await pedir({acao:'cancelar',id:c.id});setAviso('Envio cancelado. Emails já em processamento podem ainda ser entregues.');await carregar();}catch{setAviso('Não foi possível cancelar.');}finally{setOcupado(false);}}}>Cancelar emails por enviar</button>}
   </article>)}
  </section>
  {detalhe&&<section className={styles.caixa}><h2>{detalhe.campanha.assunto}</h2><pre>{detalhe.campanha.corpo}</pre><button onClick={()=>setDetalhe(null)}>Fechar detalhe</button>
   <p>“Enviado” significa aceite pela Brevo. Envios incertos precisam de verificação no fornecedor e não são repetidos automaticamente.</p>
   <div className={styles.listas}>{detalhe.destinatarios.map(d=><p key={d.email}>{d.email} — {d.estado}{d.erro&&` · ${d.erro}`}</p>)}</div>
  </section>}
 </main>;
}
