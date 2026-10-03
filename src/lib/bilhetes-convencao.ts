import { createHmac, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { db } from "./db";

/**
 * Pedidos de bilhete para a Convenção Nacional iCligo (13 de março de 2027),
 * nos packs comprados pela Sara Izza. Cada pedido fica na base de dados; o
 * /admin/bilhetes-convencao mostra a lista e os totais, e uma Google Sheet
 * pode ir buscá-los com =IMPORTDATA (ver urlCsvParaSheets).
 *
 * A tabela é criada no primeiro uso, para a página funcionar logo após o
 * deploy sem ter de correr as migrations à mão.
 *
 * Um pedido por email: um email repetido não conta. Os repetidos que já
 * estavam gravados são apagados (fica o primeiro) e um índice único impede
 * novos.
 */

export const OPCOES_PAGAMENTO = ["Só uma parte, para bloquear o lugar", "O valor total"] as const;
export type OpcaoPagamento = (typeof OPCOES_PAGAMENTO)[number];

export type PedidoBilhete = {
  nome: string;
  telemovel: string;
  email: string;
  bilhetes: number;
  acompanhantes: string;
  pagamento: OpcaoPagamento;
  observacoes: string;
};

export type PedidoBilheteGravado = PedidoBilhete & {
  id: number;
  criadoEm: Date;
  comprovativoNome: string | null;
  comprovativoEm: Date | null;
  comprovativo2Nome: string | null;
  comprovativo2Em: Date | null;
};

/**
 * Quem paga só uma parte paga em duas vezes: 1 é o pagamento de agora (ou o
 * valor total), 2 é o restante.
 */
export type NumeroPagamento = 1 | 2;

/** Quantos comprovativos este pedido precisa para ficar pago. */
export function pagamentosPrevistos(pagamento: string): NumeroPagamento {
  return pagamento === "O valor total" ? 1 : 2;
}

/** Tipos aceites para o comprovativo de pagamento: fotografia ou PDF. */
export const TIPOS_COMPROVATIVO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
// A Vercel rejeita pedidos acima de ~4.5MB antes de chegarem aqui.
export const TAMANHO_MAXIMO_COMPROVATIVO = 4 * 1024 * 1024;

const MAX_BILHETES = 20;
// A terminação tem de ter pelo menos 2 letras (.pt, .com) — apanha enganos como "outlook.y".
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

/** Valida o corpo vindo do browser. Devolve o pedido limpo ou a mensagem de erro a mostrar. */
export function validarPedidoBilhete(corpo: Record<string, unknown> | null): PedidoBilhete | string {
  const nome = texto(corpo?.nome, 120);
  const telemovel = texto(corpo?.telemovel, 40);
  const email = texto(corpo?.email, 160);
  const acompanhantes = texto(corpo?.acompanhantes, 500);
  const observacoes = texto(corpo?.observacoes, 2000);
  const bilhetes = Number(corpo?.bilhetes);
  const pagamento = corpo?.pagamento;

  const falta: string[] = [];
  if (!nome) falta.push("nome");
  if (!telemovel) falta.push("telemóvel");
  if (!email) falta.push("email");
  if (!OPCOES_PAGAMENTO.includes(pagamento as OpcaoPagamento)) falta.push("forma de pagamento");
  if (corpo?.confirmado !== true) falta.push("confirmação");
  if (falta.length) return `Falta preencher: ${falta.join(", ")}.`;

  if (!Number.isInteger(bilhetes) || bilhetes < 1 || bilhetes > MAX_BILHETES) {
    return `O número de bilhetes tem de ser entre 1 e ${MAX_BILHETES}.`;
  }
  if (!FORMATO_EMAIL.test(email)) return "O email não parece válido.";
  if (bilhetes > 1 && !acompanhantes) return "Escreve o nome de cada acompanhante.";

  return { nome, telemovel, email, bilhetes, acompanhantes, pagamento: pagamento as OpcaoPagamento, observacoes };
}

let tabelaPronta: Promise<unknown> | undefined;

/**
 * Várias instâncias do servidor podem arrancar ao mesmo tempo (muitos
 * consultores a abrir o painel): o advisory lock põe-nas em fila, para os
 * alter table / delete não se atropelarem.
 */
async function criarTabela(): Promise<void> {
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select pg_advisory_xact_lock(hashtext('pedidos_bilhete_convencao'))");
    await criarTabelaCom(cliente);
    await cliente.query("commit");
  } catch (erro) {
    await cliente.query("rollback").catch(() => undefined);
    throw erro;
  } finally {
    cliente.release();
  }
}

