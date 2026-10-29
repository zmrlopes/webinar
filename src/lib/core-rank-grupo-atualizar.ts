import { construirCoreGrupo } from "./core-rank-grupo";
import type { DadosCoreDiretos, MembroCoreDiretos } from "./core-rank-diretos";
import type { Periodo } from "./dashboard-sincronizar";

type Bruto = Record<string, { corpo: unknown }>;
interface Afiliado {
  user: { username: string; name: string; email: string; creationDate: string };
  upline?: { username?: string };
  stats: { sales: number };
  subscriptionInfo?: { subscriptionStatus?: string };
}

/** Usa apenas uma recolha completa do período pedido pela ferramenta existente. */
export function prepararAtualizacaoCoreGrupo(bruto: Bruto, anterior: DadosCoreDiretos) {
  const plano = bruto.plano?.corpo as { periodos?: Periodo[] } | undefined;
  const periodo = plano?.periodos?.find(p => p.chave === "core-rank-grupo");
  if (!periodo || periodo.inicio !== anterior.desde) return null;
  const paginas = Object.keys(bruto).filter(k => /^equipa-core-rank-grupo:p\d+$/.test(k)).sort((a, b) => Number(a.split(":p")[1]) - Number(b.split(":p")[1]));
  const membros = new Map<string, MembroCoreDiretos>();
  let esperado: number | undefined;
  for (const chave of paginas) {
    const pagina = bruto[chave]!.corpo as { list?: { content?: Afiliado[]; totalElements?: number }; content?: Afiliado[]; totalElements?: number };
    esperado ??= pagina.list?.totalElements ?? pagina.totalElements;
    for (const a of pagina.list?.content ?? pagina.content ?? []) {
      if (!a.user?.username || !Number.isFinite(a.stats?.sales)) return null;
      membros.set(a.user.username.toLowerCase(), {
        username: a.user.username, nome: a.user.name, email: a.user.email ?? "",
        upline: a.upline?.username ?? "", estado: a.subscriptionInfo?.subscriptionStatus ?? "ACTIVE",
        entrada: a.user.creationDate?.slice(0, 10) ?? null, reservas: a.stats.sales, subscricoes: 0,
      });
    }
  }
  if (esperado === undefined || membros.size < esperado || !membros.size) return null;
  const lista = [...membros.values()];
  const dados = construirCoreGrupo(lista, anterior.grupo!, periodo.inicio, periodo.fim, "Atualizar dados · MyOffice");
  // A contagem vem das relações diretas e datas recolhidas, sem manter cartões antigos.
  dados.consultores.forEach(c => { c.subscricoes = c.novos.length; });
  return { membros: lista, dados };
}
