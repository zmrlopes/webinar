/**
 * Proposta de orçamento — junta até 3 PDFs iCliGo da mesma viagem (que só
 * mudam no alojamento) num documento visual para o cliente escolher. Tipos e
 * validação partilhados entre o browser e o servidor. Só na nova área da
 * conta de teste, como Reservas e o Travel planner.
 */
import {
  ESTILOS_PLANNER, extrasVazios, plannerVazio, validarDica, validarExtras, validarFoto, validarVoo,
  type DicaPlanner, type EstiloPlanner, type ExtrasPlanner, type FotoPlanner, type TravelPlanner, type VooPlanner,
} from "./travel-planner";

export const MAX_OPCOES_PROPOSTA = 3;

/** O que um PDF diz da viagem (lido pela IA). */
export interface ViagemProposta {
  destino: string; partida: string; ida: string; regresso: string; viajantes: number | null;
  voo: string; bagagem: string; transfer: string;
  /** Se os transfers estão incluídos no preço: sim, não, ou null quando o PDF não diz. */
  transferIncluido: boolean | null;
}
export interface HotelLido { nome: string; quarto: string; regime: string; periodo?: string; total: number | null; precoPessoa: number | null }
export interface HotelCircuito { nome: string; quarto: string; regime: string; periodo: string; foto: FotoPlanner | null }
export interface LeituraPDF {
  ficheiro: string; viagem: ViagemProposta; hoteis: HotelLido[];
  circuito?: HotelLido | null;
  incluido: string[]; naoIncluido: string[]; condicoes: string; validade: string;
}

export interface OpcaoProposta {
  tipo?: "hotel" | "circuito";
  hoteisCircuito?: HotelCircuito[];
  hotel: string; estrelas: number | null; zona: string; quarto: string; regime: string;
  total: number | null; precoPessoa: number | null;
  lat: number | null; lng: number | null;
  foto: FotoPlanner | null;
  /** O que esta opção tem de diferente das outras, além do hotel (voos, datas, transfer…). */
  diferencas: string;
  ficheiro: string;
}
export interface DestaqueProposta { titulo: string; texto: string; pesquisa: string; foto: FotoPlanner | null }

export interface Proposta {
  id: string;
  nome: string;
  estilo: EstiloPlanner;
  viagem: ViagemProposta;
  incluido: string[];
  naoIncluido: string[];
  condicoes: string;
  /** Data (YYYY-MM-DD) até à qual os preços são válidos. */
  validade: string;
  opcoes: OpcaoProposta[];
  /** Índice da opção destacada como "A nossa escolha", ou null. */
  recomendada: number | null;
  destaques: DestaqueProposta[];
  voos: VooPlanner[];
  extras: ExtrasPlanner;
  dicas: DicaPlanner[];
  emergencia: {texto: string; confirmado: boolean};
  foto: FotoPlanner | null;
  atualizadoEm?: string;
}
export interface ResumoProposta { id: string; nome: string; destino: string; ida: string; opcoes: number; atualizadoEm: string }

export const viagemVazia = (): ViagemProposta => ({destino: "", partida: "", ida: "", regresso: "", viajantes: null, voo: "", bagagem: "", transfer: "", transferIncluido: null});
export const opcaoVazia = (): OpcaoProposta => ({hotel: "", estrelas: null, zona: "", quarto: "", regime: "", total: null, precoPessoa: null, lat: null, lng: null, foto: null, diferencas: "", ficheiro: ""});

export function propostaVazia(id: string): Proposta {
  return {id, nome: "", estilo: "classico", viagem: viagemVazia(), incluido: [], naoIncluido: [], condicoes: "Preços sujeitos a disponibilidade no momento da reserva.",
    validade: "", opcoes: [], recomendada: null, destaques: [], voos: [], extras: extrasVazios(), dicas: [], emergencia: {texto: "", confirmado: false}, foto: null};
}

