import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { db } from "./db";
import { buscarMembroEquipa } from "./equipa";
import { ErroReserva } from "./reservas";
import { chamarIAReservas } from "./reservas-servidor";
import { desenharPlanner, type FotoDesenho } from "./travel-planner-desenho";
import {
  diasDaViagem, ErroPlanner, FOTO_WIKIMEDIA, MARCA_PADRAO, validarMarca, MAX_DIAS_PLANNER, pendentesPlanner, RITMOS_PLANNER, TEMAS_DICA, validarDia, validarDica, validarExtras, validarPlanner, validarVoo,
  type DiaPlanner, type DicaPlanner, type ExtrasPlanner, type FotoPlanner, type MarcaPlanner, type ResumoPlanner, type TravelPlanner, type VooPlanner,
} from "./travel-planner";

// O email fica entre ":" na chave, como em Reservas — a mudança de email no admin leva estes registos.
const prefixo = (email: string) => `travel-planner:v1:${email}:item:`;

function idPlanner(valor: unknown): string {
  if (typeof valor !== "string" || !/^[0-9a-f-]{36}$/i.test(valor)) throw new ErroPlanner("Travel planner inválido.");
  return valor;
}

export async function listarPlanners(email: string): Promise<ResumoPlanner[]> {
  const {rows} = await db().query<{id: string; nome: string; destino: string; ida: string; atualizado_em: Date}>(
    `select valor->>'id' as id, valor->>'nome' as nome, valor->'viagem'->>'destino' as destino, valor->'viagem'->>'ida' as ida, atualizado_em
     from dashboard_config where starts_with(chave, $1) order by atualizado_em desc`, [prefixo(email)],
  );
  return rows.map(r => ({id: r.id, nome: r.nome, destino: r.destino ?? "", ida: r.ida ?? "", atualizadoEm: r.atualizado_em.toISOString()}));
}

export async function abrirPlanner(email: string, id: unknown): Promise<TravelPlanner> {
  const {rows} = await db().query<{valor: TravelPlanner; atualizado_em: Date}>(
    "select valor, atualizado_em from dashboard_config where chave = $1", [prefixo(email) + idPlanner(id)]);
  if (!rows[0]) throw new ErroPlanner("Este travel planner não existe na tua conta.", 404);
  return {...validarPlanner(rows[0].valor), atualizadoEm: rows[0].atualizado_em.toISOString()};
}

export async function guardarPlanner(email: string, valor: unknown): Promise<TravelPlanner> {
  const planner = validarPlanner(valor);
  if (!planner.nome) planner.nome = planner.viagem.destino ? `Viagem a ${planner.viagem.destino}` : "Travel planner";
  const {rows} = await db().query<{atualizado_em: Date}>(
    `insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now() returning atualizado_em`,
    [prefixo(email) + planner.id, JSON.stringify(planner)]);
  return {...planner, atualizadoEm: rows[0]!.atualizado_em.toISOString()};
}

export async function apagarPlanner(email: string, id: unknown): Promise<void> {
  await db().query("delete from dashboard_config where chave = $1", [prefixo(email) + idPlanner(id)]);
}

export const novoIdPlanner = () => randomUUID();

// As cores do consultor valem para todos os seus planners.
const chaveMarca = (email: string) => `travel-planner:v1:${email}:marca`;
export async function obterMarca(email: string): Promise<MarcaPlanner> {
  const {rows} = await db().query<{valor: unknown}>("select valor from dashboard_config where chave = $1", [chaveMarca(email)]);
  return rows[0] ? validarMarca(rows[0].valor) : MARCA_PADRAO;
}
export async function guardarMarca(email: string, valor: unknown): Promise<MarcaPlanner> {
  const marca = validarMarca(valor);
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [chaveMarca(email), JSON.stringify(marca)]);
  return marca;
}

// ---------- fotografias ----------

const AGENTE = "iCliGoTravelPlanner/1.0 (+https://webinar.viajareviver.net)";
const limparHTML = (s: unknown) => typeof s === "string" ? s.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) : "";
export interface FotoSugerida extends FotoPlanner { titulo: string }

/**
 * Fotografias do Wikimedia Commons com licença livre (domínio público, CC0,
 * CC BY e CC BY-SA). O crédito do autor e a licença vão impressos junto à
 * fotografia, como estas licenças pedem. Prefere imagens grandes e recentes,
 * a cores, de paisagem.
 */
