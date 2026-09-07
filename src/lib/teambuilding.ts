import { db } from "./db";

/**
 * Só faz sentido perguntar a quem se inscreveu no evento — evento_inscricoes
 * é a única fonte disso (ver src/lib/eventos.ts). Quem já respondeu não
 * volta a ver o aviso.
 */
export async function precisaResponderTeambuilding(email: string): Promise<boolean> {
  const { rows } = await db().query<{ precisa: boolean }>(
    `select
       exists(select 1 from evento_inscricoes where email = $1)
       and not exists(select 1 from respostas_teambuilding where email = $1)
       as precisa`,
    [email],
  );
  return rows[0]?.precisa ?? false;
}

export interface RespostaTeambuildingDados {
  expectativa: string;
  formacoesDesejadas: string;
  duvidas: string;
  outros: string;
}

/**
 * Upsert pelo email — se por algum motivo a pessoa voltar a submeter
 * (ex: reabriu o formulário antes de a página atualizar), substitui a
 * resposta anterior em vez de duplicar ou rejeitar.
 */
export async function guardarRespostaTeambuilding(
  email: string,
  dados: RespostaTeambuildingDados,
): Promise<void> {
  await db().query(
    `insert into respostas_teambuilding (email, expectativa, formacoes_desejadas, duvidas, outros)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
       set expectativa = excluded.expectativa,
           formacoes_desejadas = excluded.formacoes_desejadas,
           duvidas = excluded.duvidas,
           outros = excluded.outros`,
    [email, dados.expectativa, dados.formacoesDesejadas, dados.duvidas || null, dados.outros || null],
  );
}

export interface RespostaTeambuildingAdmin {
  email: string;
  expectativa: string;
  formacoesDesejadas: string;
  duvidas: string | null;
  outros: string | null;
  criadoEm: Date;
}

export async function listarRespostasTeambuilding(): Promise<RespostaTeambuildingAdmin[]> {
  const { rows } = await db().query<{
    email: string;
    expectativa: string;
    formacoes_desejadas: string;
    duvidas: string | null;
    outros: string | null;
    criado_em: Date;
  }>(`select email, expectativa, formacoes_desejadas, duvidas, outros, criado_em
      from respostas_teambuilding
      order by criado_em desc`);
  return rows.map((r) => ({
    email: r.email,
    expectativa: r.expectativa,
    formacoesDesejadas: r.formacoes_desejadas,
    duvidas: r.duvidas,
    outros: r.outros,
    criadoEm: r.criado_em,
  }));
}

export interface InscritoSemResposta {
  nome: string;
  email: string;
}

/** Quem se inscreveu no evento mas ainda não respondeu — para lembrares. */
export async function listarInscritosSemResposta(): Promise<InscritoSemResposta[]> {
  const { rows } = await db().query<{ nome: string; email: string }>(
    `select distinct on (ei.email) ei.nome, ei.email
     from evento_inscricoes ei
     where not exists (select 1 from respostas_teambuilding rt where rt.email = ei.email)
     order by ei.email, ei.criado_em desc`,
  );
  return rows;
}
