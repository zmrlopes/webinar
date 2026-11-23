import { db } from "./db";
import { EMAIL_EQUIPA_ANA_BE_A_ROCK, ehZonaBeARock, type VotoBeARock, type ZonaBeARock } from "./be-a-rock";

const PREFIXO = "eventos:be-a-rock:2027:sondagem:";
const chaveVoto = (email: string) => `${PREFIXO}${email.trim().toLowerCase()}`;

export async function lerVotoBeARock(email: string): Promise<ZonaBeARock | null> {
  const { rows } = await db().query<{ valor: VotoBeARock }>(
    "select valor from dashboard_config where chave = $1", [chaveVoto(email)],
  );
  const zona = rows[0]?.valor.zona;
  return ehZonaBeARock(zona) ? zona : null;
}

/** Uma chave por evento e conta: repetir ou mudar a escolha nunca duplica votos. */
export async function guardarVotoBeARock(email: string, nome: string, zona: ZonaBeARock): Promise<ZonaBeARock> {
  if (!ehZonaBeARock(zona)) throw new Error("Escolhe NORTE, SUL ou Vejo em casa.");
  const voto: VotoBeARock = { email: email.trim().toLowerCase(), nome, zona, atualizadoEm: new Date().toISOString() };
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
  [chaveVoto(email), JSON.stringify(voto)]);
  return zona;
}

/** Separa na leitura os votos existentes e futuros pela hierarquia atual, sem os alterar. */
export async function listarVotosBeARock(ambito: "geral" | "ana" = "geral"): Promise<VotoBeARock[]> {
  const { rows } = await db().query<{ valor: VotoBeARock }>(
    `with recursive equipa_ana(email) as (
       select $2::text
       union
       select lower(trim(e.email)) from equipa_afiliados e
       join equipa_ana a on lower(trim(e.upline_email)) = a.email
     )
     select valor from dashboard_config
     where starts_with(chave, $1)
       and exists (select 1 from equipa_ana a where a.email = lower(trim(valor->>'email'))) = $3`,
    [PREFIXO, EMAIL_EQUIPA_ANA_BE_A_ROCK, ambito === "ana"],
  );
  return rows.map(r => r.valor).filter(v => ehZonaBeARock(v.zona)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
}
