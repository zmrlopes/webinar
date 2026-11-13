import { agendarCampanha, destinatariosEmail, historicoCampanhas, listasEmail } from '@/lib/campanhas-email';
import { db } from '@/lib/db';
import { lerAnexoCampanha } from '@/lib/campanhas-email-anexo';

export async function GET(request:Request) {
 const url=new URL(request.url);
 if(url.searchParams.has('anexo')) {
  const id=url.searchParams.get('anexo');
  if(!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({erro:'Campanha inválida.'},{status:400});
  const {rows}=await db().query<{anexo:Buffer|null;anexo_nome:string;anexo_tipo:string}>(`select anexo,anexo_nome,anexo_tipo from campanhas_email where id=$1`,[id]);
  const a=rows[0];
  if(!a?.anexo) return Response.json({erro:'Anexo não encontrado.'},{status:404});
  return new Response(new Uint8Array(a.anexo),{headers:{'Content-Type':a.anexo_tipo,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(a.anexo_nome)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(url.searchParams.get('id')) {
  const id=url.searchParams.get('id');
  if(!/^[0-9a-f-]{36}$/i.test(id!)) return Response.json({erro:'Campanha inválida.'},{status:400});
  const {rows}=await db().query(`select email,estado,erro from campanhas_email_destinatarios where campanha_id=$1 order by email`,[id]);
  return Response.json({destinatarios:rows});
 }
 return Response.json({listas:await listasEmail(),campanhas:await historicoCampanhas(),configurado:!!process.env.BREVO_API_KEY});
}

export async function POST(request:Request) {
 if(request.headers.get('content-type')?.startsWith('multipart/form-data')) {
  try {
   const form=await request.formData();
   if(form.get('acao')!=='agendar') throw new Error('Ação inválida.');
   const ficheiros=form.getAll('anexo');
   if(ficheiros.length>1 || (ficheiros[0] && !(ficheiros[0] instanceof File))) throw new Error('Escolhe apenas um anexo.');
   const anexo=await lerAnexoCampanha(ficheiros[0] instanceof File?ficheiros[0]:null);
   const valor={assunto:form.get('assunto'),corpo:form.get('corpo'),data:form.get('data'),listas:JSON.parse(String(form.get('listas'))),qrEvento:form.get('qrEvento')};
   return Response.json(await agendarCampanha(valor,anexo));
  } catch(e) {
   console.error('[campanhas-email-anexo]',e);
   return Response.json({erro:e instanceof Error && !('code' in e)?e.message:'Não foi possível guardar o email e o anexo.'},{status:400});
  }
 }
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
