import { randomUUID } from "node:crypto";
import { db } from "./db";
import { ErroOrcamento, validarDadosPedidoOrcamento, type PedidoOrcamento } from "./orcamentos";

// O email fica entre ":" na chave — cada consultor só vê os seus próprios pedidos.
const prefixo = (email: string) => `orcamentos:v1:${email}:item:`;

function idPedido(valor: unknown): string {
  if (typeof valor !== "string" || !/^[0-9a-f-]{36}$/i.test(valor)) throw new ErroOrcamento("Pedido inválido.");
  return valor;
}

export async function listarPedidosOrcamento(email: string): Promise<PedidoOrcamento[]> {
  const { rows } = await db().query<{ valor: PedidoOrcamento }>(
    "select valor from dashboard_config where starts_with(chave, $1) order by atualizado_em desc", [prefixo(email)]);
  return rows.map(r => r.valor);
}

export async function guardarPedidoOrcamento(email: string, corpo: unknown): Promise<PedidoOrcamento> {
  const dados = validarDadosPedidoOrcamento(corpo);
  const idEnviado = (corpo as { id?: unknown } | null)?.id;
  const id = idEnviado != null ? idPedido(idEnviado) : randomUUID();
  const chave = prefixo(email) + id;
  const existente = idEnviado != null ? await db().query<{ valor: PedidoOrcamento }>("select valor from dashboard_config where chave = $1", [chave]) : null;
  const agora = new Date().toISOString();
  const pedido: PedidoOrcamento = { ...dados, id, criadoEm: existente?.rows[0]?.valor.criadoEm ?? agora, atualizadoEm: agora };
  await db().query(
    `insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`,
    [chave, JSON.stringify(pedido)]);
  return pedido;
}

export async function apagarPedidoOrcamento(email: string, id: unknown): Promise<void> {
  await db().query("delete from dashboard_config where chave = $1", [prefixo(email) + idPedido(id)]);
}
