import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sharp from "sharp";
import { db } from "./db";
import { buscarMembroEquipa } from "./equipa";
import { chamarIAReservas } from "./reservas-servidor";
import { desenharProposta } from "./proposta-desenho";
import {
  MAX_OPCOES_PROPOSTA, pendentesProposta, plannerDaProposta, propostaVazia, telemovelWhatsApp, validarLeitura, validarProposta,
  type DestaqueProposta, type LeituraPDF, type Proposta, type ResumoProposta,
} from "./proposta";
import { ErroPlanner, MAX_FOTO_CARREGADA, TEMAS_DICA, validarDica, validarExtras, validarVoo, type FotoPlanner } from "./travel-planner";
import { guardarPlanner, imagemDe, localizarPonto, montarPDF, nomeFicheiro, obterMarca, procurarFotos } from "./travel-planner-servidor";

// O email fica entre ":" na chave — a mudança de email no admin leva estes registos.
const prefixo = (email: string) => `proposta:v1:${email}:item:`;
const chavePerfil = (email: string) => `travel-planner:v1:${email}:perfil`;
const AGENTE = "iCliGoTravelPlanner/1.0 (+https://webinar.viajareviver.net)";

function idProposta(valor: unknown): string {
  if (typeof valor !== "string" || !/^[0-9a-f-]{36}$/i.test(valor)) throw new ErroPlanner("Proposta inválida.");
  return valor;
}
function validar(valor: unknown): Proposta {
  try { return validarProposta(valor); } catch { throw new ErroPlanner("Proposta inválida."); }
}

