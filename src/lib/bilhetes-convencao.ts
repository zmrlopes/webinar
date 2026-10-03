import { createHmac, timingSafeEqual } from "node:crypto";
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

export type PedidoBilheteGravado = PedidoBilhete & { id: number; criadoEm: Date };

const MAX_BILHETES = 20;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function criarTabela(): Promise<void> {
  await db().query(
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
  await db().query(
    `delete from pedidos_bilhete_convencao p
      using pedidos_bilhete_convencao anterior
      where p.email <> ''
        and lower(p.email) = lower(anterior.email)
        and anterior.id < p.id`,
  );
  await db().query(
    `create unique index if not exists pedidos_bilhete_convencao_email_unico
       on pedidos_bilhete_convencao (lower(email)) where email <> ''`,
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

export async function listarPedidosBilhete(): Promise<PedidoBilheteGravado[]> {
  await garantirTabela();
  const { rows } = await db().query<{
    id: string;
    criado_em: Date;
    nome: string;
    telemovel: string;
    email: string;
    bilhetes: number;
    acompanhantes: string;
    pagamento: OpcaoPagamento;
    observacoes: string;
  }>(`select * from pedidos_bilhete_convencao order by criado_em`);
  return rows.map((r) => ({
    id: Number(r.id),
    criadoEm: r.criado_em,
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    bilhetes: r.bilhetes,
    acompanhantes: r.acompanhantes,
    pagamento: r.pagamento,
    observacoes: r.observacoes,
  }));
}

export type TotaisBilhetes = {
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
