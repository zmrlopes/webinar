/**
 * Travel planner — o documento que o consultor entrega ao cliente depois da
 * reserva. Tipos e validação partilhados entre o browser e o servidor (sem
 * base de dados aqui). Só na nova área da conta de teste, como Reservas.
 */

export type EstiloPlanner = "classico" | "moderno" | "natural";
export type RitmoPlanner = "calmo" | "equilibrado" | "intenso";
export type TemaDica = "documentos" | "saude" | "moeda" | "clima" | "tomadas" | "fuso" | "mala" | "gorjetas" | "transportes" | "outro";

export const ESTILOS_PLANNER: {id: EstiloPlanner; nome: string; descricao: string}[] = [
  {id: "classico", nome: "Clássico", descricao: "Fundo branco, títulos com serifa e detalhes verde-oliva."},
  {id: "moderno", nome: "Moderno", descricao: "Capa a preto, letra direita e faixas escuras nos títulos."},
  {id: "natural", nome: "Natural", descricao: "Capa verde-oliva e cartões em tom creme."},
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

export interface DiaPlanner { titulo: string; manha: string; tarde: string; noite: string }
export interface DicaPlanner { tema: TemaDica; titulo: string; texto: string; sensivel: boolean; confirmado: boolean }
export interface FotoPlanner { url: string; credito: string }
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
  foto: FotoPlanner | null;
  atualizadoEm?: string;
}
export interface ResumoPlanner { id: string; nome: string; destino: string; ida: string; atualizadoEm: string }

export class ErroPlanner extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

export const MAX_DIAS_PLANNER = 21;

export function plannerVazio(id: string): TravelPlanner {
  return {
    id, nome: "", estilo: "classico",
    viagem: {destino: "", partida: "", ida: "", regresso: "", voo: "", viajantes: null, bagagem: "", transfer: "", hotel: "", quarto: "", regime: ""},
    perfil: {tipo: "", interesses: [], ritmo: "equilibrado", notas: ""},
    dias: [], dicas: [], emergencia: {texto: "", confirmado: false}, foto: null,
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

/** O que falta confirmar antes de o planner poder ser entregue ao cliente. */
export function pendentesPlanner(p: TravelPlanner): string[] {
  const falta = p.dicas.filter(d => d.sensivel && !d.confirmado).map(d => d.titulo);
  if (p.emergencia.texto.trim() && !p.emergencia.confirmado) falta.push("Contactos de emergência");
  return falta;
}

const texto = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
const umDe = <T extends string>(v: unknown, opcoes: readonly T[], omissao: T): T => opcoes.includes(v as T) ? v as T : omissao;
const objeto = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;

export function validarDia(v: unknown): DiaPlanner {
  const d = objeto(v);
  return {titulo: texto(d.titulo, 120), manha: texto(d.manha, 700), tarde: texto(d.tarde, 700), noite: texto(d.noite, 700)};
}

export function validarDica(v: unknown): DicaPlanner {
  const d = objeto(v);
  const tema = umDe(d.tema, Object.keys(TEMAS_DICA) as TemaDica[], "outro");
  const sensivel = TEMAS_SENSIVEIS.includes(tema);
  return {tema, titulo: texto(d.titulo, 100) || TEMAS_DICA[tema], texto: texto(d.texto, 1200), sensivel, confirmado: sensivel ? d.confirmado === true : true};
}

export function validarPlanner(v: unknown): TravelPlanner {
  const p = objeto(v), viagem = objeto(p.viagem), perfil = objeto(p.perfil), emergencia = objeto(p.emergencia), foto = objeto(p.foto);
  const id = typeof p.id === "string" && /^[0-9a-f-]{36}$/i.test(p.id) ? p.id : "";
  if (!id) throw new ErroPlanner("Travel planner inválido.");
  const data = (x: unknown) => { const t = texto(x, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ""; };
  const viajantes = typeof viagem.viajantes === "number" && Number.isInteger(viagem.viajantes) && viagem.viajantes > 0 && viagem.viajantes < 100 ? viagem.viajantes : null;
  const fotoUrl = texto(foto.url, 2000);
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
    foto: fotoUrl.startsWith("https://upload.wikimedia.org/") ? {url: fotoUrl, credito: texto(foto.credito, 200)} : null,
  };
}
