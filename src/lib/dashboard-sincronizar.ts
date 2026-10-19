import { db } from "./db";

/**
 * Atualização do Dashboard Negócio sem passar pelo Claude: o botão
 * «Atualizar dashboard» (um favorito do browser) corre no separador do
 * MyOffice, onde está a sessão da iCliGo, e abre /admin/dashboard-negocio/atualizar.
 * Essa página pede ao separador do MyOffice os pedidos à API (a sessão nunca
 * sai de lá) e envia as respostas para aqui. As respostas ficam guardadas tal
 * como vieram, em dashboard_bruto, e é daqui que se calculam os separadores.
 */

/** Hoje em Lisboa, como AAAA-MM-DD. */
export function hojeLisboa(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(agora);
}

export interface Periodo {
  chave: string;
  inicio: string;
  fim: string;
}

const dois = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/**
 * Os períodos a pedir ao MyOffice: cada mês desde o último que o dashboard já
 * tem (que pode ter ficado a meio) até ao mês atual, o ano até hoje e os
 * mesmos dias do mês atual no ano anterior, para a comparação dos Mapas.
 */
export function periodosAPedir(hoje: string, primeiroMes: number): Periodo[] {
  const [ano, mes, dia] = hoje.split("-").map(Number) as [number, number, number];
  const periodos: Periodo[] = [];
  for (let m = Math.max(1, Math.min(primeiroMes, mes)); m <= mes; m++) {
    const fim = m === mes ? hoje : `${ano}-${dois(m)}-${dois(ultimoDia(ano, m))}`;
    periodos.push({ chave: `mes-${ano}-${dois(m)}`, inicio: `${ano}-${dois(m)}-01`, fim });
  }
  periodos.push({ chave: `ano-${ano}`, inicio: `${ano}-01-01`, fim: hoje });
  const diaAnterior = Math.min(dia, ultimoDia(ano - 1, mes));
  periodos.push({
    chave: `parcial-${ano - 1}-${dois(mes)}`,
    inicio: `${ano - 1}-${dois(mes)}-01`,
    fim: `${ano - 1}-${dois(mes)}-${dois(diaAnterior)}`,
  });
  return periodos;
}

/** Guarda a resposta de um pedido ao MyOffice, tal como veio. */
export async function guardarBruto(chave: string, corpo: unknown): Promise<void> {
  await db().query(
    `insert into dashboard_bruto (chave, corpo, recebido_em)
     values ($1, $2, now())
     on conflict (chave) do update set corpo = excluded.corpo, recebido_em = now()`,
    [chave, JSON.stringify(corpo)],
  );
}

export async function lerBruto(): Promise<Record<string, { corpo: unknown; recebidoEm: string }>> {
  const { rows } = await db().query<{ chave: string; corpo: unknown; recebido_em: string }>(
    `select chave, corpo, recebido_em from dashboard_bruto order by chave`,
  );
  return Object.fromEntries(rows.map((r) => [r.chave, { corpo: r.corpo, recebidoEm: r.recebido_em }]));
}

export async function limparBruto(): Promise<void> {
  await db().query(`delete from dashboard_bruto`);
}

/**
 * Faturação do período no Metabase da iCliGo: o cartão «Volume Negócio Total»
 * dos Indicadores de Equipa (dashcard 210, card 185), somando a coluna Valor.
 * O link do Metabase vem do MyOffice já assinado, por isso pede-se daqui.
 */
export async function faturacaoMetabase(iframeUrl: string, inicio: string, fim: string): Promise<number> {
  const token = iframeUrl.match(/\/embed\/dashboard\/([^#?/]+)/)?.[1];
  if (!token) throw new Error("link do Metabase sem token");
  const url =
    `https://metabase.icligo.com/api/embed/dashboard/${token}/dashcard/210/card/185` +
    `?start_date=${inicio}&end_date=${fim}`;
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`Metabase respondeu ${resposta.status}`);
  const corpo = (await resposta.json()) as { data?: { cols?: { name?: string; display_name?: string }[]; rows?: unknown[][] } };
  const cols = corpo.data?.cols ?? [];
  const idx = cols.findIndex((c) => /valor/i.test(c.display_name ?? c.name ?? ""));
  if (idx < 0) throw new Error("Metabase sem coluna Valor");
  return (corpo.data?.rows ?? []).reduce((soma, linha) => soma + (Number(linha[idx]) || 0), 0);
}