export async function procurarFotos(termo: unknown, quantas = 8): Promise<FotoSugerida[]> {
  if (typeof termo !== "string" || !termo.trim() || termo.length > 160) throw new ErroPlanner("Indica o que procurar.");
  const limpo = termo.replace(/["\\]/g, " ").trim();
  const pesquisas = [`${limpo} incategory:Quality_images`, `${limpo} filetype:bitmap`];
  type Pagina = {title: string; index?: number; imageinfo?: {thumburl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, {value?: string}>}[]};
  const resultados = await Promise.allSettled(pesquisas.map(async pesquisa => {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({action: "query", format: "json", generator: "search", gsrsearch: pesquisa, gsrnamespace: "6", gsrlimit: "30",
      prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "2400", iiextmetadatafilter: "LicenseShortName|Artist|DateTimeOriginal"}).toString();
    const r = await fetch(url, {headers: {"User-Agent": AGENTE}, signal: AbortSignal.timeout(15_000)});
    if (!r.ok) return [];
    const corpo = await r.json() as {query?: {pages?: Record<string, Pagina>}};
    return Object.values(corpo.query?.pages ?? {}).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
  }));
  const excluir = /map|mapa|flag|coat.of.arms|logo|locator|diagram|plan\b|satellite|ISS |landsat|sentinel|nasa|astronaut|from space|stamp|seal|portrait|document|scan|drawing|engraving|painting|sign\b|\d{3,4}s?\b.*(19[0-5]\d)/i;
  const fotos = resultados.flatMap(r => r.status === "fulfilled" ? r.value : []).flatMap(p => {
    const i = p.imageinfo?.[0], licenca = limparHTML(i?.extmetadata?.LicenseShortName?.value);
    if (!i?.thumburl || !FOTO_WIKIMEDIA.test(i.thumburl) || i.mime !== "image/jpeg") return [];
    if (!/^(CC0|Public domain|PD|CC BY(-SA)? [234]\.0|CC BY(-SA)? 2\.5)/i.test(licenca)) return [];
    if ((i.width ?? 0) < 1400 || (i.width ?? 0) < (i.height ?? 0)) return [];
    const ano = Number(limparHTML(i.extmetadata?.DateTimeOriginal?.value).match(/(19|20)\d{2}/)?.[0] ?? 0);
    if (ano && ano < 1990) return [];
    const titulo = p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "");
    if (excluir.test(titulo)) return [];
    const autor = limparHTML(i.extmetadata?.Artist?.value).slice(0, 60) || "Wikimedia Commons";
    return [{titulo, url: i.thumburl, credito: `${autor} · ${licenca} · Wikimedia Commons`}];
  });
  return [...new Map(fotos.map(f => [f.url, f])).values()].sort((a, b) => pontuacaoFoto(b.titulo) - pontuacaoFoto(a.titulo)).slice(0, quantas);
}

/** Paisagens e vistas primeiro; pormenores (plantas, estradas, azulejos, interiores) para o fim. */
function pontuacaoFoto(titulo: string): number {
  return (/vista|view|panorama|miradouro|mirador|viewpoint|beach|praia|playa|skyline|coast|costa|bay|ba[ií]a|sunset|p[oô]r do sol|landscape|paisagem/i.test(titulo) ? 2 : 0)
    - (/echium|capsicum|flower|flor\b|plant|insect|road|estrada|interior|detail|pormenor|azulejo|tile|door|porta|window|janela/i.test(titulo) ? 2 : 0);
}

// As fotografias descarregadas ficam em memória: a pré-visualização é pedida várias vezes seguidas.
const fotosEmCache = new Map<string, Promise<Buffer | null>>();
export async function imagemDe(foto: FotoPlanner | null): Promise<FotoDesenho | null> {
  if (!foto) return null;
  if (!fotosEmCache.has(foto.url)) {
    if (fotosEmCache.size > 60) fotosEmCache.clear();
    fotosEmCache.set(foto.url, bytesDaFoto(foto.url));
  }
  const jpeg = await fotosEmCache.get(foto.url)!;
  if (!jpeg) { fotosEmCache.delete(foto.url); return null; }
  return {img: await loadImage(jpeg), foco: foto.foco ?? {x: 0.5, y: 0.5}, inteira: foto.inteira === true};
}
async function bytesDaFoto(url: string): Promise<Buffer | null> {
  const foto = {url};
  try {
    let bytes: Buffer;
    if (foto.url.startsWith("data:image/jpeg;base64,")) bytes = Buffer.from(foto.url.split(",", 2)[1]!, "base64");
    else {
      const u = new URL(foto.url);
      if (u.protocol !== "https:" || !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(u.hostname) || u.username || u.password || u.port) return null;
      const r = await fetch(u, {headers: {"User-Agent": AGENTE}, redirect: "error", signal: AbortSignal.timeout(20_000)});
      if (!r.ok || !/^image\/(jpeg|png|webp)/.test(r.headers.get("Content-Type") ?? "")) return null;
      bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length > 10_000_000) return null;
    }
    return await sharp(bytes, {limitInputPixels: 60_000_000}).rotate().resize({width: 2600, height: 2600, fit: "inside", withoutEnlargement: true}).jpeg({quality: 88}).toBuffer();
  } catch { return null; }
}

