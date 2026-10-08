import { db } from './db';

export interface PastaDocumentos { id: string; nome: string; total: number; }
export function pastaIdValido(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
}
export async function listarPastasDocumentos(admin = false): Promise<PastaDocumentos[]> {
  const { rows } = await db().query<PastaDocumentos>(`select p.id,p.nome,count(d.id)::int as total
    from documentos_pastas p left join documentos d on d.pasta_id=p.id and d.estado='pronto' ${admin ? '' : 'and d.publicado'}
    group by p.id,p.nome ${admin ? '' : 'having count(d.id)>0'} order by lower(p.nome),p.id`);
  return rows;
}
export async function criarPastaDocumentos(nome: string): Promise<PastaDocumentos | null> {
  const { rows } = await db().query<PastaDocumentos>(`insert into documentos_pastas(nome) values($1)
    on conflict(lower(nome)) do nothing returning id,nome,0::int as total`, [nome.trim()]);
  return rows[0] ?? null;
}
