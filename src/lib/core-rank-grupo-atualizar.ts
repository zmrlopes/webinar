import { construirCoreGrupo } from "./core-rank-grupo";
import type { DadosCoreDiretos, MembroCoreDiretos } from "./core-rank-diretos";
import type { Periodo } from "./dashboard-sincronizar";

type Bruto = Record<string, { corpo: unknown }>;
interface Afiliado {
  user: { username: string; name: string; email: string; creationDate: string };
  upline?: { username?: string };
  stats: { sales: number; subscriptions?: number };
  subscriptionInfo?: { subscriptionStatus?: string };
}

function lerMembrosPeriodo(bruto: Bruto, periodo: Periodo): MembroCoreDiretos[] | null {
  const prefixo = `equipa-${periodo.chave}:p`;
  const paginas = Object.keys(bruto).filter(k => k.startsWith(prefixo) && /^\d+$/.test(k.slice(prefixo.length)))
    .sort((a, b) => Number(a.slice(prefixo.length)) - Number(b.slice(prefixo.length)));
  const membros = new Map<string, MembroCoreDiretos>();
  let esperado: number | undefined;
  for (const [indice, chave] of paginas.entries()) {
    if (Number(chave.slice(prefixo.length)) !== indice) return null;
    const pagina = bruto[chave]!.corpo as { list?: { content?: Afiliado[]; totalElements?: number }; content?: Afiliado[]; totalElements?: number };
    const total = pagina.list?.totalElements ?? pagina.totalElements;
    if (!Number.isInteger(total) || total! <= 0 || (esperado !== undefined && esperado !== total)) return null;
    esperado = total;
    for (const a of pagina.list?.content ?? pagina.content ?? []) {
      if (!a.user?.username || !Number.isFinite(a.stats?.sales) || membros.has(a.user.username.toLowerCase())) return null;
      membros.set(a.user.username.toLowerCase(), {
        username: a.user.username, nome: a.user.name, email: a.user.email ?? "",
        upline: a.upline?.username ?? "", estado: a.subscriptionInfo?.subscriptionStatus ?? "ACTIVE",
        entrada: a.user.creationDate?.slice(0, 10) ?? null, reservas: a.stats.sales, subscricoes: a.stats.subscriptions ?? 0,
      });
    }
  }
  if (esperado === undefined || membros.size !== esperado) return null;
  return [...membros.values()];
}

/** Recupera no servidor uma recolha completa, sempre do mesmo período dos cartões. */
export function recuperarArvoreCoreGrupo(bruto: Bruto, anterior: DadosCoreDiretos): MembroCoreDiretos[] | null {
  const plano = bruto.plano?.corpo as { periodos?: Periodo[] } | undefined;
  for (const periodo of plano?.periodos ?? []) {
    if (periodo.inicio !== anterior.desde || periodo.fim !== anterior.ate) continue;
    const membros = lerMembrosPeriodo(bruto, periodo);
    if (membros) return membros;
  }
  return null;
}

/** Só resolve a identidade; os volumes de períodos diferentes nunca são misturados. */
export function identificarContaCoreBruto(bruto: Bruto, email: string): string {
  const contas = new Map<string, string>();
  for (const [chave, valor] of Object.entries(bruto)) {
    if (!/^equipa(?:-[^:]+)?:p\d+$/.test(chave)) continue;
    const pagina = valor.corpo as { list?: { content?: Afiliado[] }; content?: Afiliado[] };
    for (const a of pagina.list?.content ?? pagina.content ?? []) {
      if (a.user?.username && a.user.email?.trim().toLowerCase() === email.trim().toLowerCase()) contas.set(a.user.username.toLowerCase(), a.user.username);
    }
  }
  if (contas.size !== 1) throw new Error("Este email não identifica uma única conta nos dados guardados. Confirma o email ou usa Atualizar dados.");
  return [...contas.values()][0]!;
}

/** Usa apenas uma recolha completa do período pedido pela ferramenta existente. */
export function prepararAtualizacaoCoreGrupo(bruto: Bruto, anterior: DadosCoreDiretos) {
  const plano = bruto.plano?.corpo as { periodos?: Periodo[] } | undefined;
  const periodo = plano?.periodos?.find(p => p.chave === "core-rank-grupo");
  if (!periodo || periodo.inicio !== anterior.desde) return null;
  const lista = lerMembrosPeriodo(bruto, periodo);
  if (!lista) return null;
  const dados = construirCoreGrupo(lista, anterior.grupo!, periodo.inicio, periodo.fim, "Atualizar dados · MyOffice");
  // A contagem vem das relações diretas e datas recolhidas, sem manter cartões antigos.
  dados.consultores.forEach(c => { c.subscricoes = c.novos.length; });
  return { membros: lista, dados };
}
