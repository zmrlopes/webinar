import assert from 'node:assert/strict';
import { deduplicarDestinatarios, validarCampanha } from '../src/lib/campanhas-email-validacao';
import { processarCampanhas } from '../src/lib/campanhas-email';
import { db, fecharDb } from '../src/lib/db';
import { BrevoEmailSender } from '../src/lib/email';

const base={assunto:' Lembrete evento ',corpo:' Olá!\n\nAté dia 14. ',listas:['evento14','evento14'],data:'2026-11-13T18:00'};
assert.deepEqual(validarCampanha(base),{assunto:'Lembrete evento',corpo:'Olá!\n\nAté dia 14.',listas:['evento14'],local:'2026-11-13T18:00'});
for(const v of [null,{}, {...base,assunto:''},{...base,corpo:''},{...base,listas:[]},{...base,listas:[42]},{...base,data:'amanhã'},{...base,assunto:'a'.repeat(201)}]) assert.throws(()=>validarCampanha(v));
assert.deepEqual(deduplicarDestinatarios([{email:' ANA@example.com '},{email:'ana@example.com'},{email:'lara@example.com'},{email:'inválido'},{email:''}]),['ana@example.com','lara@example.com']);

// Substitui a base e o fornecedor: este teste nunca contacta destinatários.
process.env.DATABASE_URL ||= 'postgres://teste:teste@localhost/teste';
const chave=process.env.BREVO_API_KEY;
process.env.BREVO_API_KEY='teste-sem-rede';
const pool=db();
const queryOriginal=pool.query;
const enviarOriginal=BrevoEmailSender.prototype.enviar;
let fila:{email:string;estado:string}[]=[];
let falhar=false;
let chamadas:string[]=[];
let sqlClaim='';
Object.assign(pool,{query:async(sql:string,args?:unknown[])=>{
 if(sql.startsWith('with proximo')) {
  sqlClaim=sql;
  const d=fila.find(d=>d.estado==='pendente');
  if(!d)return {rows:[]};
  d.estado='a_enviar';return {rows:[{...d,campanha_id:'teste',assunto:'Teste',corpo:'Teste'}]};
 }
 const d=fila.find(d=>d.email===args?.[1]);
 assert.ok(d);
 d.estado=sql.includes("estado='enviado'")?'enviado':'incerto';return {rows:[]};
}});
BrevoEmailSender.prototype.enviar=async(m)=>{chamadas.push(m.destinatario);if(falhar)throw new Error('Resposta perdida');};
try {
 fila=[{email:'a@example.com',estado:'pendente'},{email:'b@example.com',estado:'pendente'}];
 assert.deepEqual(await processarCampanhas(),{enviados:2});
 assert.deepEqual(chamadas,['a@example.com','b@example.com']);
 await processarCampanhas();assert.equal(chamadas.length,2,'Não repete destinatários concluídos');
 assert.match(sqlClaim,/skip locked/);assert.match(sqlClaim,/cancelado_em is null/);assert.match(sqlClaim,/agendado_em<=now\(\)/);
 fila=[{email:'c@example.com',estado:'pendente'}];falhar=true;chamadas=[];
 await processarCampanhas();assert.equal(fila[0]?.estado,'incerto');
 await processarCampanhas();assert.equal(chamadas.length,1,'Não repete um envio de resultado incerto');
 fila=[{email:'d@example.com',estado:'a_enviar'}];chamadas=[];
 await processarCampanhas();assert.equal(chamadas.length,0,'Não recupera automaticamente envios interrompidos');
 delete process.env.BREVO_API_KEY;
 await assert.rejects(processarCampanhas(),/BREVO_API_KEY/);
 console.log('OK: validação, listas sem duplicados, fila, cancelamento/data no claim e proteção contra repetição. Nenhum email enviado.');
} finally {
 pool.query=queryOriginal;BrevoEmailSender.prototype.enviar=enviarOriginal;
 if(chave===undefined)delete process.env.BREVO_API_KEY;else process.env.BREVO_API_KEY=chave;
 await fecharDb();
}
