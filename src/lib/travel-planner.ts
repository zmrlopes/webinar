/**
 * Travel planner — o documento que o consultor entrega ao cliente depois da
 * reserva. Tipos e validação partilhados entre o browser e o servidor (sem
 * base de dados aqui). Só na nova área da conta de teste, como Reservas.
 */

export type EstiloPlanner = "classico" | "moderno" | "natural";
export type RitmoPlanner = "calmo" | "equilibrado" | "intenso";
export type TemaDica = "documentos" | "saude" | "moeda" | "clima" | "tomadas" | "fuso" | "mala" | "gorjetas" | "transportes" | "outro";

export const ESTILOS_PLANNER: {id: EstiloPlanner; nome: string; descricao: string}[] = [
  {id: "classico", nome: "Clássico", descricao: "Páginas brancas, títulos elegantes com serifa e detalhes verde-oliva."},
  {id: "moderno", nome: "Moderno", descricao: "Contraste a preto, letra direita e faixas escuras."},
  {id: "natural", nome: "Natural", descricao: "Tons creme e verde-oliva, ambiente calmo."},
];
export const TIPOS_VIAGEM = ["Casal", "Lua de mel", "Família com crianças", "Amigos", "Sozinho/a", "Sénior", "Grupo"] as const;
export const INTERESSES_PLANNER = ["Praia", "Cultura e história", "Gastronomia", "Compras", "Natureza", "Aventura", "Vida noturna", "Relaxar e spa", "Parques temáticos", "Fotografia"] as const;
export const RITMOS_PLANNER: {id: RitmoPlanner; nome: string}[] = [
  {id: "calmo", nome: "Calmo — muito tempo livre"},
  {id: "equilibrado", nome: "Equilibrado"},
  {id: "intenso", nome: "Intenso — ver o máximo possível"},
];
export const TEMAS_DICA: Record<TemaDica, string> = {
  documentos: "Documentos e entrada no país", saude: "Saúde e vacinas", moeda: "Moeda e pagamentos", clima: "Clima e roupa",
  tomadas: "Tomadas e eletricidade", fuso: "Fuso horário", mala: "O que levar na mala", gorjetas: "Gorjetas",
  transportes: "Deslocações no destino", outro: "Outras dicas",
};
/** Temas onde um erro pode estragar a viagem: ficam "a confirmar" até o consultor os validar. */
export const TEMAS_SENSIVEIS: TemaDica[] = ["documentos", "saude"];

/** Fotografia do Wikimedia (url https) ou carregada pelo consultor (data:image/jpeg). */
export interface FotoPlanner { url: string; credito: string }
export interface DiaPlanner {
  titulo: string; manha: string; tarde: string; noite: string;
  /** Local principal do dia — dá o pino no mapa e a pesquisa da fotografia. */
  local: string; lat: number | null; lng: number | null; pesquisa: string; foto: FotoPlanner | null;
}
export interface DicaPlanner { tema: TemaDica; titulo: string; texto: string; sensivel: boolean; confirmado: boolean }
export interface VooPlanner {
  sentido: "ida" | "volta"; data: string; numero: string; companhia: string;
  origem: string; origemCidade: string; origemLat: number | null; origemLng: number | null;
  destino: string; destinoCidade: string; destinoLat: number | null; destinoLng: number | null;
  partida: string; chegada: string;
}
export interface ExtrasPlanner {
  destinoLat: number | null; destinoLng: number | null;
  /** Temperaturas médias por mês (janeiro a dezembro), aproximadas. */
  clima: {max: number; min: number}[];
  fuso: number | null; moeda: string; lingua: string; tomada: string;
}
export interface TravelPlanner {
  id: string;
  nome: string;
  estilo: EstiloPlanner;
  viagem: {
    destino: string; partida: string; ida: string; regresso: string; voo: string; viajantes: number | null;
    bagagem: string; transfer: string; hotel: string; quarto: string; regime: string;
  };
  perfil: {tipo: string; interesses: string[]; ritmo: RitmoPlanner; notas: string};
  dias: DiaPlanner[];
  dicas: DicaPlanner[];
  emergencia: {texto: string; confirmado: boolean};
  voos: VooPlanner[];
  extras: ExtrasPlanner;
  foto: FotoPlanner | null;
  fotoHotel: FotoPlanner | null;
  atualizadoEm?: string;
}
export interface ResumoPlanner { id: string; nome: string; destino: string; ida: string; atualizadoEm: string }