export async function listarPropostas(email: string): Promise<ResumoProposta[]> {
  const {rows} = await db().query<{id: string; nome: string; destino: string; ida: string; opcoes: number; atualizado_em: Date}>(
    `select valor->>'id' as id, valor->>'nome' as nome, valor->'viagem'->>'destino' as destino, valor->'viagem'->>'ida' as ida,
       jsonb_array_length(coalesce(valor->'opcoes', '[]'::jsonb)) as opcoes, atualizado_em
     from dashboard_config where starts_with(chave, $1) order by atualizado_em desc`, [prefixo(email)]);
  return rows.map(r => ({id: r.id, nome: r.nome, destino: r.destino ?? "", ida: r.ida ?? "", opcoes: Number(r.opcoes), atualizadoEm: r.atualizado_em.toISOString()}));
}
export const novaProposta = () => propostaVazia(randomUUID());
export async function abrirProposta(email: string, id: unknown): Promise<Proposta> {
  const {rows} = await db().query<{valor: unknown; atualizado_em: Date}>("select valor, atualizado_em from dashboard_config where chave = $1", [prefixo(email) + idProposta(id)]);
  if (!rows[0]) throw new ErroPlanner("Esta proposta não existe na tua conta.", 404);
  return {...validar(rows[0].valor), atualizadoEm: rows[0].atualizado_em.toISOString()};
}
export async function guardarProposta(email: string, valor: unknown): Promise<Proposta> {
  const p = validar(valor);
  if (!p.nome) p.nome = p.viagem.destino ? `Proposta ${p.viagem.destino}` : "Proposta";
  const {rows} = await db().query<{atualizado_em: Date}>(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now() returning atualizado_em`, [prefixo(email) + p.id, JSON.stringify(p)]);
  return {...p, atualizadoEm: rows[0]!.atualizado_em.toISOString()};
}
export async function apagarProposta(email: string, id: unknown): Promise<void> {
  await db().query("delete from dashboard_config where chave = $1", [prefixo(email) + idProposta(id)]);
}

/** O telemóvel do consultor para o QR do WhatsApp — guardado uma vez, usado em todas as propostas. */
export async function obterPerfil(email: string): Promise<{telemovel: string}> {
  const {rows} = await db().query<{valor: {telemovel?: string}}>("select valor from dashboard_config where chave = $1", [chavePerfil(email)]);
  return {telemovel: telemovelWhatsApp(rows[0]?.valor.telemovel)};
}
export async function guardarPerfil(email: string, valor: unknown): Promise<{telemovel: string}> {
  const telemovel = telemovelWhatsApp((valor as {telemovel?: unknown} | null)?.telemovel);
  if (!telemovel && (valor as {telemovel?: unknown} | null)?.telemovel) throw new ErroPlanner("Indica um telemóvel válido, por exemplo 912 345 678.");
  await db().query(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [chavePerfil(email), JSON.stringify({telemovel})]);
  return {telemovel};
}

// ---------- leitura dos PDFs ----------

const esquemaLeitura = {
  type: "object", additionalProperties: false, required: ["viagem", "hoteis", "incluido", "naoIncluido", "condicoes", "validade"],
  properties: {
    viagem: {type: "object", additionalProperties: false, required: ["destino", "partida", "ida", "regresso", "viajantes", "voo", "bagagem", "transfer", "transferIncluido"],
      properties: {destino: {type: "string"}, partida: {type: "string"}, ida: {type: "string"}, regresso: {type: "string"}, viajantes: {type: ["integer", "null"]},
        voo: {type: "string"}, bagagem: {type: "string"}, transfer: {type: "string"}, transferIncluido: {type: ["boolean", "null"]}}},
    hoteis: {type: "array", items: {type: "object", additionalProperties: false, required: ["nome", "quarto", "regime", "total", "precoPessoa"],
      properties: {nome: {type: "string"}, quarto: {type: "string"}, regime: {type: "string"}, total: {type: ["number", "null"]}, precoPessoa: {type: ["number", "null"]}}}},
    incluido: {type: "array", items: {type: "string"}}, naoIncluido: {type: "array", items: {type: "string"}},
    condicoes: {type: "string"}, validade: {type: "string"},
  },
};

/** Lê um PDF de proposta iCliGo (MyOffice). Um pedido por PDF, para caber no limite de envio. */
export async function lerPDFProposta(email: string, ficheiro: File): Promise<LeituraPDF> {
  if (!ficheiro.size || ficheiro.size > 4_000_000 || !ficheiro.name.toLowerCase().endsWith(".pdf")) throw new ErroPlanner("Escolhe um PDF com menos de 4 MB.");
  const bytes = Buffer.from(await ficheiro.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new ErroPlanner("O ficheiro não é um PDF válido.");
  const r = await chamarIAReservas(email, `Extrai exclusivamente dados comprovados neste PDF de uma proposta de viagem da iCliGo (MyOffice), incluindo os que estão em imagens. Não inventes nem adivinhes.
Não devolvas dados pessoais de clientes, referências de reserva, dados de pagamento nem comissões.
- viagem: destino (cidade/região e país), partida (cidade), ida e regresso (YYYY-MM-DD), viajantes (número de pessoas), voo (companhia, números e horários, ida e volta), bagagem, transfer (descrição curta), transferIncluido (true se o preço inclui transfers, false se o PDF diz que não inclui ou não há transfer, null se o PDF não diz nada).
- hoteis: cada alojamento proposto com nome, tipo de quarto, regime, preço total e preço por pessoa (números em euros, sem símbolo).
- incluido: lista curta do que o preço inclui (ex.: "Voos Lisboa–Funchal", "Taxas de aeroporto", "Transfer", "Seguro de viagem"), SEM o alojamento, o número de noites no hotel nem o regime (esses aparecem em cada opção de alojamento). naoIncluido: o que o PDF diz não estar incluído.
- condicoes: condições importantes (cancelamento, pagamento) num parágrafo curto. validade: data limite da proposta em YYYY-MM-DD, se existir.`,
    [{type: "input_file", filename: "proposta.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}`},
      {type: "input_text", text: "Analisa todas as páginas, incluindo os dados em imagens."}], 5000, esquemaLeitura);
  const leitura = validarLeitura(r, ficheiro.name);
  if (!leitura.hoteis.length && !leitura.viagem.destino) throw new ErroPlanner(`Não encontrámos dados de viagem em ${ficheiro.name}.`, 422);
  return leitura;
}

