/** Formato independente do renderer: a referência é convertida em elementos, nunca em código executável. */
export type FormatoReserva = "story" | "feed";
export const CAMPOS_RESERVA = ["livre", "destino", "frase", "partida", "datas", "ida", "regresso", "noites", "viajantes", "voo", "preco", "total", "hotel", "quarto", "regime", "bagagem", "transfer", "condicoes"] as const;
export type CampoReserva = typeof CAMPOS_RESERVA[number];
export const ICONES_RESERVA = ["aviao", "hotel", "refeicao", "mala", "transfer", "calendario"] as const;
export type IconeReserva = typeof ICONES_RESERVA[number];
export interface CaixaReserva { x: number; y: number; w: number; h: number }
export interface ElementoReserva extends CaixaReserva {
  id: string;
  tipo: "texto" | "forma" | "foto" | "grafico" | "marca";
  nome: string;
  texto: string;
  campo: CampoReserva;
  hotel: number;
  cor: string;
  tamanho: number;
  fonte: "sans" | "serif" | "condensada";
  negrito: boolean;
  alinhar: "left" | "center" | "right";
  opacidade: number;
  raio: number;
  figura: "retangulo" | "elipse";
  recorte?: CaixaReserva;
  imagem?: string;
  credito?: string;
  origem?: string;
  icone?: IconeReserva;
  capitalizacao?: "normal" | "maiusculas";
}
export interface HotelReserva {
  nome: string; quarto: string; regime: string; total: number | null; precoPessoa: number | null;
}
export interface DadosReserva {
  destino: string; frase: string; partida: string; ida: string; regresso: string; voo: string;
  viajantes: number | null; bagagem: string; transfer: string; condicoes: string; hoteis: HotelReserva[];
}
export interface MaterialReserva {
  versao: 1; nome: string; formato: FormatoReserva; fundo: string; fundoFinal: string;
  referencia: string; maxHoteis: number; elementos: ElementoReserva[]; dados: DadosReserva;
}
export interface ResumoReserva { id: string; nome: string; tipo: "modelo" | "material"; formato: FormatoReserva; atualizadoEm: string }
export class ErroReserva extends Error { constructor(mensagem: string, public status = 400) { super(mensagem); } }
export const dimensoesReserva = (formato: FormatoReserva) => ({ largura: 1080, altura: formato === "story" ? 1920 : 1350 });
export const hotelVazio = (): HotelReserva => ({nome: "", quarto: "", regime: "", total: null, precoPessoa: null});
export const dadosReservaVazios = (): DadosReserva => ({destino: "", frase: "", partida: "", ida: "", regresso: "", voo: "", viajantes: null, bagagem: "", transfer: "", condicoes: "Preços sujeitos a disponibilidade e alterações.", hoteis: [hotelVazio()]});

export function elementoReserva(tipo: ElementoReserva["tipo"], nome: string, caixa: CaixaReserva): ElementoReserva {
  return {id: crypto.randomUUID(), tipo, nome, ...caixa, texto: "", campo: "livre", hotel: 0, cor: "#ffffff", tamanho: 4, fonte: "sans", negrito: false, alinhar: "center", opacidade: 1, raio: 0, figura: "retangulo", capitalizacao: "normal"};
}
export function marcaReserva(caixa: CaixaReserva = {x: 32, y: 3, w: 36, h: 6}): ElementoReserva {
  return {...elementoReserva("marca", "Marca iCliGo · protegida", caixa), id: "marca-icligo"};
}
export function novoMaterialReserva(formato: FormatoReserva = "story"): MaterialReserva {
  const texto = (nome: string, campo: CampoReserva, y: number, h: number, tamanho: number): ElementoReserva => ({...elementoReserva("texto", nome, {x: 7, y, w: 86, h}), campo, tamanho, negrito: campo === "destino" || campo === "preco"});
  return {versao: 1, nome: "Novo material", formato, fundo: "#1f2b51", fundoFinal: "#101024", referencia: "", maxHoteis: 1, dados: dadosReservaVazios(), elementos: [
    {...elementoReserva("foto", "Fotografia do destino", {x: 0, y: 12, w: 100, h: 49}), opacidade: .8},
    texto("Destino", "destino", 14, 10, 8), texto("Frase de destaque", "frase", 25, 7, 2.5),
    texto("Preço por pessoa", "preco", 63, 9, 8), {...texto("Por pessoa", "livre", 72, 2, 1.5), texto: "POR PESSOA"}, texto("Datas", "datas", 75, 4, 3),
    texto("Hotel", "hotel", 81, 4, 3), texto("Regime", "regime", 86, 3, 2.3),
    texto("Condições", "condicoes", 94, 3, 1.4), marcaReserva(),
  ]};
}