export class ErroPlanner extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

export const MAX_DIAS_PLANNER = 21;
export const MAX_FOTO_CARREGADA = 700_000;
/** O Wikimedia serve as fotografias de upload.wikimedia.org e as miniaturas de thumb.wikimedia.org. */
export const FOTO_WIKIMEDIA = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;

export const extrasVazios = (): ExtrasPlanner => ({destinoLat: null, destinoLng: null, clima: [], fuso: null, moeda: "", lingua: "", tomada: ""});
export const diaVazio = (): DiaPlanner => ({titulo: "", manha: "", tarde: "", noite: "", local: "", lat: null, lng: null, pesquisa: "", foto: null});
export const vooVazio = (sentido: "ida" | "volta"): VooPlanner => ({sentido, data: "", numero: "", companhia: "", origem: "", origemCidade: "", origemLat: null, origemLng: null,
  destino: "", destinoCidade: "", destinoLat: null, destinoLng: null, partida: "", chegada: ""});

export function plannerVazio(id: string): TravelPlanner {
  return {
    id, nome: "", estilo: "classico",
    viagem: {destino: "", partida: "", ida: "", regresso: "", voo: "", viajantes: null, bagagem: "", transfer: "", hotel: "", quarto: "", regime: ""},
    perfil: {tipo: "", interesses: [], ritmo: "equilibrado", notas: ""},
    dias: [], dicas: [], emergencia: {texto: "", confirmado: false}, voos: [], extras: extrasVazios(), foto: null, fotoHotel: null,
  };
}

/** Número de dias entre ida e regresso, inclusive — null se as datas não forem válidas. */
export function diasDaViagem(ida: string, regresso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ida) || !/^\d{4}-\d{2}-\d{2}$/.test(regresso)) return null;
  const dias = Math.round((Date.parse(`${regresso}T12:00:00Z`) - Date.parse(`${ida}T12:00:00Z`)) / 86_400_000) + 1;
  return dias >= 1 ? dias : null;
}

export function dataPlanner(iso: string, opcoes: Intl.DateTimeFormatOptions = {day: "numeric", month: "long", year: "numeric"}): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", {...opcoes, timeZone: "UTC"});
}

