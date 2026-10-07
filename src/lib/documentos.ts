import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { fragmentarTexto, TAMANHO_PARTE } from './documentos-formatos';

export interface Documento {
  id: string; titulo: string; nome: string; tipo: string; categoria: string; descricao: string;
  tamanho: number; publicado: boolean; conhecimento_estado: string; criado_em: string;
}
export async function listarDocumentos(admin = false): Promise<Documento[]> {
  const { rows } = await db().query(`select id,titulo,nome,tipo,categoria,descricao,tamanho::float8 as tamanho,
    publicado,conhecimento_estado,criado_em from documentos where estado='pronto' ${admin ? '' : 'and publicado'} order by categoria,titulo`);
  return rows;
}
export async function finalizarDocumento(id: string, texto: string): Promise<void> {
  const client = await db().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query(`select tamanho from documentos where id=$1 and estado='upload' for update`, [id]);
    if (!rows[0]) throw new Error('upload não encontrado ou já concluído');
    const tamanho = Number(rows[0].tamanho);
    const n = Math.ceil(tamanho / TAMANHO_PARTE);
    const { rows: partes } = await client.query(`select count(*)::int as total,coalesce(sum(octet_length(bytes)),0)::float8 as tamanho,
      min(indice) as primeiro,max(indice) as ultimo from documentos_partes where documento_id=$1`, [id]);
    if (partes[0].total !== n || partes[0].tamanho !== tamanho || partes[0].primeiro !== 0 || partes[0].ultimo !== n - 1) throw new Error('o upload ainda não está completo');
    const limpo = texto.replace(/\u0000/g, '').trim();
    const fragmentos = fragmentarTexto(limpo);
    await client.query(`insert into documentos_conhecimento(documento_id,indice,conteudo)
      select $1,n-1,t from unnest($2::text[]) with ordinality as f(t,n)`, [id,fragmentos]);
    await client.query(`update documentos set estado='pronto',publicado=true,texto=$2,conhecimento_estado=$3 where id=$1`, [id,limpo,limpo ? 'indexado' : 'sem-texto']);
    await client.query('commit');
  } catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
}
function segredo(): string {
  const s = process.env.DOCUMENTOS_SECRET || process.env.ADMIN_PASSWORD || process.env.DATABASE_URL;
  if (!s) throw new Error('segredo de documentos indisponível');
  return s;
}
function assinatura(id: string, exp: string): string { return createHmac('sha256', segredo()).update(`${id}:${exp}`).digest('hex'); }
export function linkDocumento(id: string): string {
  const exp = String(Math.floor(Date.now()/1000) + 3600);
  return `/api/documentos/${id}?exp=${exp}&token=${assinatura(id,exp)}`;
}
export function validarLinkDocumento(id: string, url: URL): boolean {
  const exp = url.searchParams.get('exp') || '';
  const token = url.searchParams.get('token') || '';
  const agora = Math.floor(Date.now()/1000);
  if (!/^\d+$/.test(exp) || Number(exp) < agora || Number(exp) > agora+3600 || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token,'hex'), Buffer.from(assinatura(id,exp),'hex'));
}
export async function descarregarDocumento(id: string, request: Request, admin = false): Promise<Response> {
  const { rows } = await db().query(`select nome,tipo,tamanho::float8 as tamanho from documentos where id=$1 and estado='pronto' ${admin ? '' : 'and publicado'}`, [id]);
  const doc = rows[0];
  if (!doc) return Response.json({erro:'documento não encontrado'}, {status:404});
  let inicio = 0, fim = doc.tamanho-1;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${doc.tamanho}`}});
    if (!match[1]) inicio = Math.max(0,doc.tamanho-Number(match[2]));
    else { inicio = Number(match[1]); if(match[2]) fim = Math.min(fim,Number(match[2])); }
    if (inicio > fim || inicio >= doc.tamanho) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${doc.tamanho}`}});
  }
  let indice = Math.floor(inicio/TAMANHO_PARTE);
  const ultimo = Math.floor(fim/TAMANHO_PARTE);
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const {rows:p} = await db().query('select bytes from documentos_partes where documento_id=$1 and indice=$2',[id,indice]);
        if (!p[0]) throw new Error('parte do documento em falta');
        const offset = indice*TAMANHO_PARTE;
        controller.enqueue(new Uint8Array(p[0].bytes.subarray(Math.max(0,inicio-offset),Math.min(TAMANHO_PARTE,fim-offset+1))));
        if (indice++ >= ultimo) controller.close();
      } catch(e) { controller.error(e); }
    }
  });
  const headers: Record<string,string> = {
    'Content-Type':doc.tipo,'Content-Length':String(fim-inicio+1),'Accept-Ranges':'bytes',
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
    'Content-Disposition':`attachment; filename="documento.${doc.nome.split('.').pop()?.replace(/[^a-z0-9]/gi,'') || 'bin'}"; filename*=UTF-8''${encodeURIComponent(doc.nome).replace(/['()*]/g, c=>'%'+c.charCodeAt(0).toString(16))}`,
  };
  if(range) headers['Content-Range'] = `bytes ${inicio}-${fim}/${doc.tamanho}`;
  return new Response(stream,{status:range ? 206 : 200,headers});
}
export async function conhecimentoDocumentos(objecao: string): Promise<string> {
  const expandir: [RegExp,string][] = [
    [/dinheiro|preço|invest|caro|custo/i,'money investment invest income business opportunity'],
    [/tempo|ocupad|trabalho/i,'time hour hours consistency process'],
    [/medo|receio|confian|experi|conseg|vender/i,'fear confidence learn learning support guide community'],
    [/convite|convid|contact|conversa|obje|respost|recrut/i,'invitation invite conversation objection follow tracking prospect'],
    [/equip|lider|duplic|acompanh/i,'team leader leadership onboarding duplication support'],
  ];
  const termos = `${objecao} ${expandir.filter(([r])=>r.test(objecao)).map(([,s])=>s).join(' ')}`;
  const palavras = [...new Set(termos.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(p=>!['tenho','para','como','uma','não','que','com','mas','the','and'].includes(p)).slice(0,60);
  if(!palavras.length) return '';
  const {rows} = await db().query(`with q as (select to_tsquery('simple',$1) as busca)
    select d.titulo,d.categoria,c.conteudo,ts_rank_cd(c.pesquisa,q.busca) as relevancia
    from documentos_conhecimento c join documentos d on d.id=c.documento_id cross join q
    where d.estado='pronto' and d.publicado and c.pesquisa @@ q.busca
    order by relevancia desc,d.titulo,c.indice limit 10`, [palavras.join(' | ')]);
  return rows.map(r=>`### ${r.categoria} — ${r.titulo}\n${r.conteudo}`).join('\n\n');
}
