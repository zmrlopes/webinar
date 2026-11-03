import { agendarCampanha, destinatariosEmail, historicoCampanhas, listasEmail } from '@/lib/campanhas-email';
import { db } from '@/lib/db';

export async function GET(request:Request) {
 const url=new URL(request.url);
 if(url.searchParams.get('id')) {
  const id=url.searchParams.get('id');
  if(!/^[0-9a-f-]{36}$/i.test(id!)) return Response.json({erro:'Campanha inválida.'},{status:400});
  const {rows}=await db().query(`select email,estado,erro from campanhas_email_destinatarios where campanha_id=$1 order by email`,[id]);
  return Response.json({destinatarios:rows});
 }
 return Response.json({listas:await listasEmail(),campanhas:await historicoCampanhas(),configurado:!!process.env.BREVO_API_KEY});
}

export async function POST(request:Request) {
 const v=await request.json().catch(()=>null);
 if(!v || typeof v!=='object') return Response.json({erro:'Pedido inválido.'},{status:400});
 try {
  if(v.acao==='prever') {
   if(!Array.isArray(v.listas) || v.listas.some((l:unknown)=>typeof l!=='string')) throw new Error('Escolhe listas válidas.');
   const emails=await destinatariosEmail(v.listas);
   return Response.json({total:emails.length,amostra:emails.slice(0,20)});
  }
  if(v.acao==='cancelar') {
   if(typeof v.id!=='string'|| !/^[0-9a-f-]{36}$/i.test(v.id)) throw new Error('Campanha inválida.');
   await db().query(`update campanhas_email set cancelado_em=now() where id=$1 and cancelado_em is null`,[v.id]);
   return Response.json({ok:true});
  }
  if(v.acao!=='agendar') throw new Error('Ação inválida.');
  return Response.json(await agendarCampanha(v));
 } catch(e) {
  console.error('[campanhas-email]',e);
  return Response.json({erro:e instanceof Error && !('code' in e) ? e.message : 'Não foi possível guardar. Verifica a configuração e as migrações.'},{status:400});
 }
}