// ---------- fotografias dos hotéis ----------

/** Só endereços https públicos, sem IPs nem portas — o servidor vai buscar páginas indicadas pela IA. */
function urlSegura(valor: string, base?: URL): URL | null {
  try {
    const u = new URL(valor, base);
    if (u.protocol !== "https:" || u.username || u.password || u.port || isIP(u.hostname) || !u.hostname.includes(".") || /(^|\.)(localhost|local|internal)$/i.test(u.hostname)) return null;
    return u;
  } catch { return null; }
}
/** Recusa nomes que apontem para a rede interna (127.x, 10.x, 192.168.x…). */
async function enderecoPublico(nome: string): Promise<boolean> {
  const enderecos = await lookup(nome, {all: true}).catch(() => []);
  return enderecos.length > 0 && enderecos.every(({address}) => !enderecoInterno(address));
}
function enderecoInterno(endereco: string): boolean {
  const v4 = endereco.replace(/^::ffff:/i, "");
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = endereco.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}
async function buscar(url: URL, limite: number, aceitar: RegExp): Promise<{bytes: Buffer; tipo: string; final: URL} | null> {
  let atual = url;
  for (let saltos = 0; saltos < 4; saltos++) {
    if (!await enderecoPublico(atual.hostname)) return null;
    const r = await fetch(atual, {headers: {"User-Agent": AGENTE, Accept: "text/html,image/*"}, redirect: "manual", signal: AbortSignal.timeout(10_000)}).catch(() => null);
    if (!r) return null;
    if (r.status >= 300 && r.status < 400) {
      const seguinte = urlSegura(r.headers.get("Location") ?? "", atual);
      if (!seguinte) return null;
      atual = seguinte; continue;
    }
    const tipo = r.headers.get("Content-Type") ?? "";
    if (!r.ok || !aceitar.test(tipo) || Number(r.headers.get("Content-Length") ?? 0) > limite) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    return bytes.length > limite ? null : {bytes, tipo, final: atual};
  }
  return null;
}

/** JPEG reduzido para caber no registo da proposta, como as fotografias carregadas pelo consultor. */
async function comoFotoGuardada(bytes: Buffer, credito: string): Promise<FotoPlanner | null> {
  try {
    for (const [lado, qualidade] of [[1800, 82], [1400, 76], [1100, 70]] as const) {
      const jpeg = await sharp(bytes, {limitInputPixels: 60_000_000}).rotate().resize({width: lado, height: lado, fit: "inside", withoutEnlargement: true}).jpeg({quality: qualidade}).toBuffer();
      const url = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
      if (url.length <= MAX_FOTO_CARREGADA) return {url, credito};
    }
  } catch { /* imagem inválida */ }
  return null;
}

/**
 * A imagem principal (og:image) do site oficial do hotel — a que o próprio
 * hotel divulga. Só é aceite se a página for mesmo do hotel (o nome aparece
 * no título) e a imagem tiver tamanho de fotografia.
 */
