import { db } from "./db";

export interface WebinarResumo {
  id: string;
  titulo: string;
  sessaoExternaEm: Date;
  duracaoMinutos: number;
}

export async function listarWebinarsFuturos(): Promise<WebinarResumo[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where cancelada_em is null
       and sessao_externa_id is not null
       and sessao_externa_em > now()
     order by sessao_externa_em asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  }));
}

export async function buscarWebinar(id: string): Promise<WebinarResumo | undefined> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date;
    duracao_minutos: number;
  }>(
    `select id, titulo, sessao_externa_em, duracao_minutos
     from webinars
     where id = $1 and cancelada_em is null and sessao_externa_id is not null`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
  };
}
