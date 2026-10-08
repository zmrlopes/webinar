/** Valida as consultas reais em tabelas temporárias, sem modificar a biblioteca. */
import './_env';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import {db,fecharDb} from '../src/lib/db';
import {listarDocumentos} from '../src/lib/documentos';
import {listarPastasDocumentos,pastaIdValido} from '../src/lib/documentos-pastas';
import {POST as criarPasta} from '../app/api/admin/documentos/pastas/route';
import {POST as criarDocumento} from '../app/api/admin/documentos/route';
import {PATCH as alterarDocumento} from '../app/api/admin/documentos/[id]/route';

const congresso='00000000-0000-0000-0000-000000000001',guias='00000000-0000-0000-0000-000000000002';
const documento='00000000-0000-0000-0000-000000000010',outro='00000000-0000-0000-0000-000000000011';
const pool=db(),original=pool.query,sql=neon(process.env.DATABASE_URL!,{fullResults:true});
const planos:{nome:string;consulta:string;valores:unknown[]}[]=[];
let nome='',semResultado=false;
pool.query=(async(consulta:string,valores:unknown[]=[])=>{
 planos.push({nome,consulta,valores});
 return {rows:semResultado?[]:[{id:documento,nome:'Novos',total:0}],rowCount:semResultado?0:1};
}) as typeof pool.query;
const req=(corpo:unknown)=>new Request('https://exemplo.test/api/admin/documentos',{method:'POST',body:JSON.stringify(corpo)});
const ctx={params:Promise.resolve({id:documento})};
async function capturar(rotulo:string,fn:()=>Promise<unknown>){nome=rotulo;return fn();}
try{
 for(const v of [null,'',congresso.replace(/0/,'z'),'../pasta'])assert(!pastaIdValido(v));
 assert(pastaIdValido(congresso));
 const antes=planos.length;
 for(const n of ['', '   ', 'x'.repeat(151), null])assert.equal((await criarPasta(req({nome:n}))).status,400);
 assert.equal((await alterarDocumento(req({pastaId:'nao-existe'}),ctx)).status,400);
 assert.equal((await alterarDocumento(req({}),ctx)).status,400);
 assert.equal(planos.length,antes);
 assert.equal((await capturar('criar-pasta',()=>criarPasta(req({nome:'  Novos  '}))) as Response).status,200);
 semResultado=true;
 assert.equal((await capturar('duplicada',()=>criarPasta(req({nome:'novos'}))) as Response).status,409);
 semResultado=false;
 await capturar('admin-inicial',()=>listarPastasDocumentos(true));
 await capturar('consultor-inicial',()=>listarPastasDocumentos());
 await capturar('documentos-publicados',()=>listarDocumentos());
 const upload={nome:'guia.pdf',titulo:'Guia',categoria:'Geral',descricao:'',tamanho:1,pastaId:guias};
 assert.equal((await capturar('upload-com-pasta',()=>criarDocumento(req(upload))) as Response).status,200);
 semResultado=true;
 assert.equal((await capturar('upload-pasta-inexistente',()=>criarDocumento(req({...upload,pastaId:'00000000-0000-0000-0000-000000000099'}))) as Response).status,404);
 assert.equal((await capturar('mover-inexistente',()=>alterarDocumento(req({pastaId:'00000000-0000-0000-0000-000000000099'}),ctx)) as Response).status,404);
 semResultado=false;
 assert.equal((await capturar('mover',()=>alterarDocumento(req({pastaId:guias}),ctx)) as Response).status,200);
 await capturar('consultor-depois',()=>listarPastasDocumentos());
 assert.equal((await capturar('ocultar',()=>alterarDocumento(req({publicado:false}),ctx)) as Response).status,200);
 await capturar('consultor-oculto',()=>listarPastasDocumentos());
 assert.equal((await capturar('mover-e-publicar',()=>alterarDocumento(req({pastaId:congresso,publicado:true}),ctx)) as Response).status,200);
 assert.equal((await capturar('sem-pasta',()=>alterarDocumento(req({pastaId:null}),ctx)) as Response).status,200);
 await capturar('documentos-finais',()=>listarDocumentos(true));

 const schema=(await readFile('migrations/047_documentos.sql','utf8')).replaceAll('create table if not exists','create temp table');
 const pastaSchema=(await readFile('migrations/049_documentos_pastas.sql','utf8')).replace('create table if not exists','create temp table');
 const comandos=(s:string)=>s.split(';').map(t=>t.trim()).filter(Boolean);
 const partes=comandos(pastaSchema),semente=partes.findIndex(t=>t.startsWith('insert into documentos_pastas'));
 const renomear=comandos((await readFile('migrations/050_documentos_pasta_madrid.sql','utf8'))+'\n'+(await readFile('migrations/051_documentos_pasta_be_a_leader.sql','utf8')));
 const setup=[
  ...comandos(schema).map(q=>sql.query(q)),
  sql.query(`insert into documentos(id,titulo,nome,tipo,categoria,descricao,tamanho,publicado,estado,conhecimento_estado,texto)
    values($1,'Congresso A','a.pdf','application/pdf','Be a Leader Madrid 2026','Descrição',1,true,'pronto','indexado','Conhecimento intacto'),
    ($2,'Congresso B','b.pdf','application/pdf','Be a Leader Madrid 2026','',1,false,'pronto','sem-texto',''),
    ('00000000-0000-0000-0000-000000000012','Geral','geral.pdf','application/pdf','Geral','',1,true,'pronto','sem-texto','')`,[documento,outro]),
  sql.query(`insert into documentos_partes values($1,0,decode('41','hex'))`,[documento]),
  sql.query(`insert into documentos_conhecimento(documento_id,indice,conteudo) values($1,0,'Conhecimento intacto')`,[documento]),
  ...partes.slice(0,semente).map(q=>sql.query(q)),
  sql.query(`insert into documentos_pastas(id,nome) values($1,'Congresso'),($2,'Guias')`,[congresso,guias]),
  ...partes.slice(semente).map(q=>sql.query(q)),
  ...partes.slice(1).map(q=>sql.query(q)),
  ...renomear.map(q=>sql.query(q)),
  ...renomear.map(q=>sql.query(q)),
  sql.query('select id,pasta_id from documentos order by id'),
 ];
 const fim=sql.query(`select d.id,d.categoria,d.texto,p.bytes,c.conteudo from documentos d join documentos_partes p on p.documento_id=d.id join documentos_conhecimento c on c.documento_id=d.id where d.id=$1`,[documento]);
 const resultados=await sql.transaction([...setup,...planos.map(p=>sql.query(p.consulta,p.valores)),fim]);
 const atribuicao=resultados[setup.length-1]!.rows;
 assert.equal(atribuicao[0]!.pasta_id,congresso);assert.equal(atribuicao[1]!.pasta_id,congresso);assert.equal(atribuicao[2]!.pasta_id,null);
 const porNome=new Map(planos.map((p,i)=>[p.nome,resultados[setup.length+i]!]));
 assert.equal(porNome.get('criar-pasta')!.rows[0]!.nome,'Novos');assert.equal(porNome.get('duplicada')!.rows.length,0);
 assert.equal(porNome.get('admin-inicial')!.rows.find(p=>p.id===congresso)!.total,2);
 assert.deepEqual(porNome.get('consultor-inicial')!.rows.map(p=>[p.nome,p.total]),[['Be a Leader 26',1]]);
 assert.equal(porNome.get('documentos-publicados')!.rows.length,2);
 assert.equal(porNome.get('upload-com-pasta')!.rows.length,1);
 assert.equal(porNome.get('upload-pasta-inexistente')!.rows.length,0);
 assert.equal(porNome.get('mover-inexistente')!.rowCount,0);
 assert.equal(porNome.get('mover')!.rowCount,1);
 assert.deepEqual(porNome.get('consultor-depois')!.rows.map(p=>[p.nome,p.total]),[['Guias',1]]);
 assert.equal(porNome.get('consultor-oculto')!.rows.length,0);
 assert.equal(porNome.get('documentos-finais')!.rows.find(d=>d.id===documento)!.pasta_id,null);
 const preservado=resultados.at(-1)!.rows[0]!;
 assert.equal(preservado.categoria,'Be a Leader Madrid 2026');assert.equal(preservado.texto,'Conhecimento intacto');assert.equal(preservado.conteudo,'Conhecimento intacto');assert.deepEqual(preservado.bytes,Buffer.from([65]));
 console.log('OK: migração idempotente, Congresso, categorias preservadas, criação e duplicados, upload para pasta, mudanças de pasta, ocultação, contagens públicas, bytes e conhecimento intactos. Apenas tabelas temporárias.');
}finally{pool.query=original;await fecharDb();}
