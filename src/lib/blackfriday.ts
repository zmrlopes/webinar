export const CAMPANHA_BF = "2026";
export const META_BF = 3_000_000;
export const CASAS_BF = [
  "Europa", "Ásia", "América", "Parques temáticos", "África",
  "Cruzeiro", "Ilhas portuguesas", "Ilhas espanholas", "Ilhas do Mediterrâneo", "Estadia com pequeno-almoço",
  "Caraíbas", "Ilhas africanas", "Avião", "Safari", "Ilhas do Índico",
  "Mediterrâneo", "Viagem com mais de 7 noites", "Hotel de 5 estrelas", "Circuito", "Ilhas do Atlântico",
  "Sudeste Asiático", "Norte de África", "Ilhas tropicais", "Ilhas vulcânicas", "Viagem intercontinental",
] as const;
export interface ConfiguracaoBF {
  inicio: string; fim: string; centro: "livre" | "reserva5k";
  periodoFaturacao: "desafio" | "anual";
  premioLinha: string; premioBingo: string;
}
export const CONFIG_BF: ConfiguracaoBF = {
  inicio: "2026-11-09", fim: "2026-12-07", centro: "reserva5k", periodoFaturacao: "desafio",
  premioLinha: "Entrada no evento Mindset Elite", premioBingo: "Bilhetes pagos para todos os eventos anuais",
};
export interface InscricaoBF {
  id: string; email: string; nome: string; casa: number; referencia: string;
  valorCentimos: number; dataReserva: string; curinga: boolean;
  estado: "pendente" | "aprovada" | "recusada";
  enviadoEm: string; revistoEm?: string; motivo?: string;
  ficheiroNome: string; ficheiroTipo: string; hash: string;
  revisoes: {estado: "aprovada" | "recusada"; em: string; motivo: string}[];
  simulacao?: boolean;
}
export interface FaturacaoBF {
  valor: number; atualizadoEm: string; inicio: string; fim: string;
  periodo: ConfiguracaoBF["periodoFaturacao"];
}
export interface DadosBF {
  config: ConfiguracaoBF; hoje: string; inscricoes: InscricaoBF[]; faturacao: FaturacaoBF | null; simulacao?: boolean;
  /** Presente quando o TP pertence à equipa de um líder com meta própria (em vez da meta geral de 3M). */
  metaEquipa?: {nome: string; meta: number; faturacao: FaturacaoBF | null} | null;
}
export interface RankingBF {
  inicio: string; fim: string; atualizadoEm: string;
  consultores: {username: string; email: string; nome: string; valor: number}[];
}
export interface MetricasOrgBF {
  /** TPs (de qualquer uma das organizações) com faturação própria positiva durante o desafio. */
  tpsQueVenderam: number;
  /** Faturação própria total dos TPs que venderam, dividida por esse número. */
  ticketMedioTP: number | null;
  /** Linhas diretas (um TP direto de um dos líderes de topo + a sua equipa, exceto ramos de outro líder) com pelo menos uma venda. */
  linhasAFaturar: number;
  /** Total de linhas diretas existentes, para dar contexto ao número anterior. */
  totalLinhas: number;
}
export interface DadosAdminBF extends DadosBF {ranking: RankingBF | null; metricas: MetricasOrgBF | null; metricasGlobais?: import("./blackfriday-globais").MetricasGlobaisBF | null}
export function hojeBF(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Lisbon"}).format(agora);
}
export function dataValidaBF(valor: unknown): valor is string {
  return typeof valor === "string" && /^2026-\d{2}-\d{2}$/.test(valor)
    && Number.isFinite(Date.parse(valor + "T12:00:00Z"))
    && new Date(valor + "T12:00:00Z").toISOString().slice(0, 10) === valor;
}
export function periodoBF(config: ConfiguracaoBF, hoje: string) {
  const inicio = config.periodoFaturacao === "anual" ? config.inicio.slice(0, 4) + "-01-01" : config.inicio;
  return {inicio, fim: hoje < config.fim ? hoje : config.fim};
}
export function resumirBF(inscricoes: InscricaoBF[], config: ConfiguracaoBF, apenasAprovadas = false) {
  // Uma nova tentativa recusada nunca elimina uma reserva aprovada.
  const validas = inscricoes.filter(i => apenasAprovadas ? i.estado === "aprovada" : i.estado !== "recusada");
  const casas = new Set(validas.map(i => i.casa));
  // O avião central também exige comprovativo; configurações antigas não dão casas gratuitas.
  const linhas = Array.from({length: 5}, (_, linha) => linha).filter(l =>
    Array.from({length: 5}, (_, col) => l * 5 + col).every(c => casas.has(c)));
  const bingo = casas.size === 25;
  return {casas: casas.size, linhas, bingo,
    bingoEm: bingo ? validas.reduce((maisRecente, i) => i.enviadoEm > maisRecente ? i.enviadoEm : maisRecente, "") : null};
}
export interface LinhaDiretaBF {
  tpEmail: string;
  lider: string;
  /** O próprio TP direto + toda a sua descendência, em minúsculas. */
  membros: string[];
}

