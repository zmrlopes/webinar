export const CAMPANHA_BF = "2026";
export const META_BF = 3_000_000;
export const CASAS_BF = [
  "Circuito", "Disneyland", "Baleares", "Continente americano", "Cabo Verde",
  "Menorca", "Europa", "Egito", "África", "Cruzeiro",
  "Safari", "Maiorca", "Avião", "Grécia", "Riviera Maya",
  "Cuba", "Ilha portuguesa", "Ibiza", "Caraíbas", "Marrocos",
  "Tunísia", "Ásia", "República Dominicana", "Canárias", "Estadia com pequeno-almoço",
] as const;
export interface ConfiguracaoBF {
  inicio: string; fim: string; centro: "livre" | "reserva5k";
  periodoFaturacao: "desafio" | "anual";
  premioLinha: string; premioBingo: string;
}
export const CONFIG_BF: ConfiguracaoBF = {
  inicio: "2026-11-13", fim: "2026-12-13", centro: "livre", periodoFaturacao: "desafio",
  premioLinha: "A anunciar", premioBingo: "Bilhetes pagos para todos os eventos anuais",
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
}
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
  if (config.centro === "livre") casas.add(12);
  const linhas = Array.from({length: 5}, (_, linha) => linha).filter(l =>
    Array.from({length: 5}, (_, col) => l * 5 + col).every(c => casas.has(c)));
  const bingo = casas.size === 25;
  return {casas: casas.size, linhas, bingo,
    bingoEm: bingo ? validas.reduce((maisRecente, i) => i.enviadoEm > maisRecente ? i.enviadoEm : maisRecente, "") : null};
}
export function referenciaBF(valor: string): string {
  return valor.trim().toUpperCase().replace(/[\s._-]+/g, "");
}
export function validarReservaBF(corpo: Record<string, unknown>, config: ConfiguracaoBF, hoje: string) {
  const casa = Number(corpo.casa);
  if (!Number.isInteger(casa) || casa < 0 || casa >= CASAS_BF.length || (casa === 12 && config.centro === "livre")) throw new Error("Escolhe uma casa disponível.");
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
