import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { db } from "./db";
import { buscarMembroEquipa } from "./equipa";
import { ErroReserva } from "./reservas";
import { chamarIAReservas } from "./reservas-servidor";
import {
  dataPlanner, diasDaViagem, ErroPlanner, MAX_DIAS_PLANNER, pendentesPlanner, RITMOS_PLANNER, TEMAS_DICA, validarDia, validarDica, validarPlanner,
  type DiaPlanner, type DicaPlanner, type ResumoPlanner, type TravelPlanner,
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

const esquemaRoteiro = {
  type: "object", additionalProperties: false, required: ["dias", "dicas", "emergencia"],
  properties: {
    dias: {type: "array", items: {type: "object", additionalProperties: false, required: ["titulo", "manha", "tarde", "noite"],
      properties: {titulo: {type: "string"}, manha: {type: "string"}, tarde: {type: "string"}, noite: {type: "string"}}}},
    dicas: {type: "array", items: {type: "object", additionalProperties: false, required: ["tema", "titulo", "texto"],
      properties: {tema: {type: "string", enum: Object.keys(TEMAS_DICA)}, titulo: {type: "string"}, texto: {type: "string"}}}},
    emergencia: {type: "string"},
  },
};

/** A IA propõe o roteiro dia a dia e as dicas; o consultor edita tudo depois. */
export async function gerarRoteiroPlanner(email: string, valor: unknown): Promise<{dias: DiaPlanner[]; dicas: DicaPlanner[]; emergencia: string}> {
  const p = validarPlanner(valor);
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino antes de gerar o roteiro.");
  const total = diasDaViagem(p.viagem.ida, p.viagem.regresso);
  if (!total) throw new ErroPlanner("Indica as datas de ida e regresso para gerar o roteiro.");
  if (total > MAX_DIAS_PLANNER) throw new ErroPlanner(`O roteiro automático vai até ${MAX_DIAS_PLANNER} dias. Encurta as datas ou escreve os restantes dias à mão.`);
  const ritmo = RITMOS_PLANNER.find(r => r.id === p.perfil.ritmo)?.nome ?? "Equilibrado";
  const contexto = [
    `Destino: ${p.viagem.destino}`, `Partida de: ${p.viagem.partida || "não indicado"}`,
    `Datas: ${p.viagem.ida} a ${p.viagem.regresso} (${total} dias, o dia 1 é o da chegada e o dia ${total} é o do regresso)`,
    `Voos: ${p.viagem.voo || "não indicado"}`, `Hotel: ${[p.viagem.hotel, p.viagem.regime].filter(Boolean).join(", ") || "não indicado"}`,
    `Transfer: ${p.viagem.transfer || "não indicado"}`, `Viajantes: ${p.viagem.viajantes ?? "não indicado"}`,
    `Tipo de viagem: ${p.perfil.tipo || "não indicado"}`, `Interesses: ${p.perfil.interesses.join(", ") || "não indicados"}`,
    `Ritmo: ${ritmo}`, `Notas do consultor: ${p.perfil.notas || "nenhuma"}`,
  ].join("\n");
  const resposta = await chamarIAReservas(email, `És um consultor de viagens português a preparar o travel planner que o cliente recebe depois de reservar. Escreve em português de Portugal, tom caloroso e prático, tratando o cliente por "vocês".
JSON {"dias":[{"titulo":"","manha":"","tarde":"","noite":""}],"dicas":[{"tema":"","titulo":"","texto":""}],"emergencia":""}.
- dias: exatamente ${total} entradas, uma por dia, por ordem. titulo curto (ex.: "Chegada e primeiro passeio"). manha/tarde/noite com 1 a 3 frases cada. Tem em conta os horários dos voos e o tempo de transfer no primeiro e no último dia; usa o regime do hotel (ex.: tudo incluído → refeições no hotel). Ajusta ao tipo de viagem, interesses e ritmo. Deixa tempo livre num ritmo calmo.
- Sugere atrações e zonas conhecidas e estáveis. Não inventes preços, horários, nomes de guias, nem serviços incluídos na reserva. Para restaurantes, sugere o tipo de cozinha e a zona, ou só lugares muito conhecidos.
- dicas: uma por tema, para os temas documentos, saude, moeda, clima, tomadas, fuso, mala, gorjetas e transportes (pode acrescentar "outro"). Para documentos, saude e emergencia diz o que costuma ser exigido para cidadãos portugueses, sem certezas absolutas — o consultor vai confirmar.
- emergencia: números de emergência do destino e onde fica a representação diplomática portuguesa mais próxima, em 2 a 4 linhas.`,
    [{type: "input_text", text: contexto}], 9000, esquemaRoteiro);
  if (!Array.isArray(resposta.dias) || !resposta.dias.length) throw new ErroPlanner("A IA não devolveu um roteiro utilizável. Tenta novamente.", 502);
  const dias = resposta.dias.slice(0, total).map(validarDia);
  while (dias.length < total) dias.push({titulo: "", manha: "", tarde: "", noite: ""});
  const dicas = Array.isArray(resposta.dicas) ? resposta.dicas.slice(0, 12).map(d => validarDica({...(d as object), confirmado: false})) : [];
  return {dias, dicas, emergencia: typeof resposta.emergencia === "string" ? resposta.emergencia.trim().slice(0, 1000) : ""};
}

// ---------- PDF ----------

const A4 = {w: 595.28, h: 841.89};
const MARGEM = 48;
const OLIVA = rgb(0x4b / 255, 0x53 / 255, 0x20 / 255), PRETO = rgb(0, 0, 0), BRANCO = rgb(1, 1, 1);
const CINZA = rgb(0x6b / 255, 0x6a / 255, 0x63 / 255), CREME = rgb(0xf5 / 255, 0xf6 / 255, 0xef / 255), LINHA = rgb(0xd8 / 255, 0xdd / 255, 0xc5 / 255);
const CORAL = rgb(0xff / 255, 0x6b / 255, 0x4a / 255), ARDOSIA = rgb(0x34 / 255, 0x41 / 255, 0x53 / 255);

// As fontes base do PDF só conhecem o alfabeto latino (WinAnsi).
const EXTRA_WINANSI = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function limpo(t: string): string {
  return t.replace(/[‐-‒]/g, "-").replace(/ | /g, " ").replace(/[→➔]/g, "->")
    .split("").filter(c => c === "\n" || (c >= " " && c <= "~") || (c >= " " && c <= "ÿ") || EXTRA_WINANSI.has(c)).join("");
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of limpo(texto).split("\n")) {
    let linha = "";
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura || !linha) linha = tentativa;
      else { linhas.push(linha); linha = palavra; }
    }
    linhas.push(linha);
  }
  return linhas;
}

