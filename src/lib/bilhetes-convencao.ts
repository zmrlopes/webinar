/**
 * Pedidos de bilhete para a Convenção Nacional iCligo (13 de março de 2027),
 * nos packs comprados pela equipa. Cada pedido vai como uma linha para uma
 * Google Sheet, através de um Apps Script publicado como aplicação web
 * (código em scripts/apps-script-bilhetes-convencao.gs).
 *
 * O URL do script e o segredo partilhado ficam só no servidor: sem eles, o
 * formulário recusa gravar em vez de fingir que gravou.
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
  if (!OPCOES_PAGAMENTO.includes(pagamento as OpcaoPagamento)) falta.push("forma de pagamento");
  if (corpo?.confirmado !== true) falta.push("confirmação");
  if (falta.length) return `Falta preencher: ${falta.join(", ")}.`;

  if (!Number.isInteger(bilhetes) || bilhetes < 1 || bilhetes > MAX_BILHETES) {
    return `O número de bilhetes tem de ser entre 1 e ${MAX_BILHETES}.`;
  }
  if (email && !FORMATO_EMAIL.test(email)) return "O email não parece válido.";
  if (bilhetes > 1 && !acompanhantes) return "Escreve o nome de cada acompanhante.";

  return { nome, telemovel, email, bilhetes, acompanhantes, pagamento: pagamento as OpcaoPagamento, observacoes };
}

export class FolhaIndisponivelError extends Error {}

/** Envia o pedido para o Apps Script, que acrescenta uma linha à folha. */
export async function gravarPedidoBilhete(pedido: PedidoBilhete): Promise<void> {
  const url = process.env.BILHETES_SHEETS_URL;
  const segredo = process.env.BILHETES_SHEETS_SEGREDO;
  if (!url || !segredo) {
    throw new FolhaIndisponivelError("BILHETES_SHEETS_URL ou BILHETES_SHEETS_SEGREDO não definidas");
  }

  // O Apps Script responde ao POST com um redirecionamento para
  // script.googleusercontent.com; o fetch segue-o e lê a resposta final.
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ segredo, ...pedido }),
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  const corpo = await resposta.text();

  let resultado: { ok?: boolean; erro?: string } | null = null;
  try {
    resultado = JSON.parse(corpo);
  } catch {
    // Uma página HTML aqui quase sempre quer dizer que a aplicação web não
    // foi publicada com acesso "Qualquer pessoa".
  }
  if (!resposta.ok || resultado?.ok !== true) {
    throw new FolhaIndisponivelError(
      `Apps Script respondeu ${resposta.status}: ${resultado?.erro ?? corpo.slice(0, 200)}`,
    );
  }
}
