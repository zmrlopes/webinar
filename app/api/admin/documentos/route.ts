import { db } from '@/lib/db';
import { listarDocumentos } from '@/lib/documentos';
import { tipoDocumento, TAMANHO_MAX_DOCUMENTO } from '@/lib/documentos-formatos';
import { listarPastasDocumentos, pastaIdValido } from '@/lib/documentos-pastas';
export async function GET() {
  const [documentos,pastas]=await Promise.all([listarDocumentos(true),listarPastasDocumentos(true)]);
  return Response.json({documentos,pastas},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request: Request) {
  const c = await request.json().catch(()=>null);
  if (!c || typeof c.nome !== 'string' || !tipoDocumento(c.nome) || !Number.isSafeInteger(c.tamanho) || c.tamanho <= 0 || c.tamanho > TAMANHO_MAX_DOCUMENTO || typeof c.titulo !== 'string' || !c.titulo.trim() || c.titulo.length > 250 || c.nome.length > 255 || typeof c.categoria !== 'string' || c.categoria.length > 150 || typeof c.descricao !== 'string' || c.descricao.length > 2000) return Response.json({erro:'dados inválidos; aceita PDF, PowerPoint, Word, Excel, TXT e CSV até 1 GB'}, {status:400});
  if(c.pastaId!==undefined && c.pastaId!==null && !pastaIdValido(c.pastaId)) return Response.json({erro:'pasta inválida'},{status:400});
  const {rows} = await db().query(`insert into documentos(titulo,nome,tipo,categoria,descricao,tamanho,pasta_id)
    select $1,$2,$3,$4,$5,$6,$7::uuid where $7::uuid is null or exists(select 1 from documentos_pastas where id=$7::uuid)
    returning id`, [c.titulo.trim(),c.nome,tipoDocumento(c.nome),c.categoria.trim()||'Geral',c.descricao.trim(),c.tamanho,c.pastaId??null]);
  if(!rows.length) return Response.json({erro:'pasta não encontrada'},{status:404});
  return Response.json({id:rows[0].id});
}