// ---------- IA ----------

const numeroOuNulo = {type: ["number", "null"]};
const esquemaRoteiro = {
  type: "object", additionalProperties: false, required: ["dias", "dicas", "emergencia", "voos", "extras"],
  properties: {
    dias: {type: "array", items: {type: "object", additionalProperties: false, required: ["titulo", "manha", "tarde", "noite", "local", "lat", "lng", "pesquisa"],
      properties: {titulo: {type: "string"}, manha: {type: "string"}, tarde: {type: "string"}, noite: {type: "string"}, local: {type: "string"}, lat: numeroOuNulo, lng: numeroOuNulo, pesquisa: {type: "string"}}}},
    dicas: {type: "array", items: {type: "object", additionalProperties: false, required: ["tema", "titulo", "texto"],
      properties: {tema: {type: "string", enum: Object.keys(TEMAS_DICA)}, titulo: {type: "string"}, texto: {type: "string"}}}},
    emergencia: {type: "string"},
    voos: {type: "array", items: {type: "object", additionalProperties: false,
      required: ["sentido", "data", "numero", "companhia", "origem", "origemCidade", "origemLat", "origemLng", "destino", "destinoCidade", "destinoLat", "destinoLng", "partida", "chegada"],
      properties: {sentido: {type: "string", enum: ["ida", "volta"]}, data: {type: "string"}, numero: {type: "string"}, companhia: {type: "string"},
        origem: {type: "string"}, origemCidade: {type: "string"}, origemLat: numeroOuNulo, origemLng: numeroOuNulo,
        destino: {type: "string"}, destinoCidade: {type: "string"}, destinoLat: numeroOuNulo, destinoLng: numeroOuNulo, partida: {type: "string"}, chegada: {type: "string"}}}},
    extras: {type: "object", additionalProperties: false, required: ["destinoLat", "destinoLng", "clima", "fuso", "moeda", "lingua", "tomada"],
      properties: {destinoLat: numeroOuNulo, destinoLng: numeroOuNulo, fuso: numeroOuNulo, moeda: {type: "string"}, lingua: {type: "string"}, tomada: {type: "string"},
        clima: {type: "array", items: {type: "object", additionalProperties: false, required: ["max", "min"], properties: {max: {type: "number"}, min: {type: "number"}}}}}},
  },
};

export interface RoteiroGerado { dias: DiaPlanner[]; dicas: DicaPlanner[]; emergencia: string; voos: VooPlanner[]; extras: ExtrasPlanner; foto: FotoPlanner | null }

