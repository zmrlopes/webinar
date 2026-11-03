import { randomUUID } from 'node:crypto';
import { db } from './db';
import { BrevoEmailSender } from './email';
import { deduplicarDestinatarios, validarCampanha } from './campanhas-email-validacao';

export async function listasEmail() {
 const {rows} = await db().query<{email:string;nome:string}>(`select email,nome from equipa_afiliados order by nome,email`);
 return [
  {id:'evento14',nome:'Inscritos dia 14 — Teambuilding (14/11/2026)',descricao:'Um email por inscrição/contacto, mesmo com vários bilhetes.'},
  {id:'plataforma',nome:'Todos os registados na plataforma',descricao:'Consultores que já usaram o painel e contactos inscritos nas sessões ou no evento.'},
  {id:'consultores',nome:'Todos os consultores',descricao:'Todos os membros da equipa, incluindo quem ainda não usou o painel.'},
  {id:'painel',nome:'Consultores com painel',descricao:'Consultores que já geraram o seu link pessoal.'},
  ...rows.map(r=>({id:`equipa:${r.email}`,nome:`Equipa de ${r.nome}`,descricao:`${r.email} e toda a sua descendência, incluindo subequipas.`}))
 ];
}

export async function destinatariosEmail(listas: string[]) {
 const permitidas = new Set((await listasEmail()).map(l=>l.id));
 if (!listas.length || listas.length > 100 || listas.some(l=>!permitidas.has(l))) throw new Error('Escolhe listas válidas.');
 const {rows} = await db().query<{email:string}>(`with recursive equipa as (
  select email from equipa_afiliados where 'equipa:' || email = any($1::text[])
  union
  select e.email from equipa_afiliados e join equipa d on e.upline_email=d.email
 )
 select email from equipa
 union select email from evento_inscricoes where 'evento14'=any($1::text[]) or 'plataforma'=any($1::text[])
 union select email from registrations where cancelada_em is null and 'plataforma'=any($1::text[])
 union select referencia_email as email from links_consultor where 'plataforma'=any($1::text[]) or 'painel'=any($1::text[])
 union select email from equipa_afiliados where 'consultores'=any($1::text[])`,[listas]);
 return deduplicarDestinatarios(rows);
}

export async function agendarCampanha(valor:unknown) {
 const v=validarCampanha(valor);
 if (!process.env.BREVO_API_KEY) throw new Error('O envio de campanhas requer BREVO_API_KEY configurada.');
 const emails=await destinatariosEmail(v.listas);
 if (!emails.length) throw new Error('As listas escolhidas não têm destinatários válidos.');
 const client=await db().connect();
 try {
  await client.query('begin');
  const {rows}=await client.query<{data:Date;valida:boolean}>(`select $1::timestamp at time zone 'Europe/Lisbon' as data,
   ($1::timestamp at time zone 'Europe/Lisbon') > now() as valida`,[v.local]);
  if (!rows[0]?.valida) throw new Error('Escolhe uma data futura no horário de Lisboa.');
  // Rejeita horas inexistentes na mudança para o horário de verão.
  const volta=await client.query<{local:string}>(`select to_char($1::timestamptz at time zone 'Europe/Lisbon','YYYY-MM-DD"T"HH24:MI') as local`,[rows[0].data]);
  if(volta.rows[0]?.local!==v.local) throw new Error('Esta hora não existe em Lisboa. Escolhe outra hora.');
  const id=randomUUID();
  await client.query(`insert into campanhas_email(id,assunto,corpo,listas,agendado_em) values($1,$2,$3,$4,$5)`,[id,v.assunto,v.corpo,v.listas,rows[0].data]);
  await client.query(`insert into campanhas_email_destinatarios(campanha_id,email) select $1,unnest($2::text[])`,[id,emails]);
  await client.query('commit');
  return {id,total:emails.length};
 } catch(e) { await client.query('rollback'); throw e; } finally {client.release();}
}

export async function historicoCampanhas() {
 const {rows}=await db().query(`select c.*,count(d.email)::int as total,
 count(*) filter(where d.estado='enviado')::int as enviados,
 count(*) filter(where d.estado='pendente')::int as pendentes,
 count(*) filter(where d.estado='incerto' or (d.estado='a_enviar' and d.iniciado_em < now()-interval '10 minutes'))::int as incertos
 from campanhas_email c left join campanhas_email_destinatarios d on c.id=d.campanha_id
 group by c.id order by c.criado_em desc limit 50`);
 return rows;
}

/** Uma tentativa por destinatário: uma resposta ambígua do fornecedor nunca provoca duplicados automáticos. */
export async function processarCampanhas() {
 if(!process.env.BREVO_API_KEY) throw new Error('BREVO_API_KEY não configurada.');
 const sender=new BrevoEmailSender();
 let enviados=0;
 const fim=Date.now()+45000;
 while(Date.now()<fim && enviados<30) {
  const {rows}=await db().query<{campanha_id:string;email:string;assunto:string;corpo:string}>(`with proximo as (
   select d.campanha_id,d.email from campanhas_email_destinatarios d join campanhas_email c on c.id=d.campanha_id
   where d.estado='pendente' and c.cancelado_em is null and c.agendado_em<=now()
   order by c.agendado_em,d.email for update of c,d skip locked limit 1
  ), marcado as (
   update campanhas_email_destinatarios d set estado='a_enviar',iniciado_em=now() from proximo p
   where d.campanha_id=p.campanha_id and d.email=p.email returning d.*
  ) select m.campanha_id,m.email,c.assunto,c.corpo from marcado m join campanhas_email c on c.id=m.campanha_id`);
  const d=rows[0]; if(!d) break;
  try {
   await sender.enviar({destinatario:d.email,assunto:d.assunto,corpoTexto:d.corpo});
  } catch {
   await db().query(`update campanhas_email_destinatarios set estado='incerto',erro='O fornecedor não confirmou o envio. Verificar na Brevo antes de reenviar.' where campanha_id=$1 and email=$2`,[d.campanha_id,d.email]);
   break;
  }
  await db().query(`update campanhas_email_destinatarios set estado='enviado',enviado_em=now() where campanha_id=$1 and email=$2`,[d.campanha_id,d.email]);
  enviados++;
 }
 return {enviados};
}
