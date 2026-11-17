import { db } from "./db";
import { ehZonaBeARock, type VotoBeARock, type ZonaBeARock } from "./be-a-rock";

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
  if (!ehZonaBeARock(zona)) throw new Error("Escolhe NORTE ou SUL.");
  const voto: VotoBeARock = { email: email.trim().toLowerCase(), nome, zona, atualizadoEm: new Date().toISOString() };
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
  [chaveVoto(email), JSON.stringify(voto)]);
  return zona;
}

export async function listarVotosBeARock(): Promise<VotoBeARock[]> {
  const { rows } = await db().query<{ valor: VotoBeARock }>(
    "select valor from dashboard_config where starts_with(chave, $1)", [PREFIXO],
  );
  return rows.map(r => r.valor).filter(v => ehZonaBeARock(v.zona)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
}
