import { db } from "./db";

export interface WebinarAdmin {
  id: string;
  titulo: string;
  sessaoExternaEm: Date | null;
  duracaoMinutos: number | null;
  cancelada: boolean;
  presencasFechadas: boolean;
  totalInscritos: number;
  linksObtidos: number;
  linksPendentes: number;
  linksFalhados: number;
}

/**
 * Nunca seleciona `link_pessoal` — o painel de administração não pode
 * mostrar a credencial de entrada de ninguém (secção 6 do guia).
 */
export async function listarWebinarsAdmin(): Promise<WebinarAdmin[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    sessao_externa_em: Date | null;
    duracao_minutos: number | null;
    cancelada_em: Date | null;
    presencas_fechadas: boolean;
    total_inscritos: string;
    links_obtidos: string;
    links_pendentes: string;
    links_falhados: string;
  }>(
    `select
       w.id, w.titulo, w.sessao_externa_em, w.duracao_minutos,
       w.cancelada_em, w.presencas_fechadas,
       count(r.id) as total_inscritos,
       count(r.id) filter (where r.link_estado = 'obtido')   as links_obtidos,
       count(r.id) filter (where r.link_estado = 'pendente') as links_pendentes,
       count(r.id) filter (where r.link_estado = 'falhado')  as links_falhados
     from webinars w
     left join registrations r on r.webinar_id = w.id
     group by w.id
     order by w.sessao_externa_em desc nulls last`,
  );

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    sessaoExternaEm: r.sessao_externa_em,
    duracaoMinutos: r.duracao_minutos,
    cancelada: r.cancelada_em !== null,
    presencasFechadas: r.presencas_fechadas,
    totalInscritos: Number(r.total_inscritos),
    linksObtidos: Number(r.links_obtidos),
    linksPendentes: Number(r.links_pendentes),
    linksFalhados: Number(r.links_falhados),
  }));
}

export interface InscricaoAdmin {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  linkEstado: "pendente" | "obtido" | "falhado";
  presenca: "unknown" | "attended" | "absent";
  presencaMinutos: number | null;
  cancelada: boolean;
}

export async function listarInscricoesAdmin(webinarId: string): Promise<InscricaoAdmin[]> {
  const { rows } = await db().query<{
    id: string;
    nome: string;
    apelido: string;
    email: string;
    link_estado: "pendente" | "obtido" | "falhado";
    presenca: "unknown" | "attended" | "absent";
    presenca_minutos: number | null;
    cancelada_em: Date | null;
  }>(
    `select id, nome, apelido, email, link_estado, presenca, presenca_minutos, cancelada_em
     from registrations
     where webinar_id = $1
     order by criado_em asc`,
    [webinarId],
  );

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    apelido: r.apelido,
    email: r.email,
    linkEstado: r.link_estado,
    presenca: r.presenca,
    presencaMinutos: r.presenca_minutos,
    cancelada: r.cancelada_em !== null,
  }));
}

/**
 * Correção manual, feita por um humano. A automação (secção 7-D) só toca em
 * quem está `unknown`; esta função é a exceção deliberada a essa regra.
 */
export async function corrigirPresencaManualmente(
  registrationId: string,
  presenca: "unknown" | "attended" | "absent",
  minutos: number | null,
): Promise<void> {
  await db().query(
    `update registrations set presenca = $1, presenca_minutos = $2 where id = $3`,
    [presenca, minutos, registrationId],
  );
}