/** A IA propõe o roteiro, as dicas e os dados para mapas e gráficos; o consultor edita tudo depois. */
export async function gerarRoteiroPlanner(email: string, valor: unknown): Promise<RoteiroGerado> {
  const p = validarPlanner(valor);
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino antes de gerar o roteiro.");
  const total = diasDaViagem(p.viagem.ida, p.viagem.regresso);
  if (!total) throw new ErroPlanner("Indica as datas de ida e regresso para gerar o roteiro.");
  if (total > MAX_DIAS_PLANNER) throw new ErroPlanner(`O roteiro automático vai até ${MAX_DIAS_PLANNER} dias. Encurta as datas ou escreve os restantes dias à mão.`);
  const ritmo = RITMOS_PLANNER.find(r => r.id === p.perfil.ritmo)?.nome ?? "Equilibrado";
  const contexto = [
    `Destino: ${p.viagem.destino}`, `Partida de: ${p.viagem.partida || "não indicado"}`,
    `Datas: ${p.viagem.ida} a ${p.viagem.regresso} (${total} dias, o dia 1 é o da chegada e o dia ${total} é o do regresso)`,
    `Voos (texto da proposta): ${p.viagem.voo || "não indicado"}`, `Hotel: ${[p.viagem.hotel, p.viagem.regime].filter(Boolean).join(", ") || "não indicado"}`,
    `Transfer: ${p.viagem.transfer || "não indicado"}`, `Viajantes: ${p.viagem.viajantes ?? "não indicado"}`,
    `Tipo de viagem: ${p.perfil.tipo || "não indicado"}`, `Interesses: ${p.perfil.interesses.join(", ") || "não indicados"}`,
    `Ritmo: ${ritmo}`, `Notas do consultor: ${p.perfil.notas || "nenhuma"}`,
  ].join("\n");
  const r = await chamarIAReservas(email, `És um consultor de viagens português a preparar o travel planner que o cliente recebe depois de reservar. Escreve em português de Portugal, tom caloroso e prático, tratando o cliente por "vocês".
Devolve JSON com dias, dicas, emergencia, voos e extras.
- dias: exatamente ${total} entradas, uma por dia, por ordem. titulo curto e apelativo (ex.: "Chegada e primeiro mergulho"). manha/tarde/noite com 1 a 2 frases cada. Tem em conta os horários dos voos e o transfer no primeiro e no último dia; usa o regime do hotel. Ajusta ao tipo de viagem, interesses e ritmo; num ritmo calmo deixa tempo livre.
  local: o lugar principal do dia (ex.: "Cabo Girão"); lat/lng: as suas coordenadas decimais; pesquisa: termo curto em inglês para encontrar uma fotografia bonita desse lugar no Wikimedia Commons (ex.: "Cabo Girão Madeira").
- Sugere atrações e zonas conhecidas e estáveis. Não inventes preços, horários de atrações, nomes de guias, nem serviços incluídos na reserva. Para restaurantes, sugere o tipo de cozinha e a zona, ou só lugares muito conhecidos.
- dicas: uma por tema, para documentos, saude, moeda, clima, tomadas, fuso, mala, gorjetas e transportes. 2 a 3 frases cada. Para documentos e saude diz o que costuma ser exigido a cidadãos portugueses, sem certezas absolutas — o consultor vai confirmar.
- emergencia: números de emergência do destino e a representação diplomática portuguesa mais próxima, em 2 a 4 linhas.
- voos: um elemento por troço de voo que esteja no texto da proposta (ida e volta, incluindo escalas), com os códigos IATA dos aeroportos, cidade, coordenadas do aeroporto, número do voo, companhia, data YYYY-MM-DD e horas HH:MM. Se faltar um dado no texto, deixa vazio (não inventes números de voo nem horas). Se não houver texto de voos, devolve os troços prováveis entre a partida e o destino só com aeroportos e cidades.
- extras: coordenadas do destino, temperaturas médias máxima e mínima de cada mês de janeiro a dezembro (12 entradas, °C), diferença horária em horas em relação a Lisboa na data da viagem, moeda (nome e código), língua, tipo de tomada e voltagem.`,
    [{type: "input_text", text: contexto}], 14000, esquemaRoteiro);
  if (!Array.isArray(r.dias) || !r.dias.length) throw new ErroPlanner("A IA não devolveu um roteiro utilizável. Tenta novamente.", 502);
  const dias = r.dias.slice(0, total).map(validarDia);
  while (dias.length < total) dias.push(validarDia({}));
  const dicas = Array.isArray(r.dicas) ? r.dicas.slice(0, 12).map(d => validarDica({...(d as object), confirmado: false})) : [];
  const voos = Array.isArray(r.voos) ? r.voos.slice(0, 6).map(validarVoo) : [];
  const extras = validarExtras(r.extras);

  // Uma fotografia por dia e uma para a capa, já escolhidas; o consultor pode trocar.
  const usadas = new Set<string>();
  const destinoCurto = p.viagem.destino.split(",")[0]!.trim();
  const doDestino = await procurarFotos(destinoCurto, 12).catch(() => []);
  // Sem uma boa fotografia do local, usa uma vista do destino ainda não usada.
  const escolher = async (termo: string) => {
    const fotos = termo === destinoCurto ? doDestino : await procurarFotos(termo, 8).catch(() => []);
    const f = fotos.find(x => !usadas.has(x.url) && pontuacaoFoto(x.titulo) >= 0) ?? doDestino.find(x => !usadas.has(x.url) && pontuacaoFoto(x.titulo) >= 0);
    if (f) usadas.add(f.url);
    return f ? {url: f.url, credito: f.credito} : null;
  };
  const foto = p.foto ?? await escolher(destinoCurto);
  for (const dia of dias) dia.foto ??= await escolher(dia.pesquisa || dia.local || destinoCurto);
  return {dias, dicas, emergencia: typeof r.emergencia === "string" ? r.emergencia.trim().slice(0, 1000) : "", voos, extras, foto};
}