interface Tema { titulo: PDFFont; texto: PDFFont; negrito: PDFFont; capaFundo: RGB; capaTexto: RGB; destaque: RGB; cartao: RGB | null; faixa: boolean }

class Paginador {
  pagina!: PDFPage;
  y = 0;
  numero = 0;
  constructor(private pdf: PDFDocument, private tema: Tema, private rodape: string) {}
  nova() {
    this.pagina = this.pdf.addPage([A4.w, A4.h]);
    this.numero += 1;
    this.y = A4.h - MARGEM;
    this.pagina.drawText(limpo(this.rodape), {x: MARGEM, y: 24, size: 8, font: this.tema.texto, color: CINZA});
    const n = String(this.numero);
    this.pagina.drawText(n, {x: A4.w - MARGEM - this.tema.texto.widthOfTextAtSize(n, 8), y: 24, size: 8, font: this.tema.texto, color: CINZA});
  }
  garantir(altura: number) { if (this.y - altura < 56) this.nova(); }
  titulo(texto: string) {
    this.garantir(60);
    const t = limpo(texto);
    if (this.tema.faixa) {
      this.pagina.drawRectangle({x: MARGEM, y: this.y - 30, width: A4.w - 2 * MARGEM, height: 30, color: PRETO});
      this.pagina.drawText(t.toUpperCase(), {x: MARGEM + 12, y: this.y - 20, size: 13, font: this.tema.titulo, color: BRANCO});
      this.y -= 46;
    } else {
      this.pagina.drawText(t, {x: MARGEM, y: this.y - 20, size: 20, font: this.tema.titulo, color: PRETO});
      this.pagina.drawRectangle({x: MARGEM, y: this.y - 30, width: 40, height: 2.5, color: this.tema.destaque});
      this.y -= 46;
    }
  }
  /** Bloco com subtítulo e texto; o fundo de cartão acompanha o bloco quando o estilo o pede. */
  bloco(subtitulo: string, texto: string, opcoes: {etiqueta?: string} = {}) {
    const largura = A4.w - 2 * MARGEM - (this.tema.cartao ? 24 : 0);
    const linhas = texto.trim() ? quebrar(texto, this.tema.texto, 10.5, largura) : [];
    const altura = 18 + linhas.length * 14.5 + (this.tema.cartao ? 20 : 8);
    if (altura < 700) this.garantir(altura);
    const x = MARGEM + (this.tema.cartao ? 12 : 0);
    if (this.tema.cartao && altura < 700) this.pagina.drawRectangle({x: MARGEM, y: this.y - altura + 6, width: A4.w - 2 * MARGEM, height: altura - 4, color: this.tema.cartao});
    if (this.tema.cartao) this.y -= 10;
    this.pagina.drawText(limpo(subtitulo), {x, y: this.y - 12, size: 11.5, font: this.tema.negrito, color: this.tema.destaque});
    if (opcoes.etiqueta) {
      const w = this.tema.negrito.widthOfTextAtSize(opcoes.etiqueta, 8);
      this.pagina.drawText(limpo(opcoes.etiqueta), {x: A4.w - MARGEM - (this.tema.cartao ? 12 : 0) - w, y: this.y - 11, size: 8, font: this.tema.negrito, color: CINZA});
    }
    this.y -= 18;
    for (const linha of linhas) {
      this.garantir(15);
      this.pagina.drawText(linha, {x, y: this.y - 11, size: 10.5, font: this.tema.texto, color: PRETO, lineHeight: 14.5});
      this.y -= 14.5;
    }
    this.y -= this.tema.cartao ? 16 : 10;
  }
}

