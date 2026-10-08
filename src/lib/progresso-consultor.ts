import { db } from "./db";
import { limparPrimeirosPassos } from "./primeiros-passos";

function chave(email: string): string {
  return `consultor:primeiros-passos:${email.trim().toLowerCase()}:v1`;
}

export async function obterProgressoConsultor(email: string) {
  const { rows } = await db().query<{ valor: unknown }>(
    `select valor from dashboard_config where chave = $1`, [chave(email)],
  );
  return { feitos: limparPrimeirosPassos(rows[0]?.valor), guardado: rows.length > 0 };
}

/** Importa as marcas do navegador uma vez; nunca substitui o progresso de outra sessão. */
export async function importarProgressoConsultor(email: string, feitos: number[]): Promise<number[]> {
  const { rows } = await db().query<{ valor: unknown }>(
    `insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
     on conflict (chave) do update set chave = excluded.chave
     returning valor`,
    [chave(email), JSON.stringify(limparPrimeirosPassos(feitos))],
  );
  return limparPrimeirosPassos(rows[0]?.valor);
}

/** Atualiza só o passo escolhido, preservando alterações feitas noutro dispositivo. */
export async function atualizarPassoConsultor(email: string, passo: number, concluido: boolean): Promise<number[]> {
  const { rows } = await db().query<{ valor: unknown }>(
    `insert into dashboard_config (chave, valor)
     values ($1, case when $3 then jsonb_build_array($2::integer) else '[]'::jsonb end)
     on conflict (chave) do update set valor = (
       select coalesce(jsonb_agg(passo order by passo), '[]'::jsonb) from (
         select existente.passo::integer as passo
         from jsonb_array_elements_text(dashboard_config.valor) as existente(passo)
         where existente.passo::integer <> $2
         union select $2::integer where $3
       ) passos
     ), atualizado_em = now()
     returning valor`,
    [chave(email), passo, concluido],
  );
  return limparPrimeirosPassos(rows[0]?.valor);
}