// ---------- PDF ----------

/** Cada página é desenhada como imagem A4 e o PDF junta-as. */
async function paginasPlanner(email: string, p: TravelPlanner, escala: number): Promise<Buffer[]> {
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino da viagem.");
  const [membro, marca] = await Promise.all([buscarMembroEquipa(email), obterMarca(email)]);
  const [capa, hotel, ...dias] = await Promise.all([imagemDe(p.foto), imagemDe(p.fotoHotel), ...p.dias.map(d => imagemDe(d.foto))]);
  return desenharPlanner({p, marca, escala, consultor: membro ? {nome: membro.nome, email} : null, imagens: {capa, hotel, dias}});
}

/** As páginas tal como vão sair, em tamanho de ecrã, a partir do que está no editor (mesmo por guardar). */
export async function previsualizarPlanner(email: string, valor: unknown): Promise<string[]> {
  const paginas = await paginasPlanner(email, validarPlanner(valor), 0.75);
  return paginas.map(b => `data:image/jpeg;base64,${b.toString("base64")}`);
}

export async function pdfPlanner(email: string, id: unknown): Promise<{bytes: Uint8Array; nome: string}> {
  const p = await abrirPlanner(email, id);
  const pendentes = pendentesPlanner(p);
  if (pendentes.length) throw new ErroPlanner(`Antes de descarregar, confirma: ${pendentes.join(", ")}.`, 409);
  const paginas = await paginasPlanner(email, p, 2);
  return {bytes: await montarPDF(paginas, `${p.viagem.destino} · Travel planner`), nome: nomeFicheiro(p.viagem.destino, "travel-planner")};
}

/** Junta as páginas (JPEG A4) num PDF. */
export async function montarPDF(paginas: Buffer[], titulo: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo); pdf.setAuthor("iCliGo travel partners"); pdf.setLanguage("pt-PT");
  for (const jpeg of paginas) {
    const imagem = await pdf.embedJpg(jpeg);
    pdf.addPage([595.28, 841.89]).drawImage(imagem, {x: 0, y: 0, width: 595.28, height: 841.89});
  }
  return pdf.save();
}

export function nomeFicheiro(destino: string, sufixo: string): string {
  return `${destino.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "viagem"}-${sufixo}.pdf`;
}

/** Procura um local no OpenStreetMap (Nominatim), para corrigir um ponto do mapa. */
export async function localizarPonto(termo: unknown): Promise<{nome: string; lat: number; lng: number}[]> {
  if (typeof termo !== "string" || !termo.trim() || termo.length > 160) throw new ErroPlanner("Escreve o nome do local a procurar.");
  const procurar = async (q: string) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({q, format: "jsonv2", limit: "6", "accept-language": "pt-PT"}).toString();
    const r = await fetch(url, {headers: {"User-Agent": AGENTE}, signal: AbortSignal.timeout(12_000)}).catch(() => null);
    if (!r?.ok) throw new ErroPlanner("Não foi possível procurar o local. Tenta novamente daqui a pouco.", 502);
    const lista = await r.json() as {display_name?: string; lat?: string; lon?: string}[];
    return lista.flatMap(l => {
      const lat = Number(l.lat), lng = Number(l.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && l.display_name ? [{nome: l.display_name.slice(0, 160), lat, lng}] : [];
    });
  };
  // A partir do servidor do site, o Nominatim perde as letras acentuadas ("Évora" chega como "vora").
  // Sem acentos encontra o mesmo local, por isso a pesquisa vai sempre sem eles.
  return procurar(termo.trim().normalize("NFD").replace(/\p{Diacritic}/gu, ""));
}

export function erroPlannerParaResposta(erro: unknown): {mensagem: string; status: number} | null {
  if (erro instanceof ErroPlanner || erro instanceof ErroReserva) return {mensagem: erro.message, status: erro.status};
  return null;
}