async function criarTabelaCom(cliente: PoolClient): Promise<void> {
  await cliente.query(
    `create table if not exists pedidos_bilhete_convencao (
       id bigserial primary key,
       criado_em timestamptz not null default now(),
       nome text not null,
       telemovel text not null,
       email text not null default '',
       bilhetes integer not null,
       acompanhantes text not null default '',
       pagamento text not null,
       observacoes text not null default ''
     )`,
  );
  // Fica o primeiro pedido de cada email; os seguintes são repetidos.
  await cliente.query(
    `delete from pedidos_bilhete_convencao p
      using pedidos_bilhete_convencao anterior
      where p.email <> ''
        and lower(p.email) = lower(anterior.email)
        and anterior.id < p.id`,
  );
  await cliente.query(
    `create unique index if not exists pedidos_bilhete_convencao_email_unico
       on pedidos_bilhete_convencao (lower(email)) where email <> ''`,
  );
  // Comprovativo de pagamento, enviado pelo consultor no painel dele.
  await cliente.query(
    `alter table pedidos_bilhete_convencao
       add column if not exists comprovativo_nome text,
       add column if not exists comprovativo_tipo text,
       add column if not exists comprovativo_bytes bytea,
       add column if not exists comprovativo_em timestamptz,
       add column if not exists comprovativo2_nome text,
       add column if not exists comprovativo2_tipo text,
       add column if not exists comprovativo2_bytes bytea,
       add column if not exists comprovativo2_em timestamptz`,
  );
}

function garantirTabela(): Promise<unknown> {
  tabelaPronta ??= criarTabela()
    .catch((erro) => {
      tabelaPronta = undefined;
      throw erro;
    });
  return tabelaPronta;
}

/** Devolve false se já havia um pedido com este email (e não grava nada). */
export async function gravarPedidoBilhete(pedido: PedidoBilhete): Promise<boolean> {
  await garantirTabela();
  const { rowCount } = await db().query(
    `insert into pedidos_bilhete_convencao
       (nome, telemovel, email, bilhetes, acompanhantes, pagamento, observacoes)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (lower(email)) where email <> '' do nothing`,
    [
      pedido.nome,
      pedido.telemovel,
      pedido.email,
      pedido.bilhetes,
      pedido.acompanhantes,
      pedido.pagamento,
      pedido.observacoes,
    ],
  );
  return rowCount === 1;
}

export async function apagarPedidoBilhete(id: number): Promise<boolean> {
  await garantirTabela();
  const { rowCount } = await db().query(`delete from pedidos_bilhete_convencao where id = $1`, [id]);
  return rowCount === 1;
}

/**
 * Passa o pedido para o email com que o consultor entra no painel (para o
 * cartão da Convenção o encontrar). Devolve false se outro pedido já usa
 * esse email.
 */
export async function mudarEmailPedido(id: number, email: string): Promise<"ok" | "nao-existe" | "email-ocupado"> {
  await garantirTabela();
  try {
    const { rowCount } = await db().query(`update pedidos_bilhete_convencao set email = $2 where id = $1`, [
      id,
      email.trim().toLowerCase(),
    ]);
    return rowCount === 1 ? "ok" : "nao-existe";
  } catch (erro) {
    if ((erro as { code?: string }).code === "23505") return "email-ocupado";
    throw erro;
  }
}

type LinhaPedido = {
  id: string;
  criado_em: Date;
  nome: string;
  telemovel: string;
  email: string;
  bilhetes: number;
  acompanhantes: string;
  pagamento: OpcaoPagamento;
  observacoes: string;
  comprovativo_nome: string | null;
  comprovativo_em: Date | null;
  comprovativo2_nome: string | null;
  comprovativo2_em: Date | null;
};

// Sem os bytes dos comprovativos: os ficheiros só se leem um a um, em buscarComprovativo.
const COLUNAS_PEDIDO = `id, criado_em, nome, telemovel, email, bilhetes, acompanhantes, pagamento,
  observacoes, comprovativo_nome, comprovativo_em, comprovativo2_nome, comprovativo2_em`;

function paraPedido(r: LinhaPedido): PedidoBilheteGravado {
  return {
    id: Number(r.id),
    criadoEm: r.criado_em,
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    bilhetes: r.bilhetes,
    acompanhantes: r.acompanhantes,
    pagamento: r.pagamento,
    observacoes: r.observacoes,
    comprovativoNome: r.comprovativo_nome,
    comprovativoEm: r.comprovativo_em,
    comprovativo2Nome: r.comprovativo2_nome,
    comprovativo2Em: r.comprovativo2_em,
  };
}

