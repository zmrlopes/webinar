import { db } from '@/lib/db';
import { descarregarDocumento, finalizarDocumento } from '@/lib/documentos';
import { TAMANHO_PARTE } from '@/lib/documentos-formatos';
import { pastaIdValido } from '@/lib/documentos-pastas';
type Contexto = {params:Promise<{id:string}>};
export const maxDuration = 300;
function idValido(id: string) { return /^[a-f0-9-]{36}$/i.test(id); }
export async function GET(request: Request,{params}:Contexto) {
  const {id}=await params;
  if(!idValido(id)) return Response.json({erro:'documento inválido'},{status:400});
  return descarregarDocumento(id,request,true);
}
export async function PUT(request: Request,{params}:Contexto) {
  const {id}=await params;
  const valor=new URL(request.url).searchParams.get('parte');
  const indice=Number(valor);
  if(!idValido(id) || valor===null || !/^\d+$/.test(valor) || !Number.isSafeInteger(indice)) return Response.json({erro:'parte inválida'},{status:400});
  const size=Number(request.headers.get('content-length'));
  if(size>TAMANHO_PARTE) return Response.json({erro:'parte demasiado grande'},{status:413});
  const bytes=Buffer.from(await request.arrayBuffer());
  if(!bytes.length || bytes.length>TAMANHO_PARTE) return Response.json({erro:'parte inválida'},{status:400});
  const {rowCount}=await db().query(`insert into documentos_partes(documento_id,indice,bytes)
    select id,$2::integer,$3::bytea from documentos where id=$1 and estado='upload' and $2::integer < ceil(tamanho::numeric/$4::bigint)
    and octet_length($3::bytea)=least($4::bigint,tamanho-$2::bigint*$4::bigint)
    on conflict(documento_id,indice) do update set bytes=excluded.bytes`,[id,indice,bytes,TAMANHO_PARTE]);
  if(!rowCount) return Response.json({erro:'upload ou tamanho de parte inválido'},{status:400});
  return Response.json({ok:true});
}
export async function POST(request: Request,{params}:Contexto) {
  const {id}=await params;
  const c=await request.json().catch(()=>null);
  if(!idValido(id) || typeof c?.texto !== 'string' || c.texto.length>2_000_000) return Response.json({erro:'texto inválido'},{status:400});
  try { await finalizarDocumento(id,c.texto); return Response.json({ok:true}); }
  catch(e) { console.error('falha a concluir documento',e); return Response.json({erro:'não foi possível concluir o upload; tenta novamente'},{status:400}); }
}
export async function PATCH(request: Request,{params}:Contexto) {
  const {id}=await params;
  const c=await request.json().catch(()=>null);
  const mudaPublicacao = typeof c?.publicado === 'boolean';
  const mudaPasta = c !== null && typeof c === 'object' && Object.hasOwn(c,'pastaId');
  if(!idValido(id) || (!mudaPublicacao && !mudaPasta) || (c?.publicado!==undefined && !mudaPublicacao) || (mudaPasta && c.pastaId!==null && !pastaIdValido(c.pastaId))) return Response.json({erro:'dados inválidos'},{status:400});
  const {rowCount}=await db().query(`update documentos set publicado=case when $2::boolean then $3::boolean else publicado end,
    pasta_id=case when $4::boolean then $5::uuid else pasta_id end where id=$1 and estado='pronto'
    and (not $4::boolean or $5::uuid is null or exists(select 1 from documentos_pastas where id=$5::uuid))`,[id,mudaPublicacao,c.publicado??null,mudaPasta,c.pastaId??null]);
  if(!rowCount) return Response.json({erro:'documento ou pasta não encontrado'},{status:404});
  return Response.json({ok:true});
}
export async function DELETE(_request: Request,{params}:Contexto) {
  const {id}=await params;
  if(!idValido(id)) return Response.json({erro:'documento inválido'},{status:400});
  await db().query('delete from documentos where id=$1',[id]);
  return Response.json({ok:true});
}