const texto = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
const objeto = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
const numero = (v: unknown, min: number, max: number): number | null => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const data = (x: unknown) => { const t = texto(x, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ""; };
const lista = (v: unknown, max: number, tamanho = 160) => Array.isArray(v) ? [...new Set(v.map(x => texto(x, tamanho)).filter(Boolean))].slice(0, max) : [];

export function validarViagemProposta(v: unknown): ViagemProposta {
  const d = objeto(v);
  const viajantes = typeof d.viajantes === "number" && Number.isInteger(d.viajantes) && d.viajantes > 0 && d.viajantes < 100 ? d.viajantes : null;
  return {destino: texto(d.destino, 160), partida: texto(d.partida, 120), ida: data(d.ida), regresso: data(d.regresso), viajantes,
    voo: texto(d.voo, 600), bagagem: texto(d.bagagem, 300), transfer: texto(d.transfer, 300),
    transferIncluido: typeof d.transferIncluido === "boolean" ? d.transferIncluido : null};
}

export function validarOpcao(v: unknown): OpcaoProposta {
  const o = objeto(v);
  return {tipo: o.tipo === "circuito" ? "circuito" : "hotel", hoteisCircuito: validarHoteisCircuito(o.hoteisCircuito), hotel: texto(o.hotel, 160), estrelas: numero(o.estrelas, 1, 5), zona: texto(o.zona, 120), quarto: texto(o.quarto, 200), regime: texto(o.regime, 120),
    total: numero(o.total, 0, 10_000_000), precoPessoa: numero(o.precoPessoa, 0, 10_000_000),
    lat: numero(o.lat, -90, 90), lng: numero(o.lng, -180, 180), foto: validarFoto(o.foto), diferencas: texto(o.diferencas, 600), ficheiro: texto(o.ficheiro, 160)};
}

function validarHoteisCircuito(v: unknown): HotelCircuito[] {
  return Array.isArray(v) ? v.slice(0, 20).map(x => {
    const h = objeto(x);
    return {nome: texto(h.nome, 160), quarto: texto(h.quarto, 200), regime: texto(h.regime, 120), periodo: texto(h.periodo, 160), foto: validarFoto(h.foto)};
  }).filter(h => h.nome) : [];
}

export function validarLeitura(v: unknown, ficheiro: string): LeituraPDF {
  const d = objeto(v);
  const hoteis = Array.isArray(d.hoteis) ? d.hoteis.slice(0, 20).map(h => {
    const o = objeto(h);
    return {nome: texto(o.nome, 160), quarto: texto(o.quarto, 200), regime: texto(o.regime, 120), periodo: texto(o.periodo, 160), total: numero(o.total, 0, 10_000_000), precoPessoa: numero(o.precoPessoa, 0, 10_000_000)};
  }).filter(h => h.nome) : [];
  const c = objeto(d.circuito);
  const circuito = texto(c.nome, 160) ? {nome: texto(c.nome, 160), quarto: texto(c.quarto, 200), regime: texto(c.regime, 120),
    total: numero(c.total, 0, 10_000_000), precoPessoa: numero(c.precoPessoa, 0, 10_000_000)} : null;
  return {circuito, ficheiro: texto(ficheiro, 160), viagem: validarViagemProposta(d.viagem), hoteis, incluido: lista(d.incluido, 16), naoIncluido: lista(d.naoIncluido, 12),
    condicoes: texto(d.condicoes, 800), validade: data(d.validade)};
}

export function validarProposta(v: unknown): Proposta {
  const p = objeto(v), emergencia = objeto(p.emergencia);
  const id = typeof p.id === "string" && /^[0-9a-f-]{36}$/i.test(p.id) ? p.id : "";
  if (!id) throw new Error("Proposta inválida.");
  const opcoes = Array.isArray(p.opcoes) ? p.opcoes.slice(0, MAX_OPCOES_PROPOSTA).map(validarOpcao) : [];
  const recomendada = typeof p.recomendada === "number" && Number.isInteger(p.recomendada) && p.recomendada >= 0 && p.recomendada < opcoes.length ? p.recomendada : null;
  return {
    id, nome: texto(p.nome, 120),
    estilo: ESTILOS_PLANNER.some(e => e.id === p.estilo) ? p.estilo as EstiloPlanner : "classico",
    viagem: validarViagemProposta(p.viagem),
    incluido: lista(p.incluido, 16), naoIncluido: lista(p.naoIncluido, 12), condicoes: texto(p.condicoes, 800), validade: data(p.validade),
    opcoes, recomendada,
    destaques: Array.isArray(p.destaques) ? p.destaques.slice(0, 6).map(x => { const d = objeto(x); return {titulo: texto(d.titulo, 80), texto: texto(d.texto, 400), pesquisa: texto(d.pesquisa, 120), foto: validarFoto(d.foto)}; }) : [],
    voos: Array.isArray(p.voos) ? p.voos.slice(0, 6).map(validarVoo) : [],
    extras: validarExtras(p.extras),
    dicas: Array.isArray(p.dicas) ? p.dicas.slice(0, 20).map(validarDica) : [],
    emergencia: {texto: texto(emergencia.texto, 1000), confirmado: emergencia.confirmado === true},
    foto: validarFoto(p.foto),
  };
}

/** O que falta confirmar antes de entregar (as mesmas regras do travel planner). */
export function pendentesProposta(p: Proposta): string[] {
  const falta = p.dicas.filter(d => d.sensivel && !d.confirmado).map(d => d.titulo);
  if (p.emergencia.texto.trim() && !p.emergencia.confirmado) falta.push("Contactos de emergência");
  if (!p.opcoes.length) falta.push("pelo menos uma opção de alojamento");
  return falta;
}

const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
const ROTULOS: [keyof ViagemProposta, string][] = [["ida", "Data de ida"], ["regresso", "Data de regresso"], ["voo", "Voos"], ["transfer", "Transfer"], ["bagagem", "Bagagem"], ["partida", "Partida"], ["viajantes", "Viajantes"]];

/**
 * Junta as leituras dos PDFs: o que é comum fica na viagem; cada hotel vira
 * uma opção. O que difere entre PDFs (além do hotel) vai para "diferencas"
 * da opção desse PDF, para o consultor rever.
 */
export function juntarLeituras(leituras: LeituraPDF[]): {viagem: ViagemProposta; opcoes: OpcaoProposta[]; incluido: string[]; naoIncluido: string[]; condicoes: string; validade: string; avisos: string[]} {
  const base = leituras[0]?.viagem ?? viagemVazia();
  const avisos: string[] = [];
  const opcoes: OpcaoProposta[] = [];
  for (const l of leituras) {
    const diferencas = ROTULOS.filter(([k]) => normal(String(l.viagem[k] ?? "")) !== normal(String(base[k] ?? "")) && String(l.viagem[k] ?? "").trim())
      .map(([k, rotulo]) => `${rotulo}: ${l.viagem[k]}`);
    // Transfers incluídos num PDF e não noutro: a opção tem de o dizer claramente.
    if (l.viagem.transferIncluido !== null && base.transferIncluido !== null && l.viagem.transferIncluido !== base.transferIncluido) {
      diferencas.push(l.viagem.transferIncluido ? "Transfers incluídos" : "Transfers não incluídos");
    }
    if (diferencas.length && l !== leituras[0]) avisos.push(`${l.ficheiro}: ${diferencas.map(d => d.split(":")[0]).join(", ")} diferente(s) da primeira proposta.`);
    if (l.circuito) avisos.push(`${l.ficheiro}: circuito identificado; os hotéis das etapas pertencem à mesma opção. Confirma o preço global e os serviços incluídos.`);
    for (const h of l.circuito ? [l.circuito] : l.hoteis) opcoes.push({...opcaoVazia(), tipo: l.circuito ? "circuito" : "hotel", hotel: h.nome, quarto: h.quarto, regime: h.regime,
      hoteisCircuito: l.circuito ? validarHoteisCircuito(l.hoteis) : [],
      total: precosDaOpcao(h, l.viagem.viajantes ?? base.viajantes).total, precoPessoa: precosDaOpcao(h, l.viagem.viajantes ?? base.viajantes).porPessoa,
      diferencas: l === leituras[0] ? "" : diferencas.join("\n"), ficheiro: l.ficheiro});
  }
  if (opcoes.length > MAX_OPCOES_PROPOSTA) avisos.push(`Encontrámos ${opcoes.length} alojamentos; ficaram os primeiros ${MAX_OPCOES_PROPOSTA}. Podes remover e trocar.`);
  const juntar = (k: "incluido" | "naoIncluido") => [...new Map(leituras.flatMap(l => l[k]).map(x => [normal(x), x])).values()];
  return {viagem: base, opcoes: opcoes.slice(0, MAX_OPCOES_PROPOSTA), incluido: juntar("incluido").slice(0, 16), naoIncluido: juntar("naoIncluido").slice(0, 12),
    condicoes: leituras.find(l => l.condicoes)?.condicoes ?? "", validade: leituras.map(l => l.validade).filter(Boolean).sort()[0] ?? "", avisos};
}

/** O travel planner que nasce da opção que o cliente escolheu. */
export function plannerDaProposta(p: Proposta, opcao: number, id: string): TravelPlanner {
  const o = p.opcoes[opcao];
  const base = plannerVazio(id);
  return {...base, nome: `Viagem a ${p.viagem.destino}${o?.hotel ? ` · ${o.hotel}` : ""}`, estilo: p.estilo,
    viagem: {...base.viagem, ...p.viagem, hotel: o?.hotel ?? "", quarto: o?.quarto ?? "", regime: o?.regime ?? ""},
    voos: p.voos, extras: p.extras, dicas: p.dicas, emergencia: p.emergencia, foto: p.foto, fotoHotel: o?.foto ?? null};
}

/**
 * Preço por pessoa e total de uma opção. Quando o PDF só traz um dos dois,
 * o outro calcula-se com o número de viajantes — assim nenhuma opção fica
 * sem preço por pessoa na comparação.
 */
export function precosDaOpcao(o: Pick<OpcaoProposta, "total" | "precoPessoa">, viajantes: number | null): {total: number | null; porPessoa: number | null} {
  const arredondar = (v: number) => Math.round(v * 100) / 100;
  const total = o.total ?? (o.precoPessoa !== null && viajantes ? arredondar(o.precoPessoa * viajantes) : null);
  const porPessoa = o.precoPessoa ?? (o.total !== null && viajantes ? arredondar(o.total / viajantes) : null);
  return {total, porPessoa};
}

/** Listas do que está incluído, com os transfers ditos de forma clara (incluídos ou não). */
export function listasIncluido(p: Pick<Proposta, "incluido" | "naoIncluido" | "viagem">): {sim: string[]; nao: string[]} {
  const semTransfer = (l: string[]) => p.viagem.transferIncluido === null ? l : l.filter(i => !/transfer/i.test(i));
  const sim = semTransfer(p.incluido), nao = semTransfer(p.naoIncluido);
  if (p.viagem.transferIncluido === true) sim.push("Transfers incluídos");
  if (p.viagem.transferIncluido === false) nao.push("Transfers não incluídos");
  return {sim, nao};
}

export function euros(v: number | null): string {
  return v === null ? "—" : `${v.toLocaleString("pt-PT", {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2})} €`;
}

/** Telemóvel para o WhatsApp: só dígitos, com o indicativo (351 por omissão). */
export function telemovelWhatsApp(v: unknown): string {
  const digitos = typeof v === "string" ? v.replace(/\D/g, "") : "";
  if (!digitos) return "";
  const completo = digitos.length === 9 && /^9/.test(digitos) ? `351${digitos}` : digitos.replace(/^00/, "");
  return completo.length >= 9 && completo.length <= 15 ? completo : "";
}
