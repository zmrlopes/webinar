import { db } from "./db";
import {
  ehOpcaoCruzeiroTropaElite,
  MAXIMO_ACOMPANHANTES_CRUZEIRO,
  opcaoIncluiCruzeiro,
  perguntaDividirCabine,
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

function normalizarDispostoDividirCabine(opcao: OpcaoCruzeiroTropaElite, acompanhantes: number, valor: unknown): boolean | null {
  if (!perguntaDividirCabine(opcao, acompanhantes)) return null;
  return typeof valor === "boolean" ? valor : null;
}

function normalizarVoto(voto: VotoCruzeiroTropaElite | undefined): VotoCruzeiroTropaElite | null {
  if (!voto || !ehOpcaoCruzeiroTropaElite(voto.opcao)) return null;
  return { ...voto, dispostoDividirCabine: normalizarDispostoDividirCabine(voto.opcao, voto.acompanhantes, voto.dispostoDividirCabine) };
}

export async function lerVotoCruzeiroTropaElite(email: string): Promise<VotoCruzeiroTropaElite | null> {
  const { rows } = await db().query<{ valor: VotoCruzeiroTropaElite }>(
    "select valor from dashboard_config where chave = $1", [chaveVoto(email)],
  );
  return normalizarVoto(rows[0]?.valor);
}

/** Uma chave por evento e conta: repetir ou mudar a escolha nunca duplica votos. */
export async function guardarVotoCruzeiroTropaElite(
  email: string, nome: string, opcao: OpcaoCruzeiroTropaElite, acompanhantes: unknown, dispostoDividirCabine: unknown,
): Promise<VotoCruzeiroTropaElite> {
  if (!ehOpcaoCruzeiroTropaElite(opcao)) throw new Error("Escolhe uma das opções do cruzeiro.");
  const totalAcompanhantes = normalizarAcompanhantes(opcao, acompanhantes);
  const voto: VotoCruzeiroTropaElite = {
    email: email.trim().toLowerCase(), nome, opcao,
    acompanhantes: totalAcompanhantes,
    dispostoDividirCabine: normalizarDispostoDividirCabine(opcao, totalAcompanhantes, dispostoDividirCabine),
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
  return rows.map(r => normalizarVoto(r.valor)).filter((v): v is VotoCruzeiroTropaElite => v !== null).sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
}
