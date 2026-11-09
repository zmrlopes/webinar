import { db } from "./db";
import { DIAS_CALENDARIO_CRIATIVO, FORMATOS_CONTEUDO, limparPublicados, type FormatoConteudo } from "./calendario-criativo";

const PREFIXO_REGISTO = "consultor:calendario-criativo:";
const SUFIXO_REGISTO = ":v1";

function chave(email: string): string {
  return `${PREFIXO_REGISTO}${email.trim().toLowerCase()}${SUFIXO_REGISTO}`;
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

export interface EntradaRankingCalendarioCriativo {
  email: string;
  nome: string;
  total: number;
  totalPossivel: number;
  percentagem: number;
  porFormato: Record<FormatoConteudo, number>;
}

/** Ranking admin: quem marcou mais publicações ("Já publiquei") no calendário criativo, com a contagem por área (Reel, Carrossel, Fotografia, Post estático). */
export async function listarRankingCalendarioCriativo(): Promise<EntradaRankingCalendarioCriativo[]> {
  const totalPossivel = DIAS_CALENDARIO_CRIATIVO.length * FORMATOS_CONTEUDO.length;
  const [{ rows }, { rows: equipa }] = await Promise.all([
    db().query<{ chave: string; valor: unknown }>(
      `select chave, valor from dashboard_config where starts_with(chave, $1)`, [PREFIXO_REGISTO],
    ),
    db().query<{ email: string; nome: string }>(`select email, nome from equipa_afiliados`),
  ]);
  const nomes = new Map(equipa.map(c => [c.email.toLowerCase(), c.nome]));
  return rows
    .filter(r => r.chave.endsWith(SUFIXO_REGISTO))
    .map(r => {
      const email = r.chave.slice(PREFIXO_REGISTO.length, -SUFIXO_REGISTO.length);
      const publicados = limparPublicados(r.valor);
      const porFormato = Object.fromEntries(
        FORMATOS_CONTEUDO.map(formato => [formato, publicados.filter(id => id.endsWith(`:${formato}`)).length]),
      ) as Record<FormatoConteudo, number>;
      return {
        email,
        nome: nomes.get(email.toLowerCase()) ?? email,
        total: publicados.length,
        totalPossivel,
        percentagem: totalPossivel ? Math.round((publicados.length / totalPossivel) * 100) : 0,
        porFormato,
      };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}