async function fotoJPEG(url: string): Promise<Uint8Array | null> {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "upload.wikimedia.org" || u.username || u.password || u.port) return null;
    const r = await fetch(u, {headers: {"User-Agent": "ReservasConsultor/1.0 (travel planner)"}, redirect: "error", signal: AbortSignal.timeout(20_000)});
    if (!r.ok || !/^image\/(jpeg|png|webp)/.test(r.headers.get("Content-Type") ?? "")) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > 8_000_000) return null;
    return new Uint8Array(await sharp(bytes, {limitInputPixels: 30_000_000}).rotate().resize({width: 1400, height: 1400, fit: "inside", withoutEnlargement: true}).jpeg({quality: 78}).toBuffer());
  } catch { return null; }
}

async function logotipo(origem: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(new URL("/icligo-logo.png", origem), {signal: AbortSignal.timeout(10_000)});
    return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
  } catch { return null; }
}

function desenharMarca(pagina: PDFPage, x: number, y: number, logo: PDFImage | null, negrito: PDFFont, texto: PDFFont, clara: boolean) {
  let tx = x;
  if (logo) { pagina.drawImage(logo, {x, y: y - 4, width: 26, height: 26 * logo.height / logo.width}); tx += 32; }
  pagina.drawText("icligo", {x: tx, y: y + 8, size: 15, font: negrito, color: clara ? BRANCO : CORAL});
  pagina.drawText("travel partners", {x: tx, y: y - 3, size: 7.5, font: texto, color: clara ? BRANCO : ARDOSIA});
}

