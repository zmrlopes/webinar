/** Gestão de pedidos de orçamento: cada consultor acompanha os seus próprios pedidos, do primeiro contacto à reserva. */
export const CANAIS_ORCAMENTO = ["Instagram", "WhatsApp", "Formulário", "Facebook", "TikTok", "Recomendação", "Cliente antigo", "Outro"] as const;
export const PRIORIDADES_ORCAMENTO = ["Alta", "Média", "Baixa"] as const;
export const REGIMES_ORCAMENTO = ["Tudo incluído", "Meia pensão", "Pequeno-almoço", "Só alojamento", "Indiferente"] as const;
export const TIPOS_VIAGEM_ORCAMENTO = ["Lua de mel", "Família", "Casal", "Amigos", "Circuito", "City break", "Outro"] as const;

export const ESTADOS_ORCAMENTO = [
  { chave: "novo", titulo: "Novo" },
  { chave: "enviado", titulo: "Orçamento enviado" },
  { chave: "acompanhamento", titulo: "Em acompanhamento" },
  { chave: "alteracoes", titulo: "Alterações pedidas" },
  { chave: "reservado", titulo: "Reservado" },
  { chave: "perdido", titulo: "Não avançou" },
] as const;
export type EstadoOrcamento = typeof ESTADOS_ORCAMENTO[number]["chave"];
export const ESTADOS_FECHADOS_ORCAMENTO = new Set<EstadoOrcamento>(["reservado", "perdido"]);
export const nomeEstadoOrcamento = (chave: string): string => ESTADOS_ORCAMENTO.find(e => e.chave === chave)?.titulo ?? ESTADOS_ORCAMENTO[0].titulo;

export interface DadosPedidoOrcamento {
  nome: string; contacto: string; canal: string; prioridade: typeof PRIORIDADES_ORCAMENTO[number];
  destino: string; partida: string; datas: string; noites: number | null; adultos: number | null; criancas: string;
  regime: string; plafond: number | null; tipo: string;
  estado: EstadoOrcamento; enviadoEm: string; proximo: string; valor: number | null; notas: string;
}
export interface PedidoOrcamento extends DadosPedidoOrcamento {
  id: string; criadoEm: string; atualizadoEm: string;
}

export class ErroOrcamento extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

const objeto = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ErroOrcamento("Dados do pedido inválidos.");
  return v as Record<string, unknown>;
};
const texto = (v: unknown, max = 500): string => {
  if (v == null) return "";
  if (typeof v !== "string" || v.length > max) throw new ErroOrcamento(`Texto inválido ou demasiado longo (máximo ${max} caracteres).`);
  return v.trim();
};
const opcao = <T extends readonly string[]>(v: unknown, opcoes: T): T[number] | "" => {
  const t = texto(v, 60);
  if (t && !opcoes.includes(t as T[number])) throw new ErroOrcamento("Valor não reconhecido.");
  return t as T[number] | "";
};
const inteiroOuNulo = (v: unknown, min: number, max: number): number | null => {
  if (v == null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < min || v > max) throw new ErroOrcamento("Número inválido.");
  return v;
};
const montanteOuNulo = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10_000_000) throw new ErroOrcamento("Montante inválido.");
  return Math.round(v * 100) / 100;
};
const dataOuVazia = (v: unknown): string => {
  const d = texto(v, 10);
  if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) throw new ErroOrcamento("Data inválida.");
  return d;
};

export function pedidoOrcamentoVazio(): DadosPedidoOrcamento {
  return {
    nome: "", contacto: "", canal: "", prioridade: "Média", destino: "", partida: "", datas: "", noites: null, adultos: null, criancas: "",
    regime: "", plafond: null, tipo: "", estado: "novo", enviadoEm: "", proximo: "", valor: null, notas: "",
  };
}

/** Valida apenas os campos editáveis; id, criadoEm e atualizadoEm são sempre controlados pelo servidor. */
export function validarDadosPedidoOrcamento(valor: unknown): DadosPedidoOrcamento {
  const v = objeto(valor);
  const nome = texto(v.nome, 150), destino = texto(v.destino, 150);
  if (!nome) throw new ErroOrcamento("Indica o nome do cliente.");
  if (!destino) throw new ErroOrcamento("Indica o destino.");
  const estado = texto(v.estado, 20) || "novo";
  if (!ESTADOS_ORCAMENTO.some(e => e.chave === estado)) throw new ErroOrcamento("Estado do pedido inválido.");
  const prioridade = texto(v.prioridade, 20) || "Média";
  if (!PRIORIDADES_ORCAMENTO.includes(prioridade as typeof PRIORIDADES_ORCAMENTO[number])) throw new ErroOrcamento("Prioridade inválida.");
  return {
    nome, contacto: texto(v.contacto, 150), canal: opcao(v.canal, CANAIS_ORCAMENTO), prioridade: prioridade as typeof PRIORIDADES_ORCAMENTO[number],
    destino, partida: texto(v.partida, 150), datas: texto(v.datas, 150), noites: inteiroOuNulo(v.noites, 0, 365), adultos: inteiroOuNulo(v.adultos, 0, 50),
    criancas: texto(v.criancas, 150), regime: opcao(v.regime, REGIMES_ORCAMENTO), plafond: montanteOuNulo(v.plafond), tipo: opcao(v.tipo, TIPOS_VIAGEM_ORCAMENTO),
    estado: estado as EstadoOrcamento, enviadoEm: dataOuVazia(v.enviadoEm), proximo: dataOuVazia(v.proximo),
    valor: estado === "reservado" ? montanteOuNulo(v.valor) : null, notas: texto(v.notas, 2000),
  };
}

/** Para acompanhar hoje: tem próximo contacto marcado, não está fechado e a data já chegou. */
export function pedidoPendenteHoje(p: Pick<PedidoOrcamento, "proximo" | "estado">, hojeISO: string): boolean {
  return !!p.proximo && !ESTADOS_FECHADOS_ORCAMENTO.has(p.estado) && p.proximo <= hojeISO;
}
