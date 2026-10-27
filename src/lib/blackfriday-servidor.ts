import {createHash, randomUUID} from "node:crypto";
import sharp from "sharp";
import type {Pool, PoolClient} from "pg";
import {db} from "./db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "./demo";
import {dataSimulacaoBF} from "./blackfriday-simulacao";
import {CAMPANHA_BF, CONFIG_BF, dataValidaBF, hojeBF, periodoBF, validarReservaBF, type ConfiguracaoBF, type DadosBF, type FaturacaoBF, type InscricaoBF} from "./blackfriday";

const PREFIXO = `blackfriday:${CAMPANHA_BF}:`;
export const CHAVE_FATURACAO_BF = PREFIXO + "faturacao";
const prefixoRegistos = (simulacao: boolean) => PREFIXO + (simulacao ? "simulacao:" : "");
const chaveReserva = (id: string, simulacao = false) => prefixoRegistos(simulacao) + "reserva:" + id;
const chaveFicheiro = (id: string, simulacao = false) => prefixoRegistos(simulacao) + "ficheiro:" + id;
export class ErroBF extends Error {constructor(mensagem: string, public status = 400) {super(mensagem);}}
function verificarSimulacao(email: string | undefined, simulacao: boolean) {
  if (simulacao && email !== undefined && email !== EMAIL_PAINEL_DEMONSTRACAO) throw new ErroBF("A simulação está disponível apenas na conta de teste.", 403);
}
export async function configuracaoBF(cliente: Pool | PoolClient = db()): Promise<ConfiguracaoBF> {
  const {rows} = await cliente.query<{valor: Partial<ConfiguracaoBF>}>("select valor from dashboard_config where chave = $1", [PREFIXO + "config"]);
  // Aplica também a regra atual a configurações guardadas com o antigo centro livre.
  return {...CONFIG_BF, ...rows[0]?.valor, centro: "reserva5k"};
}
export async function listarReservasBF(email?: string, simulacao = false): Promise<InscricaoBF[]> {
  verificarSimulacao(email, simulacao);
  const {rows} = await db().query<{valor: InscricaoBF}>(
    "select valor from dashboard_config where starts_with(chave, $1) and ($2::text is null or valor->>'email' = $2) order by valor->>'enviadoEm', chave",
    [prefixoRegistos(simulacao) + "reserva:", email ?? null]);
  return rows.map(r => r.valor);
}
export async function dadosBF(email?: string, simulacao = false): Promise<DadosBF> {
  const [config, inscricoes, {rows}] = await Promise.all([configuracaoBF(), listarReservasBF(email, simulacao),
    db().query<{valor: FaturacaoBF}>("select valor from dashboard_config where chave = $1", [CHAVE_FATURACAO_BF])]);
  const faturacao = rows[0]?.valor;
  const periodo = periodoBF(config, hojeBF());
  const corresponde = faturacao && faturacao.periodo === config.periodoFaturacao && faturacao.inicio === periodo.inicio
    && faturacao.fim <= config.fim && faturacao.fim >= periodo.inicio;
  return {config, inscricoes, hoje: simulacao ? dataSimulacaoBF(config, hojeBF()) : hojeBF(), faturacao: corresponde ? faturacao : null, simulacao};
}

export async function guardarConfigBF(corpo: unknown) {
  const c = corpo as ConfiguracaoBF | null;
  if (!c || !dataValidaBF(c.inicio) || !dataValidaBF(c.fim) || c.fim < c.inicio
    || c.centro !== "reserva5k" || !["desafio", "anual"].includes(c.periodoFaturacao)
    || typeof c.premioLinha !== "string" || !c.premioLinha.trim() || c.premioLinha.length > 400
    || typeof c.premioBingo !== "string" || !c.premioBingo.trim() || c.premioBingo.length > 400) throw new ErroBF("Revê as datas e os prémios do desafio.");
  const config: ConfiguracaoBF = {inicio: c.inicio, fim: c.fim, centro: c.centro, periodoFaturacao: c.periodoFaturacao,
    premioLinha: c.premioLinha.trim(), premioBingo: c.premioBingo.trim()};
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select pg_advisory_xact_lock(hashtext($1))", [PREFIXO]);
    const {rows} = await cliente.query("select 1 from dashboard_config where starts_with(chave, $1) limit 1", [PREFIXO + "reserva:"]);
    const antigo = await configuracaoBF(cliente);
    if (rows.length && (antigo.inicio !== config.inicio || antigo.fim !== config.fim || antigo.centro !== config.centro)) {
      throw new ErroBF("Já existem participações. As datas e a regra do avião ficam bloqueadas para preservar os cartões e a ordem de conclusão.", 409);
    }
    await cliente.query("insert into dashboard_config (chave, valor) values ($1, $2::jsonb) on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()", [PREFIXO + "config", JSON.stringify(config)]);
    await cliente.query("commit");
  } catch (e) {await cliente.query("rollback"); throw e;} finally {cliente.release();}
  return config;
}