/**
 * As linhas diretas da organização: um TP direto de um dos líderes de topo
 * (upline_email = email do líder) e toda a sua equipa — exceto os ramos que
 * pertencem a outro dos líderes fixos, que ficam só com esse líder mesmo que
 * estruturalmente apareçam como descendência deste. Função pura, a partir
 * dos pares email/upline já lidos da base de dados.
 */
export function calcularLinhasDiretasBF(
  pessoas: {email: string; uplineEmail: string | null}[],
  lideres: {email: string; nome: string}[],
): LinhaDiretaBF[] {
  const norm = (v: string) => v.trim().toLowerCase();
  const emailsLideres = new Set(lideres.map(l => norm(l.email)));
  const filhosPorUpline = new Map<string, string[]>();
  for (const p of pessoas) {
    if (!p.uplineEmail) continue;
    const chave = norm(p.uplineEmail);
    const lista = filhosPorUpline.get(chave) ?? [];
    lista.push(norm(p.email));
    filhosPorUpline.set(chave, lista);
  }
  const linhas: LinhaDiretaBF[] = [];
  for (const lider of lideres) {
    const diretos = (filhosPorUpline.get(norm(lider.email)) ?? []).filter(e => !emailsLideres.has(e));
    for (const direto of diretos) {
      const membros = [direto];
      const pilha = [direto];
      while (pilha.length) {
        const atual = pilha.pop()!;
        for (const filho of filhosPorUpline.get(atual) ?? []) {
          if (emailsLideres.has(filho)) continue; // ramo de outro líder de topo: fica só com ele
          membros.push(filho);
          pilha.push(filho);
        }
      }
      linhas.push({tpEmail: direto, lider: lider.nome, membros});
    }
  }
  return linhas;
}

/** TPs que já venderam, ticket médio entre eles e quantas linhas diretas têm pelo menos uma venda. */
export function calcularMetricasOrgBF(consultoresComVenda: {email: string; valor: number}[], linhas: LinhaDiretaBF[]): MetricasOrgBF {
  const tpsQueVenderam = consultoresComVenda.length;
  const totalValor = consultoresComVenda.reduce((soma, c) => soma + c.valor, 0);
  const ticketMedioTP = tpsQueVenderam ? Math.round((totalValor / tpsQueVenderam) * 100) / 100 : null;
  const emailsComVenda = new Set(consultoresComVenda.map(c => c.email.trim().toLowerCase()).filter(Boolean));
  const linhasAFaturar = linhas.filter(l => l.membros.some(m => emailsComVenda.has(m))).length;
  return {tpsQueVenderam, ticketMedioTP, linhasAFaturar, totalLinhas: linhas.length};
}

export function referenciaBF(valor: string): string {
  return valor.trim().toUpperCase().replace(/[\s._-]+/g, "");
}
export function validarReservaBF(corpo: Record<string, unknown>, config: ConfiguracaoBF, hoje: string) {
  const casa = Number(corpo.casa);
  if (!Number.isInteger(casa) || casa < 0 || casa >= CASAS_BF.length) throw new Error("Escolhe uma casa disponível.");
  if (hoje < config.inicio || hoje > config.fim) throw new Error("O envio de reservas está disponível entre o início e o fim do desafio.");
  const referencia = typeof corpo.referencia === "string" ? referenciaBF(corpo.referencia) : "";
  if (!/^[\p{L}\p{N}/]{3,80}$/u.test(referencia)) throw new Error("Indica a referência da reserva (3 a 80 letras ou números).");
  const valor = typeof corpo.valor === "string" && /^\d{1,8}(?:[.,]\d{1,2})?$/.test(corpo.valor) ? Number(corpo.valor.replace(",", ".")) : NaN;
  const valorCentimos = Math.round(valor * 100);
  if (!Number.isSafeInteger(valorCentimos) || valorCentimos <= 0) throw new Error("Indica o valor total da reserva em euros.");
  const dataReserva = corpo.dataReserva;
  if (!dataValidaBF(dataReserva) || dataReserva < config.inicio || dataReserva > config.fim || dataReserva > hoje) throw new Error("A data da reserva tem de estar dentro do desafio e não pode ser futura.");
  const curinga = corpo.curinga === true || corpo.curinga === "true" || casa === 12;
  if (curinga && valorCentimos < 500_000) throw new Error("O joker exige uma única reserva de pelo menos 5.000 €.");
  return {casa, referencia, valorCentimos, dataReserva, curinga};
}