export async function pdfPlanner(email: string, id: unknown, origem: string): Promise<{bytes: Uint8Array; nome: string}> {
  const p = await abrirPlanner(email, id);
  const pendentes = pendentesPlanner(p);
  if (pendentes.length) throw new ErroPlanner(`Antes de descarregar, confirma: ${pendentes.join(", ")}.`, 409);
  if (!p.viagem.destino) throw new ErroPlanner("Indica o destino da viagem.");
  const membro = await buscarMembroEquipa(email);

  const pdf = await PDFDocument.create();
  pdf.setTitle(limpo(p.nome)); pdf.setAuthor("iCliGo travel partners"); pdf.setLanguage("pt-PT");
  const serif = p.estilo === "classico";
  const tema: Tema = {
    titulo: await pdf.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold),
    texto: await pdf.embedFont(StandardFonts.Helvetica),
    negrito: await pdf.embedFont(StandardFonts.HelveticaBold),
    capaFundo: p.estilo === "moderno" ? PRETO : p.estilo === "natural" ? OLIVA : BRANCO,
    capaTexto: p.estilo === "classico" ? PRETO : BRANCO,
    destaque: OLIVA,
    cartao: p.estilo === "natural" ? CREME : null,
    faixa: p.estilo === "moderno",
  };
  const [fotoBytes, logoBytes] = await Promise.all([p.foto ? fotoJPEG(p.foto.url) : null, logotipo(origem)]);
  const foto = fotoBytes ? await pdf.embedJpg(fotoBytes) : null;
  const logo = logoBytes ? await pdf.embedPng(logoBytes).catch(() => null) : null;

  // Capa
  const capa = pdf.addPage([A4.w, A4.h]);
  capa.drawRectangle({x: 0, y: 0, width: A4.w, height: A4.h, color: tema.capaFundo});
  const alturaFoto = A4.h * 0.58;
  if (foto) {
    // Preenche a área da foto mantendo a proporção (recorta o excesso).
    const escala = Math.max(A4.w / foto.width, alturaFoto / foto.height);
    const w = foto.width * escala, h = foto.height * escala;
    const inset = p.estilo === "classico" ? MARGEM : 0;
    if (inset) {
      const escalaI = Math.max((A4.w - 2 * inset) / foto.width, (alturaFoto - inset) / foto.height);
      const wi = foto.width * escalaI, hi = foto.height * escalaI;
      capa.drawImage(foto, {x: inset - (wi - (A4.w - 2 * inset)) / 2, y: A4.h - inset - hi + (hi - (alturaFoto - inset)) / 2, width: wi, height: hi});
      // Tapa o que sai da moldura com a cor da capa.
      capa.drawRectangle({x: 0, y: A4.h - inset, width: A4.w, height: inset, color: tema.capaFundo});
      capa.drawRectangle({x: 0, y: 0, width: A4.w, height: A4.h - alturaFoto, color: tema.capaFundo});
      capa.drawRectangle({x: 0, y: 0, width: inset, height: A4.h, color: tema.capaFundo});
      capa.drawRectangle({x: A4.w - inset, y: 0, width: inset, height: A4.h, color: tema.capaFundo});
    } else {
      capa.drawImage(foto, {x: (A4.w - w) / 2, y: A4.h - alturaFoto - (h - alturaFoto) / 2, width: w, height: h});
      capa.drawRectangle({x: 0, y: 0, width: A4.w, height: A4.h - alturaFoto, color: tema.capaFundo});
    }
  }
  let y = A4.h - alturaFoto - 56;
  capa.drawText("O VOSSO TRAVEL PLANNER", {x: MARGEM, y, size: 10, font: tema.negrito, color: p.estilo === "classico" ? OLIVA : tema.capaTexto});
  y -= 44;
  for (const linha of quebrar(p.viagem.destino, tema.titulo, 38, A4.w - 2 * MARGEM).slice(0, 2)) {
    capa.drawText(linha, {x: MARGEM, y, size: 38, font: tema.titulo, color: tema.capaTexto}); y -= 44;
  }
  const datas = p.viagem.ida && p.viagem.regresso ? `${dataPlanner(p.viagem.ida)} - ${dataPlanner(p.viagem.regresso)}` : "";
  if (datas) { capa.drawText(limpo(datas), {x: MARGEM, y, size: 13, font: tema.texto, color: tema.capaTexto}); y -= 20; }
  const subtitulo = [p.perfil.tipo, p.viagem.viajantes ? `${p.viagem.viajantes} viajante${p.viagem.viajantes > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
  if (subtitulo) capa.drawText(limpo(subtitulo), {x: MARGEM, y, size: 11, font: tema.texto, color: tema.capaTexto});
  desenharMarca(capa, MARGEM, 58, logo, tema.negrito, tema.texto, p.estilo !== "classico");
  if (membro) {
    const consultor = limpo(`Preparado por ${membro.nome}`);
    capa.drawText(consultor, {x: A4.w - MARGEM - tema.texto.widthOfTextAtSize(consultor, 9), y: 64, size: 9, font: tema.texto, color: tema.capaTexto});
  }
  if (p.foto?.credito) capa.drawText(limpo(`Fotografia: ${p.foto.credito}`).slice(0, 110), {x: MARGEM, y: 26, size: 6.5, font: tema.texto, color: p.estilo === "classico" ? CINZA : tema.capaTexto});

  const pag = new Paginador(pdf, tema, `${p.viagem.destino} · travel planner iCliGo`);
  pag.numero = 1;

  // Resumo
  pag.nova();
  pag.titulo("A vossa viagem");
  const v = p.viagem;
  const resumo: [string, string][] = [
    ["Datas", datas], ["Partida", v.partida], ["Voos", v.voo], ["Bagagem", v.bagagem],
    ["Alojamento", [v.hotel, v.quarto, v.regime].filter(Boolean).join("\n")], ["Transfer", v.transfer],
    ["Viajantes", v.viajantes ? String(v.viajantes) : ""],
  ];
  for (const [rotulo, valor] of resumo) if (valor.trim()) pag.bloco(rotulo, valor);

  // Roteiro
  if (p.dias.some(d => d.titulo || d.manha || d.tarde || d.noite)) {
    pag.nova();
    pag.titulo("Roteiro dia a dia");
    p.dias.forEach((d, i) => {
      const data = v.ida ? dataPlanner(new Date(Date.parse(`${v.ida}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), {weekday: "long", day: "numeric", month: "long"}) : "";
      const corpo = [d.manha && `Manhã: ${d.manha}`, d.tarde && `Tarde: ${d.tarde}`, d.noite && `Noite: ${d.noite}`].filter(Boolean).join("\n");
      pag.bloco(`Dia ${i + 1}${d.titulo ? ` · ${d.titulo}` : ""}`, corpo, {etiqueta: data});
    });
  }

  // Dicas
  if (p.dicas.some(d => d.texto)) {
    pag.nova();
    pag.titulo("Dicas para a viagem");
    for (const d of p.dicas) if (d.texto) pag.bloco(d.titulo, d.texto);
  }

  // Contactos
  pag.nova();
  pag.titulo("Contactos e emergência");
  if (membro) pag.bloco("O vosso consultor", `${membro.nome}\n${email}`);
  if (v.hotel) pag.bloco("Alojamento", v.hotel);
  if (p.emergencia.texto) pag.bloco("Emergência no destino", p.emergencia.texto);
  pag.bloco("Antes de partir", "Confirmem os requisitos de entrada, vistos e vacinas junto das autoridades competentes e da embaixada do país de destino. Levem cópia dos documentos de viagem e do seguro.");

  const nome = `${p.viagem.destino.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "viagem"}-travel-planner.pdf`;
  return {bytes: await pdf.save(), nome};
}

export function erroPlannerParaResposta(erro: unknown): {mensagem: string; status: number} | null {
  if (erro instanceof ErroPlanner || erro instanceof ErroReserva) return {mensagem: erro.message, status: erro.status};
  return null;
}