const objeto = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ErroReserva("Dados inválidos.");
  return v as Record<string, unknown>;
};
const texto = (v: unknown, max = 1000): string => {
  if (v == null) return "";
  if (typeof v !== "string" || v.length > max) throw new ErroReserva(`Texto inválido ou demasiado longo (máximo ${max} caracteres).`);
  return v.trim();
};
const numero = (v: unknown, min: number, max: number, padrao: number): number => {
  if (v == null) return padrao;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new ErroReserva("Dimensão ou quantidade inválida.");
  return v;
};
const montante = (v: unknown): number | null => v == null ? null : numero(v, 0, 10_000_000, 0);
export function imagemReserva(v: unknown, max = 1_200_000): string {
  if (!v) return "";
  if (typeof v !== "string" || v.length > max || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)) throw new ErroReserva("Usa uma imagem PNG, JPG ou WebP dentro do limite permitido.");
  return v;
}
const cor = (v: unknown, padrao: string): string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : padrao;
const data = (v: unknown): string => {
  const d = texto(v, 10);
  if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) throw new ErroReserva("Data inválida.");
  return d;
};
export function validarDadosReserva(v: unknown): DadosReserva {
  const d = objeto(v);
  if (!Array.isArray(d.hoteis) || d.hoteis.length < 1 || d.hoteis.length > 6) throw new ErroReserva("Indica entre um e seis hotéis.");
  const ida = data(d.ida), regresso = data(d.regresso);
  if (ida && regresso && regresso < ida) throw new ErroReserva("O regresso deve ser igual ou posterior à ida.");
  const viajantes = d.viajantes == null ? null : numero(d.viajantes, 1, 100, 1);
  if (viajantes !== null && !Number.isInteger(viajantes)) throw new ErroReserva("O número de viajantes deve ser inteiro.");
  return {destino: texto(d.destino, 160), frase: texto(d.frase, 500), partida: texto(d.partida, 160), ida, regresso, voo: texto(d.voo, 500), viajantes, bagagem: texto(d.bagagem, 300), transfer: texto(d.transfer, 300), condicoes: texto(d.condicoes, 1200), hoteis: d.hoteis.map(v => {
    const h = objeto(v);
    return {nome: texto(h.nome, 250), quarto: texto(h.quarto, 250), regime: texto(h.regime, 250), total: montante(h.total), precoPessoa: montante(h.precoPessoa)};
  })};
}
function caixa(v: Record<string, unknown>): CaixaReserva {
  const x = numero(v.x, 0, 99, 0), y = numero(v.y, 0, 99, 0);
  return {x, y, w: Math.min(numero(v.w, .5, 100, 20), 100 - x), h: Math.min(numero(v.h, .5, 100, 6), 100 - y)};
}
export function validarMaterialReserva(valor: unknown): MaterialReserva {
  const v = objeto(valor);
  if (!Array.isArray(v.elementos) || v.elementos.length > 80 || !v.elementos.length) throw new ErroReserva("O desenho deve conter entre um e 80 elementos.");
  if (v.formato !== "story" && v.formato !== "feed") throw new ErroReserva("Escolhe story ou feed.");
  const maxHoteis = numero(v.maxHoteis, 1, 6, 1);
  if (!Number.isInteger(maxHoteis)) throw new ErroReserva("Capacidade de hotéis inválida.");
  let marca: CaixaReserva | undefined;
  const elementos: ElementoReserva[] = [];
  const ids = new Set<string>();
  for (const valor of v.elementos) {
    const e = objeto(valor);
    if (!["texto", "forma", "foto", "grafico", "marca"].includes(String(e.tipo))) throw new ErroReserva("Elemento do desenho inválido.");
    if (e.tipo === "marca") { marca ??= caixa(e); continue; }
    const id = texto(e.id, 80) || `elemento-${elementos.length}`;
    if (ids.has(id) || id === "marca-icligo") throw new ErroReserva("Identificador de elemento repetido.");
    ids.add(id);
    const campo = CAMPOS_RESERVA.includes(e.campo as CampoReserva) ? e.campo as CampoReserva : "livre";
    const hotel = numero(e.hotel, 0, maxHoteis - 1, 0);
    if (!Number.isInteger(hotel)) throw new ErroReserva("Opção de hotel inválida.");
    elementos.push({id, tipo: e.tipo as ElementoReserva["tipo"], nome: texto(e.nome, 100) || "Elemento", ...caixa(e), texto: texto(e.texto, 2000), campo, hotel,
      cor: cor(e.cor, "#ffffff"), tamanho: numero(e.tamanho, .5, 25, 4), fonte: e.fonte === "serif" || e.fonte === "condensada" ? e.fonte : "sans",
      negrito: e.negrito === true, alinhar: e.alinhar === "left" || e.alinhar === "right" ? e.alinhar : "center",
      opacidade: numero(e.opacidade, 0, 1, 1), raio: numero(e.raio, 0, 50, 0), figura: e.figura === "elipse" ? "elipse" : "retangulo",
      ...(e.recorte ? {recorte: caixa(objeto(e.recorte))} : {}), ...(e.imagem ? {imagem: imagemReserva(e.imagem)} : {}),
      ...(ICONES_RESERVA.includes(e.icone as IconeReserva) ? {icone: e.icone as IconeReserva} : {}),
      capitalizacao: e.capitalizacao === "maiusculas" ? "maiusculas" : "normal",
      ...(e.credito ? {credito: texto(e.credito, 500)} : {}), ...(e.origem && typeof e.origem === "string" && /^https:\/\/commons\.wikimedia\.org\/wiki\//.test(e.origem) ? {origem: texto(e.origem, 1500)} : {}),
    });
  }
  // Reconstrói sempre a marca: não aceita texto, cores ou imagens enviados para esse elemento.
  elementos.push(marcaReserva(marca));
  const dados = validarDadosReserva(v.dados);
  if (dados.hoteis.length > maxHoteis) throw new ErroReserva(`Este modelo tem espaço para ${maxHoteis} ${maxHoteis === 1 ? "hotel" : "hotéis"}.`);
  const material: MaterialReserva = {versao: 1, nome: texto(v.nome, 120) || "Sem nome", formato: v.formato, fundo: cor(v.fundo, "#ffffff"), fundoFinal: cor(v.fundoFinal, cor(v.fundo, "#ffffff")), referencia: imagemReserva(v.referencia), maxHoteis, elementos, dados};
  if (JSON.stringify(material).length > 3_700_000) throw new ErroReserva("Este material tem demasiadas imagens. Reduz o tamanho das fotografias.", 413);
  return material;
}

export function precoPessoaReserva(dados: DadosReserva, hotel: HotelReserva): number | null {
  if (hotel.precoPessoa !== null) return hotel.precoPessoa;
  if (hotel.total === null || !dados.viajantes || dados.viajantes <= 0) return null;
  return Math.round((hotel.total / dados.viajantes + Number.EPSILON) * 100) / 100;
}
export function textoElementoReserva(e: ElementoReserva, dados: DadosReserva, exemplo = false): string {
  const h = dados.hoteis[e.hotel];
  const preco = h ? precoPessoaReserva(dados, h) : null;
  const formatarData = (d: string) => d.split("-").reverse().join("/");
  const datas = [dados.ida, dados.regresso].filter(Boolean).map(formatarData).join(" — ");
  const euros = (n: number) => `${new Intl.NumberFormat("pt-PT", {maximumFractionDigits: 2}).format(n)} €`;
  const noites = dados.ida && dados.regresso ? Math.round((Date.parse(dados.regresso) - Date.parse(dados.ida)) / 86_400_000) : null;
  const valores: Record<CampoReserva, string> = {livre: e.texto, destino: dados.destino, frase: dados.frase, partida: dados.partida, datas, ida: formatarData(dados.ida), regresso: formatarData(dados.regresso), noites: noites === null ? "" : `${noites} noites`, viajantes: dados.viajantes === null ? "" : `${dados.viajantes} viajantes`, voo: dados.voo, preco: preco === null ? "" : euros(preco), total: h?.total == null ? "" : euros(h.total), hotel: h?.nome ?? "", quarto: h?.quarto ?? "", regime: h?.regime ?? "", bagagem: dados.bagagem, transfer: dados.transfer, condicoes: dados.condicoes};
  const resultado = valores[e.campo] || (exemplo && e.campo !== "livre" ? `{${e.campo}${["hotel", "regime", "preco"].includes(e.campo) && e.hotel ? ` ${e.hotel + 1}` : ""}}` : "");
  return e.capitalizacao === "maiusculas" ? resultado.toLocaleUpperCase("pt-PT") : resultado;
}
export function aPartirDoModeloReserva(modelo: MaterialReserva): MaterialReserva {
  return {...structuredClone(modelo), nome: "Novo material", dados: {...dadosReservaVazios(), hoteis: Array.from({length: modelo.maxHoteis}, hotelVazio)}};
}
export function espacoFotoReserva(material: MaterialReserva): CaixaReserva {
  const ocupados = material.elementos.filter(e => e.tipo !== "forma").map(e => [e.y, e.y + e.h]).sort((a,b)=>a[0]! - b[0]!);
  let fim = 8, melhor: CaixaReserva = {x:6,y:30,w:88,h:30}; let maior = 0;
  for (const [y,h] of [...ocupados,[96,100]]) {
    const intervalo = y! - fim;
    if (intervalo > maior) {maior=intervalo;melhor={x:6,y:fim+1,w:88,h:Math.max(.5,intervalo-2)};}
    fim=Math.max(fim,h!);
  }
  return melhor;
}