export async function enviarReservaBF(email: string, nome: string, corpo: Record<string, unknown>, ficheiro: File, simulacao = false) {
  verificarSimulacao(email, simulacao);
  if (!(ficheiro instanceof File) || !ficheiro.size || ficheiro.size > 3 * 1024 * 1024) throw new ErroBF("Anexa um print ou PDF com até 3 MB.");
  const bytes = Buffer.from(await ficheiro.arrayBuffer());
  let tipo: string;
  if (bytes.subarray(0, 5).toString() === "%PDF-") tipo = "application/pdf";
  else {
    const formato = await sharp(bytes, {limitInputPixels: 40_000_000}).metadata().then(m => m.format).catch(() => null);
    const tipos: Record<string, string> = {jpeg: "image/jpeg", png: "image/png", webp: "image/webp"};
    const detetado = tipos[formato ?? ""];
    if (!detetado) throw new ErroBF("Usa um print em PNG, JPG ou WebP, ou um PDF.");
    tipo = detetado;
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select pg_advisory_xact_lock(hashtext($1))", [PREFIXO]);
    const config = await configuracaoBF(cliente);
    let reserva: ReturnType<typeof validarReservaBF>;
    try {reserva = validarReservaBF(corpo, config, simulacao ? dataSimulacaoBF(config, hojeBF()) : hojeBF());} catch (e) {throw new ErroBF(e instanceof Error ? e.message : "Reserva inválida.");}
    const {rows} = await cliente.query<{valor: InscricaoBF}>("select valor from dashboard_config where starts_with(chave, $1) and valor->>'email' = $2", [prefixoRegistos(simulacao) + "reserva:", email]);
    const ativas = rows.map(r => r.valor).filter(i => i.estado !== "recusada");
    if (ativas.some(i => i.casa === reserva.casa)) throw new ErroBF("Esta casa já tem uma reserva enviada. Atualiza o cartão.", 409);
    if (ativas.some(i => i.referencia === reserva.referencia || i.hash === hash)) throw new ErroBF("Esta reserva ou este comprovativo já está a preencher outra casa. Cada reserva só pode ser usada uma vez.", 409);
    if (rows.length >= 150) throw new ErroBF("Atingiste o limite de envios deste desafio. Contacta a organização.", 429);
    const inscricao: InscricaoBF = {...reserva, id: randomUUID(), email, nome, estado: "pendente", enviadoEm: new Date().toISOString(),
      ficheiroNome: ficheiro.name.slice(0, 160), ficheiroTipo: tipo, hash, revisoes: [], ...(simulacao ? {simulacao: true} : {})};
    await cliente.query("insert into dashboard_config (chave, valor) values ($1, $2::jsonb), ($3, $4::jsonb)",
      [chaveReserva(inscricao.id, simulacao), JSON.stringify(inscricao), chaveFicheiro(inscricao.id, simulacao), JSON.stringify({base64: bytes.toString("base64")})]);
    await cliente.query("commit");
    return inscricao;
  } catch (e) {await cliente.query("rollback"); throw e;} finally {cliente.release();}
}
export async function reverReservaBF(id: unknown, estado: unknown, motivo: unknown, simulacao = false) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id) || !["aprovada", "recusada"].includes(String(estado))) throw new ErroBF("Revisão inválida.");
  if (typeof motivo !== "string" || motivo.length > 1000 || (estado === "recusada" && !motivo.trim())) throw new ErroBF("Indica o motivo da recusa (até 1.000 caracteres).");
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select pg_advisory_xact_lock(hashtext($1))", [PREFIXO]);
    const {rows} = await cliente.query<{valor: InscricaoBF}>("select valor from dashboard_config where chave = $1 for update", [chaveReserva(id, simulacao)]);
    const i = rows[0]?.valor;
    if (!i) throw new ErroBF("Reserva não encontrada.", 404);
    if (i.estado === "recusada" && estado === "aprovada") {
      const {rows: outras} = await cliente.query<{valor: InscricaoBF}>("select valor from dashboard_config where starts_with(chave, $1) and valor->>'email' = $2 and chave <> $3 and valor->>'estado' <> 'recusada'", [prefixoRegistos(simulacao) + "reserva:", i.email, chaveReserva(id, simulacao)]);
      if (outras.some(r => r.valor.casa === i.casa || r.valor.referencia === i.referencia || r.valor.hash === i.hash)) throw new ErroBF("Já existe outra participação a usar esta casa ou reserva. Revê-a primeiro.", 409);
    }
    const em = new Date().toISOString();
    const novo: InscricaoBF = {...i, estado: estado as "aprovada" | "recusada", motivo: motivo.trim(), revistoEm: em,
      revisoes: [...i.revisoes, {estado: estado as "aprovada" | "recusada", em, motivo: motivo.trim()}]};
    await cliente.query("update dashboard_config set valor = $2::jsonb, atualizado_em = now() where chave = $1", [chaveReserva(id, simulacao), JSON.stringify(novo)]);
    await cliente.query("commit");
  } catch (e) {await cliente.query("rollback"); throw e;} finally {cliente.release();}
}
export async function comprovativoBF(id: string, email?: string, simulacao = false) {
  verificarSimulacao(email, simulacao);
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ErroBF("Comprovativo não encontrado.", 404);
  const {rows} = await db().query<{valor: InscricaoBF; base64: string}>(
    "select r.valor, f.valor->>'base64' as base64 from dashboard_config r join dashboard_config f on f.chave = $2 where r.chave = $1 and ($3::text is null or r.valor->>'email' = $3)",
    [chaveReserva(id, simulacao), chaveFicheiro(id, simulacao), email ?? null]);
  const r = rows[0];
  if (!r) throw new ErroBF("Comprovativo não encontrado.", 404);
  return new Response(new Uint8Array(Buffer.from(r.base64, "base64")), {headers: {"Content-Type": r.valor.ficheiroTipo,
    "Content-Disposition": `${r.valor.ficheiroTipo === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(r.valor.ficheiroNome)}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox"}});
}
/** Limpa exclusivamente os ficheiros e as marcas de demonstração desta campanha. */
export async function limparSimulacaoBF() {
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select pg_advisory_xact_lock(hashtext($1))", [PREFIXO]);
    await cliente.query("delete from dashboard_config where starts_with(chave, $1)", [prefixoRegistos(true)]);
    await cliente.query("commit");
  } catch (e) {await cliente.query("rollback"); throw e;} finally {cliente.release();}
}
