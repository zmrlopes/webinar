import { db } from "./db";

export interface FormacaoExterna {
  id: string;
  titulo: string;
  sessaoExternaEm: Date;
  link: string;
}

/** Todas, passadas incluídas — para a lista de gestão em /admin/formacoes-externas. */
export async function listarFormacoesExternas(): Promise<FormacaoExterna[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    link: string;
  }>(`select id, titulo, sessao_externa_em, link from formacoes_externas order by sessao_externa_em desc`);
  return rows.map((r) => ({ id: r.id, titulo: r.titulo, sessaoExternaEm: r.sessao_externa_em, link: r.link }));
}

/** Só as futuras — para o cartão no painel do consultor. */
export async function listarFormacoesExternasFuturas(): Promise<FormacaoExterna[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    link: string;
  }>(
    `select id, titulo, sessao_externa_em, link
     from formacoes_externas
     where sessao_externa_em > now()
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({ id: r.id, titulo: r.titulo, sessaoExternaEm: r.sessao_externa_em, link: r.link }));
}

export async function criarFormacaoExterna(
  titulo: string,
  sessaoExternaEm: Date,
  link: string,
): Promise<void> {
  await db().query(`insert into formacoes_externas (titulo, sessao_externa_em, link) values ($1, $2, $3)`, [
    titulo,
    sessaoExternaEm,
    link,
  ]);
}

export async function apagarFormacaoExterna(id: string): Promise<void> {
  await db().query(`delete from formacoes_externas where id = $1`, [id]);
}
