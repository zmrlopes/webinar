import { db } from "./db";
import { limparPublicados } from "./calendario-criativo";

function chave(email: string): string {
  return `consultor:calendario-criativo:${email.trim().toLowerCase()}:v1`;
}

export async function lerPublicados(email: string): Promise<string[]> {
  const { rows } = await db().query<{ valor: unknown }>(
    `select valor from dashboard_config where chave = $1`, [chave(email)],
  );
  return limparPublicados(rows[0]?.valor);
}

/** Atualiza só a publicação escolhida, preservando o que foi marcado noutro dispositivo. */
export async function marcarPublicado(email: string, id: string, publicado: boolean): Promise<string[]> {
  const { rows } = await db().query<{ valor: unknown }>(
    `insert into dashboard_config (chave, valor)
     values ($1, case when $3 then jsonb_build_array($2::text) else '[]'::jsonb end)
     on conflict (chave) do update set valor = (
       select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from (
         select existente.id
         from jsonb_array_elements_text(dashboard_config.valor) as existente(id)
         where existente.id <> $2
         union select $2::text where $3
       ) publicados
     ), atualizado_em = now()
     returning valor`,
    [chave(email), id, publicado],
  );
  return limparPublicados(rows[0]?.valor);
}