export async function listarPedidosBilhete(): Promise<PedidoBilheteGravado[]> {
  await garantirTabela();
  const { rows } = await db().query<LinhaPedido>(
    `select ${COLUNAS_PEDIDO} from pedidos_bilhete_convencao order by criado_em`,
  );
  return rows.map(paraPedido);
}

function normalizarNome(nome: string): string[] {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Mesmo primeiro e último nome ("Ana Maria Silva" = "Ana Silva"), sem acentos nem maiúsculas. */
function mesmoNome(a: string, b: string): boolean {
  const x = normalizarNome(a);
  const y = normalizarNome(b);
  if (x.length === 0 || y.length === 0) return false;
  if (x.join(" ") === y.join(" ")) return true;
  return x.length > 1 && y.length > 1 && x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
}

/**
 * O pedido de bilhete deste consultor, para o cartão da Convenção no painel.
 * Primeiro pelo email com que entra no painel; depois pela parte do email
 * antes do @ (enganos no domínio); por fim pelo nome —
 * há pedidos feitos com outro email (ou sem email, antes de ser
 * obrigatório). Pelo nome só conta se houver exatamente um pedido com esse
 * nome que ainda não pertença a outro membro da equipa pelo email.
 */
export async function buscarPedidoDoConsultor(
  email: string,
  nome: string | null,
): Promise<PedidoBilheteGravado | null> {
  await garantirTabela();
  const { rows } = await db().query<LinhaPedido>(
    `select ${COLUNAS_PEDIDO} from pedidos_bilhete_convencao
      where email <> '' and lower(email) = lower($1)`,
    [email.trim()],
  );
  if (rows[0]) return paraPedido(rows[0]);

  const { rows: semDono } = await db().query<LinhaPedido>(
    `select ${COLUNAS_PEDIDO.replace(/(\w+)/g, "p.$1")} from pedidos_bilhete_convencao p
      where not exists (
        select 1 from equipa_afiliados e where p.email <> '' and lower(e.email) = lower(p.email)
      )`,
  );

  // Engano só depois do @ ("gowithmarisa@outlook.y" em vez de "...outlook.pt"): mesma parte antes do @.
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const mesmoLocal = semDono.filter((r) => local && r.email.toLowerCase().split("@")[0] === local);
  if (mesmoLocal.length === 1 && mesmoLocal[0]) return paraPedido(mesmoLocal[0]);

  if (!nome) return null;
  const candidatos = semDono.filter((r) => mesmoNome(r.nome, nome));
  return candidatos.length === 1 && candidatos[0] ? paraPedido(candidatos[0]) : null;
}

// Prefixo das colunas de cada pagamento (valores fixos, nunca vindos do pedido).
const COLUNA: Record<NumeroPagamento, string> = { 1: "comprovativo", 2: "comprovativo2" };

/** Guarda (ou substitui) o comprovativo de um dos pagamentos deste pedido. */
export async function guardarComprovativo(
  id: number,
  numero: NumeroPagamento,
  ficheiro: { nome: string; tipo: string; bytes: Buffer },
): Promise<boolean> {
  await garantirTabela();
  const c = COLUNA[numero];
  const { rowCount } = await db().query(
    `update pedidos_bilhete_convencao
        set ${c}_nome = $2, ${c}_tipo = $3, ${c}_bytes = $4, ${c}_em = now()
      where id = $1`,
    [id, ficheiro.nome, ficheiro.tipo, ficheiro.bytes],
  );
  return rowCount === 1;
}

export async function buscarComprovativo(
  id: number,
  numero: NumeroPagamento,
): Promise<{ nome: string; tipo: string; bytes: Buffer } | null> {
  await garantirTabela();
  const c = COLUNA[numero];
  const { rows } = await db().query<{ nome: string; tipo: string; bytes: Buffer }>(
    `select ${c}_nome as nome, ${c}_tipo as tipo, ${c}_bytes as bytes
       from pedidos_bilhete_convencao
      where id = $1 and ${c}_bytes is not null`,
    [id],
  );
  return rows[0] ?? null;
}

export type TotaisBilhetes = {
  /** Pedidos com o 1º comprovativo (ou o do valor total) enviado. */
  comPrimeiroPagamento: number;
  /** Pedidos com todos os comprovativos previstos enviados. */
  pagos: number;
  pedidos: number;
  bilhetes: number;
  total: { pedidos: number; bilhetes: number };
  parte: { pedidos: number; bilhetes: number };
};

export function totaisBilhetes(pedidos: PedidoBilheteGravado[]): TotaisBilhetes {
  const de = (opcao: OpcaoPagamento) => {
    const lista = pedidos.filter((p) => p.pagamento === opcao);
    return { pedidos: lista.length, bilhetes: lista.reduce((s, p) => s + p.bilhetes, 0) };
  };
  return {
    comPrimeiroPagamento: pedidos.filter((p) => p.comprovativoEm).length,
    pagos: pedidos.filter((p) =>
      pagamentosPrevistos(p.pagamento) === 1 ? p.comprovativoEm : p.comprovativoEm && p.comprovativo2Em,
    ).length,
    pedidos: pedidos.length,
    bilhetes: pedidos.reduce((s, p) => s + p.bilhetes, 0),
    total: de("O valor total"),
    parte: de("Só uma parte, para bloquear o lugar"),
  };
}

function celulaCsv(valor: string): string {
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** CSV com vírgulas (o que o IMPORTDATA do Google Sheets espera). */
export function csvPedidosBilhete(pedidos: PedidoBilheteGravado[]): string {
  const cabecalho = [
    "Data do pedido",
    "Nome",
    "Telemóvel / WhatsApp",
    "Email",
    "Nº de bilhetes",
    "Acompanhantes",
    "Pagamento",
    "Observações",
    "Comprovativo 1º pagamento",
    "Comprovativo 2º pagamento",
  ];
  const linhas = pedidos.map((p) => [
    p.criadoEm.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }),
    p.nome,
    p.telemovel,
    p.email,
    String(p.bilhetes),
    p.acompanhantes,
    p.pagamento,
    p.observacoes,
    p.comprovativoEm ? `Enviado a ${p.comprovativoEm.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}` : "",
    pagamentosPrevistos(p.pagamento) === 1
      ? "Não se aplica"
      : p.comprovativo2Em
        ? `Enviado a ${p.comprovativo2Em.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}`
        : "",
  ]);
  return [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(",")).join("\n");
}

