import nextEnv from '@next/env';
import { readFile,readdir,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { neon,neonConfig } from '@neondatabase/serverless';
import { extrairTextoDocumento } from '../src/lib/documentos-extrair';
import { fragmentarTexto,TAMANHO_PARTE,tipoDocumento } from '../src/lib/documentos-formatos';
import { otimizarPdf } from './documentos-otimizar';
const { loadEnvConfig } = nextEnv;
neonConfig.fetchFunction=async(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>{
  for(let tentativa=0;;tentativa++) {
    try {return await fetch(input,init);}
    catch(e) {if(tentativa>=3) throw e;await new Promise(r=>setTimeout(r,1000*(tentativa+1)));}
  }
};
loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL) loadEnvConfig(path.resolve('..'),false,console,true);
const sql=neon(process.env.DATABASE_URL!);
const dir=path.resolve(process.argv.find(a=>a.startsWith('--pasta='))?.slice(8)||'docs/be a leader madrid');
const otimizar=process.argv.includes('--otimizar');
const preparacao=process.argv.includes('--preparar');
const cache=path.resolve('.documentos-importacao');
async function main() {
  await mkdir(cache,{recursive:true});
  if(!preparacao) {
    const nome='047_documentos.sql';
    const migration=await readFile(path.join('migrations',nome),'utf8');
    await sql.transaction([...migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)),sql.query('insert into schema_migrations(nome) values($1) on conflict do nothing',[nome])]);
    for(const pastasNome of ['049_documentos_pastas.sql','050_documentos_pasta_madrid.sql','051_documentos_pasta_be_a_leader.sql']) {
      if(!(await sql.query('select nome from schema_migrations where nome=$1',[pastasNome])).length){
        const pastasMigration=await readFile(path.join('migrations',pastasNome),'utf8');
        await sql.transaction([...pastasMigration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)),sql.query('insert into schema_migrations(nome) values($1) on conflict do nothing',[pastasNome])]);
      }
    }
  }
  if(process.argv.includes('--schema')) { console.log('Migração de documentos aplicada.');return; }
  for(const nome of (await readdir(dir)).filter(n=>n.toLowerCase().endsWith('.pdf')).sort()) {
    const caminho=path.join(dir,nome);
    const origem=new Uint8Array(await readFile(caminho));
    const hash=createHash('sha256').update(origem).digest('hex');
    if(!preparacao) {
      const ja=await sql.query("select id from documentos where sha256=$1 and estado='pronto'",[hash]);
      if(ja.length) {console.log(`JÁ IMPORTADO ${nome}`);continue;}
    }
    const ficheiroCache=path.join(cache,hash+(otimizar?'.v3':'')+'.pdf');
    const textoCache=path.join(cache,hash+(otimizar?'.v3':'')+'.txt');
    let bytes:Uint8Array,texto:string;
    try {bytes=new Uint8Array(await readFile(ficheiroCache));texto=await readFile(textoCache,'utf8');}
    catch {
      texto=await extrairTextoDocumento(nome,origem.slice());
      if(!texto) texto=await readFile(caminho.replace(/\.pdf$/i,'.txt'),'utf8').catch(()=>'');
      bytes=otimizar ? await otimizarPdf(origem) : origem;
      if(bytes!==origem && texto && nome!=='Processo Convite.pdf') {
        const verificado=await extrairTextoDocumento(nome,bytes.slice());
        if(verificado.replace(/\s/g,'')!==texto.replace(/\s/g,'')) throw new Error(`a otimização alterou o texto de ${nome}`);
      }
      await writeFile(ficheiroCache,bytes);await writeFile(textoCache,texto);
    }
    texto=texto.replace(/\u0000/g,'').trim();
    console.log(JSON.stringify({nome,original:origem.length,download:bytes.length,caracteres:texto.length}));
    if(preparacao) continue;
    const titulo=nome.replace(/\s*-\s*\d{2}OUT(?:26)?\s*-\s*Be a leader Madrid26\.pdf$/i,'').replace(/\.pdf$/i,'').replace(/\s+/g,' ').trim();
    const descricao=(nome==='Processo Convite.pdf'?'Guia do convite ao acompanhamento.':'Apresentação do congresso Be a Leader Madrid, 2 a 4 de outubro de 2026.')+(bytes.length<origem.length?' PDF otimizado para download.':'');
    const [doc]=await sql.query(`insert into documentos(titulo,nome,tipo,categoria,descricao,tamanho,sha256,pasta_id)
      values($1,$2,$3,'Be a Leader Madrid 2026',$4,$5,$6,(select id from documentos_pastas where lower(nome)='be a leader 26'))
      on conflict(sha256) where sha256 is not null do update set tamanho=excluded.tamanho returning id`,[titulo,nome,tipoDocumento(nome),descricao,bytes.length,hash]);
    const existentes=await sql.query('select indice from documentos_partes where documento_id=$1',[doc!.id]);
    const feitos=new Set(existentes.map(r=>r.indice));
    const indices=Array.from({length:Math.ceil(bytes.length/TAMANHO_PARTE)},(_,i)=>i).filter(i=>!feitos.has(i));
    let cursor=0;
    await Promise.all(Array.from({length:4},async()=>{
      while(cursor<indices.length) {
        const i=indices[cursor++]!;
        const parte=Buffer.from(bytes.subarray(i*TAMANHO_PARTE,(i+1)*TAMANHO_PARTE));
        for(let tentativa=0;;tentativa++) {
          try {await sql.query('insert into documentos_partes(documento_id,indice,bytes) values($1,$2,$3) on conflict(documento_id,indice) do update set bytes=excluded.bytes',[doc!.id,i,parte]);break;}
          catch(e) {if(tentativa>=2) throw e;}
        }
      }
    }));
    const [check]=await sql.query('select sum(octet_length(bytes))::float8 as tamanho,count(*)::int as partes from documentos_partes where documento_id=$1',[doc!.id]);
    if(check!.tamanho!==bytes.length || check!.partes!==Math.ceil(bytes.length/TAMANHO_PARTE)) throw new Error('upload incompleto: '+nome);
    const fragmentos=fragmentarTexto(texto);
    await sql.transaction([
      sql.query('delete from documentos_conhecimento where documento_id=$1',[doc!.id]),
      ...fragmentos.map((t,i)=>sql.query('insert into documentos_conhecimento(documento_id,indice,conteudo) values($1,$2,$3)',[doc!.id,i,t])),
      sql.query("update documentos set estado='pronto',publicado=true,texto=$2,conhecimento_estado=$3 where id=$1",[doc!.id,texto,texto?'indexado':'sem-texto']),
    ]);
    console.log(`IMPORTADO ${nome}: ${fragmentos.length} fragmentos`);
  }
  if(!preparacao) console.log(await sql`select count(*)::int as documentos,sum(tamanho)::float8 as bytes,count(*) filter(where conhecimento_estado='indexado')::int as com_conhecimento from documentos where estado='pronto'`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