export function somarDiasPlanner(iso: string, dias: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** O que falta confirmar antes de o planner poder ser entregue ao cliente. */
export function pendentesPlanner(p: TravelPlanner): string[] {
  const falta = p.dicas.filter(d => d.sensivel && !d.confirmado).map(d => d.titulo);
  if (p.emergencia.texto.trim() && !p.emergencia.confirmado) falta.push("Contactos de emergência");
  return falta;
}

const texto = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
const umDe = <T extends string>(v: unknown, opcoes: readonly T[], omissao: T): T => opcoes.includes(v as T) ? v as T : omissao;
const objeto = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
const numero = (v: unknown, min: number, max: number): number | null => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const data = (x: unknown) => { const t = texto(x, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ""; };
const hora = (x: unknown) => { const t = texto(x, 5); return /^\d{1,2}:\d{2}$/.test(t) ? t.padStart(5, "0") : ""; };

export function validarFoto(v: unknown): FotoPlanner | null {
  const f = objeto(v), url = typeof f.url === "string" ? f.url : "";
  if (FOTO_WIKIMEDIA.test(url) && url.length < 2000) return {url, credito: texto(f.credito, 200)};
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(url) && url.length <= MAX_FOTO_CARREGADA) return {url, credito: texto(f.credito, 200)};
  return null;
}

export function validarDia(v: unknown): DiaPlanner {
  const d = objeto(v);
  return {titulo: texto(d.titulo, 120), manha: texto(d.manha, 700), tarde: texto(d.tarde, 700), noite: texto(d.noite, 700),
    local: texto(d.local, 120), lat: numero(d.lat, -90, 90), lng: numero(d.lng, -180, 180), pesquisa: texto(d.pesquisa, 120), foto: validarFoto(d.foto)};
}

export function validarDica(v: unknown): DicaPlanner {
  const d = objeto(v);
  const tema = umDe(d.tema, Object.keys(TEMAS_DICA) as TemaDica[], "outro");
  const sensivel = TEMAS_SENSIVEIS.includes(tema);
  return {tema, titulo: texto(d.titulo, 100) || TEMAS_DICA[tema], texto: texto(d.texto, 1200), sensivel, confirmado: sensivel ? d.confirmado === true : true};
}

export function validarVoo(v: unknown): VooPlanner {
  const d = objeto(v), codigo = (x: unknown) => texto(x, 4).toUpperCase().replace(/[^A-Z]/g, "");
  return {sentido: d.sentido === "volta" ? "volta" : "ida", data: data(d.data), numero: texto(d.numero, 12), companhia: texto(d.companhia, 60),
    origem: codigo(d.origem), origemCidade: texto(d.origemCidade, 60), origemLat: numero(d.origemLat, -90, 90), origemLng: numero(d.origemLng, -180, 180),
    destino: codigo(d.destino), destinoCidade: texto(d.destinoCidade, 60), destinoLat: numero(d.destinoLat, -90, 90), destinoLng: numero(d.destinoLng, -180, 180),
    partida: hora(d.partida), chegada: hora(d.chegada)};
}

export function validarExtras(v: unknown): ExtrasPlanner {
  const e = objeto(v);
  const clima = Array.isArray(e.clima) && e.clima.length === 12
    ? e.clima.map(m => { const o = objeto(m); return {max: numero(o.max, -60, 60) ?? 0, min: numero(o.min, -70, 60) ?? 0}; }) : [];
  return {destinoLat: numero(e.destinoLat, -90, 90), destinoLng: numero(e.destinoLng, -180, 180), clima,
    fuso: numero(e.fuso, -14, 14), moeda: texto(e.moeda, 60), lingua: texto(e.lingua, 60), tomada: texto(e.tomada, 60)};
}

export function validarPlanner(v: unknown): TravelPlanner {
  const p = objeto(v), viagem = objeto(p.viagem), perfil = objeto(p.perfil), emergencia = objeto(p.emergencia);
  const id = typeof p.id === "string" && /^[0-9a-f-]{36}$/i.test(p.id) ? p.id : "";
  if (!id) throw new ErroPlanner("Travel planner inválido.");
  const viajantes = typeof viagem.viajantes === "number" && Number.isInteger(viagem.viajantes) && viagem.viajantes > 0 && viagem.viajantes < 100 ? viagem.viajantes : null;
  return {
    id,
    nome: texto(p.nome, 120),
    estilo: umDe(p.estilo, ESTILOS_PLANNER.map(e => e.id), "classico"),
    viagem: {
      destino: texto(viagem.destino, 160), partida: texto(viagem.partida, 120), ida: data(viagem.ida), regresso: data(viagem.regresso),
      voo: texto(viagem.voo, 600), viajantes, bagagem: texto(viagem.bagagem, 300), transfer: texto(viagem.transfer, 300),
      hotel: texto(viagem.hotel, 200), quarto: texto(viagem.quarto, 200), regime: texto(viagem.regime, 120),
    },
    perfil: {
      tipo: texto(perfil.tipo, 60),
      interesses: Array.isArray(perfil.interesses) ? [...new Set(perfil.interesses.map(i => texto(i, 40)).filter(Boolean))].slice(0, 12) : [],
      ritmo: umDe(perfil.ritmo, RITMOS_PLANNER.map(r => r.id), "equilibrado"),
      notas: texto(perfil.notas, 600),
    },
    dias: Array.isArray(p.dias) ? p.dias.slice(0, MAX_DIAS_PLANNER).map(validarDia) : [],
    dicas: Array.isArray(p.dicas) ? p.dicas.slice(0, 20).map(validarDica) : [],
    emergencia: {texto: texto(emergencia.texto, 1000), confirmado: emergencia.confirmado === true},
    voos: Array.isArray(p.voos) ? p.voos.slice(0, 6).map(validarVoo) : [],
    extras: validarExtras(p.extras),
    foto: validarFoto(p.foto),
    fotoHotel: validarFoto(p.fotoHotel),
  };
}

// ---------- cores do consultor ----------

/** As cores que cada consultor escolhe para os seus planners. O logótipo iCliGo não muda. */
export interface MarcaPlanner { principal: string; destaque: string; escura: string }
export const MARCA_PADRAO: MarcaPlanner = {principal: "#4b5320", destaque: "#c9971c", escura: "#111111"};
export const PALETAS_PLANNER: {nome: string; marca: MarcaPlanner}[] = [
  {nome: "iCliGo", marca: MARCA_PADRAO},
  {nome: "Oceano", marca: {principal: "#0f5c7a", destaque: "#f2a33a", escura: "#0b2733"}},
  {nome: "Tropical", marca: {principal: "#0f7a5c", destaque: "#ff7a59", escura: "#123029"}},
  {nome: "Romântico", marca: {principal: "#9c3d54", destaque: "#d9a441", escura: "#2b1219"}},
  {nome: "Elegante", marca: {principal: "#1f2a44", destaque: "#c5a46d", escura: "#0d1220"}},
  {nome: "Terra", marca: {principal: "#a0522d", destaque: "#e0b13a", escura: "#2e1a10"}},
];

const HEX = /^#[0-9a-f]{6}$/i;
export function validarMarca(v: unknown): MarcaPlanner {
  const m = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const cor = (x: unknown, omissao: string) => typeof x === "string" && HEX.test(x.trim()) ? x.trim().toLowerCase() : omissao;
  return {principal: cor(m.principal, MARCA_PADRAO.principal), destaque: cor(m.destaque, MARCA_PADRAO.destaque), escura: cor(m.escura, MARCA_PADRAO.escura)};
}

function rgbDe(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
/** Mistura com branco (fator > 0) ou preto (fator < 0). */
export function misturar(hex: string, fator: number): string {
  const alvo = fator >= 0 ? 255 : 0, f = Math.abs(fator);
  return `#${rgbDe(hex).map(c => Math.round(c + (alvo - c) * f).toString(16).padStart(2, "0")).join("")}`;
}
export function comAlfa(hex: string, alfa: number): string {
  const [r, g, b] = rgbDe(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}
/** Branco ou preto, o que se lê melhor em cima desta cor. */
export function textoSobre(hex: string): string {
  const [r, g, b] = rgbDe(hex).map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.4 ? "#111111" : "#ffffff";
}

/** Todas as tonalidades usadas no desenho, calculadas a partir das três cores do consultor. */
export function coresPlanner(m: MarcaPlanner) {
  return {
    principal: m.principal, destaque: m.destaque, escura: m.escura,
    suave: misturar(m.principal, 0.85), creme: misturar(m.principal, 0.93), linhaSuave: misturar(m.principal, 0.7),
    principalEscuro: misturar(m.principal, -0.4),
    /** Para texto e ícones em fundo claro: uma cor principal clara (ex.: amarelo) escurece para se ler. */
    principalTexto: textoSobre(m.principal) === "#ffffff" ? m.principal : misturar(m.principal, -0.55),
    principalA25: comAlfa(m.principal, 0.25), principalA55: comAlfa(m.principal, 0.55),
    destaqueSuave: misturar(m.destaque, 0.9), destaqueFundo: comAlfa(m.destaque, 0.16), destaqueEscuro: misturar(m.destaque, -0.3),
    barraMax: misturar(m.principal, 0.6), barraMin: misturar(m.principal, 0.3),
    capaA70: comAlfa(misturar(m.principal, -0.7), 0.7), capaA92: comAlfa(misturar(m.principal, -0.7), 0.92),
    escuraA78: comAlfa(m.escura, 0.78), escuraA95: comAlfa(m.escura, 0.95),
    sobrePrincipal: textoSobre(m.principal), sobreDestaque: textoSobre(m.destaque), sobreEscura: textoSobre(m.escura),
  };
}
export type CoresPlanner = ReturnType<typeof coresPlanner>;
