import { db } from '@/lib/db';
import { listarDocumentos } from '@/lib/documentos';
import { tipoDocumento, TAMANHO_MAX_DOCUMENTO } from '@/lib/documentos-formatos';
export async function GET() { return Response.json({documentos:await listarDocumentos(true)}); }
export async function POST(request: Request) {
  const c = await request.json().catch(()=>null);
  if (!c || typeof c.nome !== 'string' || !tipoDocumento(c.nome) || !Number.isSafeInteger(c.tamanho) || c.tamanho <= 0 || c.tamanho > TAMANHO_MAX_DOCUMENTO || typeof c.titulo !== 'string' || !c.titulo.trim() || c.titulo.length > 250 || c.nome.length > 255 || typeof c.categoria !== 'string' || c.categoria.length > 150 || typeof c.descricao !== 'string' || c.descricao.length > 2000) return Response.json({erro:'dados inválidos; aceita PDF, PowerPoint, Word, Excel, TXT e CSV até 1 GB'}, {status:400});
  const {rows} = await db().query(`insert into documentos(titulo,nome,tipo,categoria,descricao,tamanho) values($1,$2,$3,$4,$5,$6) returning id`, [c.titulo.trim(),c.nome,tipoDocumento(c.nome),c.categoria.trim()||'Geral',c.descricao.trim(),c.tamanho]);
  return Response.json({id:rows[0].id});
}