/**
 * Chave do link de CSV para a Google Sheet. O repositório é público, por
 * isso não pode estar no código: deriva da ADMIN_PASSWORD, que só existe no
 * servidor. Mudar a password muda o link (e a fórmula da folha tem de ser
 * copiada outra vez do /admin).
 */
function chaveCsv(): string | null {
  const segredo = process.env.ADMIN_PASSWORD;
  if (!segredo) return null;
  return createHmac("sha256", segredo).update("bilhetes-convencao-csv").digest("hex").slice(0, 32);
}

export function chaveCsvValida(chave: string | null): boolean {
  const esperada = chaveCsv();
  if (!esperada || !chave || chave.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(chave), Buffer.from(esperada));
}

export function urlCsvParaSheets(base: string): string | null {
  const chave = chaveCsv();
  return chave ? `${base}/api/bilhetes-convencao/csv?chave=${chave}` : null;
}

export type DiagnosticoConsultor = {
  email: string;
  membro: { email: string; nome: string } | null;
  pedido: PedidoBilheteGravado | null;
  parecidos: PedidoBilheteGravado[];
};

/**
 * Para o admin perceber porque é que um consultor não vê o cartão da
 * Convenção: se está na equipa, que pedido o painel lhe encontra, e que
 * pedidos têm um nome ou email parecido (para os ligar à mão).
 */
export async function diagnosticarConsultor(email: string): Promise<DiagnosticoConsultor> {
  const emailLimpo = email.trim().toLowerCase();
  const { rows } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados where lower(email) = $1`,
    [emailLimpo],
  );
  const membro = rows[0] ?? null;
  const pedido = await buscarPedidoDoConsultor(emailLimpo, membro?.nome ?? null);

  const todos = await listarPedidosBilhete();
  const nomes = new Set(normalizarNome(membro?.nome ?? ""));
  const local = emailLimpo.split("@")[0]?.replace(/[^a-z0-9]/g, "") ?? "";
  const parecidos = todos.filter((p) => {
    if (pedido && p.id === pedido.id) return false;
    const partilhaNome = normalizarNome(p.nome).some((n) => n.length > 2 && nomes.has(n));
    const localPedido = p.email.toLowerCase().split("@")[0]?.replace(/[^a-z0-9]/g, "") ?? "";
    const emailParecido =
      local.length > 3 && localPedido.length > 3 && (localPedido.includes(local) || local.includes(localPedido));
    return partilhaNome || emailParecido;
  });

  return { email: emailLimpo, membro, pedido, parecidos };
}