async function fotoDoSiteOficial(site: string, hotel: string): Promise<FotoPlanner | null> {
  const url = urlSegura(site.startsWith("http") ? site : `https://${site}`);
  if (!url) return null;
  const pagina = await buscar(url, 2_000_000, /text\/html/);
  if (!pagina) return null;
  const html = pagina.bytes.toString("utf8");
  const titulo = (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "") + " " + (/property=["']og:title["'][^>]*content=["']([^"']*)/i.exec(html)?.[1] ?? "");
  const palavras = hotel.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter(p => p.length > 3 && !["hotel", "resort", "suites", "apartamentos", "apartments"].includes(p));
  const tituloNormal = titulo.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (palavras.length && !palavras.some(p => tituloNormal.includes(p))) return null;
  const og = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1]
    ?? /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html)?.[1];
  const imagemUrl = og ? urlSegura(og.replace(/&amp;/g, "&"), pagina.final) : null;
  if (!imagemUrl) return null;
  const imagem = await buscar(imagemUrl, 8_000_000, /^image\/(jpeg|png|webp)/);
  if (!imagem) return null;
  const meta = await sharp(imagem.bytes).metadata().catch(() => null);
  if (!meta?.width || meta.width < 700) return null;
  return comoFotoGuardada(imagem.bytes, `Fotografia: site oficial (${pagina.final.hostname.replace(/^www\./, "")})`);
}

async function fotoDoHotel(hotel: string, site: string, zona: string, destino: string, usadas: Set<string>): Promise<FotoPlanner | null> {
  const oficial = site ? await fotoDoSiteOficial(site, hotel).catch(() => null) : null;
  if (oficial) return oficial;
  for (const termo of [hotel, [zona, destino].filter(Boolean).join(" ")]) {
    if (!termo.trim()) continue;
    const f = (await procurarFotos(termo, 8).catch(() => [])).find(x => !usadas.has(x.url));
    if (f) { usadas.add(f.url); return {url: f.url, credito: f.credito}; }
  }
  return null;
}

// ---------- conteúdo gerado ----------

const numeroOuNulo = {type: ["number", "null"]};
const esquemaConteudo = {
  type: "object", additionalProperties: false, required: ["hoteis", "destaques", "voos", "extras", "dicas", "emergencia"],
  properties: {
    hoteis: {type: "array", items: {type: "object", additionalProperties: false, required: ["estrelas", "zona", "lat", "lng", "site"],
      properties: {estrelas: {type: ["integer", "null"]}, zona: {type: "string"}, lat: numeroOuNulo, lng: numeroOuNulo, site: {type: "string"}}}},
    destaques: {type: "array", items: {type: "object", additionalProperties: false, required: ["titulo", "texto", "pesquisa"],
      properties: {titulo: {type: "string"}, texto: {type: "string"}, pesquisa: {type: "string"}}}},
    voos: {type: "array", items: {type: "object", additionalProperties: false,
      required: ["sentido", "data", "numero", "companhia", "origem", "origemCidade", "origemLat", "origemLng", "destino", "destinoCidade", "destinoLat", "destinoLng", "partida", "chegada"],
      properties: {sentido: {type: "string", enum: ["ida", "volta"]}, data: {type: "string"}, numero: {type: "string"}, companhia: {type: "string"},
        origem: {type: "string"}, origemCidade: {type: "string"}, origemLat: numeroOuNulo, origemLng: numeroOuNulo,
        destino: {type: "string"}, destinoCidade: {type: "string"}, destinoLat: numeroOuNulo, destinoLng: numeroOuNulo, partida: {type: "string"}, chegada: {type: "string"}}}},
    extras: {type: "object", additionalProperties: false, required: ["destinoLat", "destinoLng", "clima", "fuso", "moeda", "lingua", "tomada"],
      properties: {destinoLat: numeroOuNulo, destinoLng: numeroOuNulo, fuso: numeroOuNulo, moeda: {type: "string"}, lingua: {type: "string"}, tomada: {type: "string"},
        clima: {type: "array", items: {type: "object", additionalProperties: false, required: ["max", "min"], properties: {max: {type: "number"}, min: {type: "number"}}}}}},
    dicas: {type: "array", items: {type: "object", additionalProperties: false, required: ["tema", "titulo", "texto"],
      properties: {tema: {type: "string", enum: Object.keys(TEMAS_DICA)}, titulo: {type: "string"}, texto: {type: "string"}}}},
    emergencia: {type: "string"},
  },
};

/** A IA prepara destaques, voos estruturados, dados dos hotéis, clima e dicas; as fotografias são escolhidas a seguir. */
export async function gerarConteudoProposta(email: string, valor: unknown): Promise<Proposta> {
  const p = validar(valor);
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino antes de preparar a proposta.");
  if (!p.opcoes.length) throw new ErroPlanner("Junta pelo menos um alojamento.");
  const contexto = [
    `Destino: ${p.viagem.destino}`, `Partida de: ${p.viagem.partida || "não indicado"}`, `Datas: ${p.viagem.ida || "?"} a ${p.viagem.regresso || "?"}`,
    `Voos (texto da proposta): ${p.viagem.voo || "não indicado"}`, `Viajantes: ${p.viagem.viajantes ?? "não indicado"}`,
    `Alojamentos, por ordem: ${p.opcoes.map((o, i) => `${i + 1}. ${o.hotel}${o.regime ? ` (${o.regime})` : ""}`).join("; ")}`,
  ].join("\n");
  const r = await chamarIAReservas(email, `Preparas o conteúdo de uma proposta de viagem da iCliGo para um cliente português (português de Portugal, tom caloroso e vendedor sem exageros, tratando o cliente por "vocês").
- hoteis: um elemento por alojamento, pela mesma ordem: estrelas (1 a 5, se souberes), zona (bairro ou praia onde fica), lat/lng do hotel, site (domínio oficial do hotel, ex.: "www.hotelexemplo.com"; vazio se não tiveres a certeza — nunca inventes).
- destaques: 5 coisas a ver ou fazer no destino, cada uma com titulo curto, texto (1 a 2 frases que dão vontade de ir) e pesquisa (termo curto em inglês para encontrar uma fotografia no Wikimedia Commons).
- voos: um elemento por troço que esteja no texto dos voos (ida e volta, com escalas): códigos IATA, cidade, coordenadas do aeroporto, número, companhia, data YYYY-MM-DD, horas HH:MM. Se faltar um dado, deixa vazio; não inventes números nem horas. Sem texto de voos, devolve os troços prováveis só com aeroportos e cidades.
- extras: coordenadas do destino, temperaturas médias máxima e mínima de cada mês (12 entradas, °C), diferença horária para Lisboa na data da viagem, moeda (nome e código), língua, tomada e voltagem.
- dicas: uma por tema, para documentos, saude, moeda, clima, tomadas, fuso, mala, gorjetas e transportes, 2 a 3 frases. Para documentos e saude, o que costuma ser exigido a cidadãos portugueses, sem certezas absolutas — o consultor vai confirmar.
- emergencia: números de emergência do destino e a representação diplomática portuguesa mais próxima, em 2 a 4 linhas.`,
    [{type: "input_text", text: contexto}], 9000, esquemaConteudo);

  const hoteisIA = Array.isArray(r.hoteis) ? r.hoteis as Record<string, unknown>[] : [];
  const destinoCurto = p.viagem.destino.split(",")[0]!.trim();
  const usadas = new Set<string>();
  const opcoes = await Promise.all(p.opcoes.map(async (o, i) => {
    const h = hoteisIA[i] ?? {};
    const zona = o.zona || (typeof h.zona === "string" ? h.zona.slice(0, 120) : "");
    // A localização do OpenStreetMap é mais fiável do que a da IA; a da IA só serve de recurso.
    const local = o.lat === null ? (await localizarPonto(`${o.hotel}, ${destinoCurto}`).catch(() => []))[0] : null;
    const lat = o.lat ?? local?.lat ?? (typeof h.lat === "number" ? h.lat : null);
    const lng = o.lng ?? local?.lng ?? (typeof h.lng === "number" ? h.lng : null);
    return {...o, zona, lat, lng, estrelas: o.estrelas ?? (typeof h.estrelas === "number" && h.estrelas >= 1 && h.estrelas <= 5 ? h.estrelas : null), _site: typeof h.site === "string" ? h.site : ""};
  }));
  for (const o of opcoes) o.foto ??= await fotoDoHotel(o.hotel, o._site, o.zona, destinoCurto, usadas);

  const doDestino = await procurarFotos(destinoCurto, 12).catch(() => []);
  const foto = p.foto ?? (doDestino[0] ? {url: doDestino[0].url, credito: doDestino[0].credito} : null);
  if (foto) usadas.add(foto.url);
  const destaques: DestaqueProposta[] = [];
  for (const d of (Array.isArray(r.destaques) ? r.destaques : []).slice(0, 6) as Record<string, unknown>[]) {
    const titulo = typeof d.titulo === "string" ? d.titulo.slice(0, 80) : "", pesquisa = typeof d.pesquisa === "string" ? d.pesquisa.slice(0, 120) : "";
    const f = (await procurarFotos(pesquisa || titulo, 6).catch(() => [])).find(x => !usadas.has(x.url)) ?? doDestino.find(x => !usadas.has(x.url));
    if (f) usadas.add(f.url);
    destaques.push({titulo, texto: typeof d.texto === "string" ? d.texto.slice(0, 400) : "", pesquisa, foto: f ? {url: f.url, credito: f.credito} : null});
  }

  return validar({
    ...p, foto, destaques,
    opcoes: opcoes.map(({_site, ...o}) => o),
    voos: Array.isArray(r.voos) ? r.voos.slice(0, 6).map(validarVoo) : [],
    extras: validarExtras(r.extras),
    dicas: Array.isArray(r.dicas) ? r.dicas.slice(0, 12).map(d => validarDica({...(d as object), confirmado: false})) : [],
    emergencia: {texto: typeof r.emergencia === "string" ? r.emergencia.trim().slice(0, 1000) : "", confirmado: false},
  });
}

/** Procura de novo a fotografia de um hotel (site oficial e fotos livres). */
export async function fotoHotelProposta(valor: unknown): Promise<FotoPlanner | null> {
  const v = (valor ?? {}) as {hotel?: unknown; site?: unknown; zona?: unknown; destino?: unknown};
  const hotel = typeof v.hotel === "string" ? v.hotel.slice(0, 160) : "";
  if (!hotel) throw new ErroPlanner("Indica o nome do hotel.");
  return fotoDoHotel(hotel, typeof v.site === "string" ? v.site.slice(0, 200) : "", typeof v.zona === "string" ? v.zona : "", typeof v.destino === "string" ? v.destino : "", new Set());
}

// ---------- páginas e PDF ----------

async function paginasProposta(email: string, p: Proposta, escala: number): Promise<Buffer[]> {
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino da viagem.");
  const [membro, marca, perfil] = await Promise.all([buscarMembroEquipa(email), obterMarca(email), obterPerfil(email)]);
  // O QR do WhatsApp e o email aparecem mesmo que o nome não esteja na equipa.
  const [capa, ...resto] = await Promise.all([imagemDe(p.foto), ...p.opcoes.map(o => imagemDe(o.foto)), ...p.destaques.map(d => imagemDe(d.foto))]);
  return desenharProposta({p, marca, escala, consultor: {nome: membro?.nome ?? "", email, telemovel: perfil.telemovel},
    imagens: {capa, hoteis: resto.slice(0, p.opcoes.length), destaques: resto.slice(p.opcoes.length)}});
}

export async function previsualizarProposta(email: string, valor: unknown): Promise<string[]> {
  const paginas = await paginasProposta(email, validar(valor), 0.75);
  return paginas.map(b => `data:image/jpeg;base64,${b.toString("base64")}`);
}

export async function pdfProposta(email: string, id: unknown): Promise<{bytes: Uint8Array; nome: string}> {
  const p = await abrirProposta(email, id);
  const pendentes = pendentesProposta(p);
  if (pendentes.length) throw new ErroPlanner(`Antes de descarregar, confirma: ${pendentes.join(", ")}.`, 409);
  return {bytes: await montarPDF(await paginasProposta(email, p, 2), `${p.viagem.destino} · Proposta de viagem`), nome: nomeFicheiro(p.viagem.destino, "proposta")};
}

/** Cria o travel planner com a opção que o cliente escolheu. */
export async function criarPlannerDaProposta(email: string, id: unknown, opcao: unknown): Promise<string> {
  const p = await abrirProposta(email, id);
  const i = typeof opcao === "number" && Number.isInteger(opcao) && opcao >= 0 && opcao < Math.min(p.opcoes.length, MAX_OPCOES_PROPOSTA) ? opcao : -1;
  if (i < 0) throw new ErroPlanner("Escolhe a opção que o cliente reservou.");
  const planner = await guardarPlanner(email, plannerDaProposta(p, i, randomUUID()));
  return planner.id;
}
