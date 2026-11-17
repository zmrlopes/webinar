import { db } from "./db";
import {
  ehOpcaoCruzeiroTropaElite,
  MAXIMO_ACOMPANHANTES_CRUZEIRO,
  opcaoIncluiCruzeiro,
  type OpcaoCruzeiroTropaElite,
  type VotoCruzeiroTropaElite,
} from "./cruzeiro-tropa-elite";

const PREFIXO = "eventos:cruzeiro-tropa-elite:2027:sondagem:";
const chaveVoto = (email: string) => `${PREFIXO}${email.trim().toLowerCase()}`;

function normalizarAcompanhantes(opcao: OpcaoCruzeiroTropaElite, valor: unknown): number {
  if (!opcaoIncluiCruzeiro(opcao)) return 0;
  const numero = Math.trunc(Number(valor));
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.min(numero, MAXIMO_ACOMPANHANTES_CRUZEIRO);
}

export async function lerVotoCruzeiroTropaElite(email: string): Promise<VotoCruzeiroTropaElite | null> {
  const { rows } = await db().query<{ valor: VotoCruzeiroTropaElite }>(
    "select valor from dashboard_config where chave = $1", [chaveVoto(email)],
  );
  const voto = rows[0]?.valor;
  return voto && ehOpcaoCruzeiroTropaElite(voto.opcao) ? voto : null;
}

/** Uma chave por evento e conta: repetir ou mudar a escolha nunca duplica votos. */
export async function guardarVotoCruzeiroTropaElite(
  email: string, nome: string, opcao: OpcaoCruzeiroTropaElite, acompanhantes: unknown,
): Promise<VotoCruzeiroTropaElite> {
  if (!ehOpcaoCruzeiroTropaElite(opcao)) throw new Error("Escolhe uma das opções do cruzeiro.");
  const voto: VotoCruzeiroTropaElite = {
    email: email.trim().toLowerCase(), nome, opcao,
    acompanhantes: normalizarAcompanhantes(opcao, acompanhantes),
    atualizadoEm: new Date().toISOString(),
  };
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
  [chaveVoto(email), JSON.stringify(voto)]);
  return voto;
}

export async function listarVotosCruzeiroTropaElite(): Promise<VotoCruzeiroTropaElite[]> {
  const { rows } = await db().query<{ valor: VotoCruzeiroTropaElite }>(
    "select valor from dashboard_config where starts_with(chave, $1)", [PREFIXO],
  );
  return rows.map(r => r.valor).filter(v => ehOpcaoCruzeiroTropaElite(v.opcao)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
}
