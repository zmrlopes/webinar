import QRCode from "qrcode";
import { db } from "./db";
import type { AnexoMensagem, EmailSender } from "./email";
import { gerarSlug } from "./slug";

/** Detalhes do evento "Teambuilding Tropa de Elite" — só existe este por agora, sem tabela própria. */
export const EVENTO_TITULO = "Teambuilding Tropa de Elite";
export const EVENTO_DATA_TEXTO = "14 de novembro de 2026";
export const EVENTO_LOCAL = "Fátima";
export const EVENTO_PRECO_ADULTO = 35;
export const EVENTO_PRECO_CRIANCA_MAIS10 = 17;

export function calcularTotalEvento(adultos: number, criancasMais10: number): number {
  return adultos * EVENTO_PRECO_ADULTO + criancasMais10 * EVENTO_PRECO_CRIANCA_MAIS10;
}

/** Linha única (id=1) — ver migrations/025_evento_estado.sql. */
export async function estaoInscricoesAbertas(): Promise<boolean> {
  const { rows } = await db().query<{ inscricoes_abertas: boolean }>(
    `select inscricoes_abertas from evento_estado where id = 1`,
  );
  return rows[0]?.inscricoes_abertas ?? true;
}

export async function definirInscricoesAbertas(abertas: boolean): Promise<void> {
  await db().query(
    `insert into evento_estado (id, inscricoes_abertas) values (1, $1)
     on conflict (id) do update set inscricoes_abertas = excluded.inscricoes_abertas`,
    [abertas],
  );
}

export interface DadosInscricaoEvento {
  nome: string;
  telemovel: string;
  email: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  comprovativoBytes: Buffer;
  comprovativoNome: string;
  comprovativoTipo: string;
}

export interface BilheteNovo {
  id: string;
  rotulo: string;
}

/**
 * Cria a inscrição e um bilhete por cada pessoa que precisa de ser
 * confirmada individualmente à entrada: um por adulto, um por cada criança
 * que paga (+10 anos) — as crianças que não pagam (-10 anos) não têm
 * bilhete próprio, seguem com o adulto que as trouxe.
 */
export async function registarInscricaoEvento(
  dados: DadosInscricaoEvento,
): Promise<{ id: string; bilhetes: BilheteNovo[] }> {
  const total = calcularTotalEvento(dados.adultos, dados.criancasMais10);
  const { rows } = await db().query<{ id: string }>(
    `insert into evento_inscricoes
       (nome, telemovel, email, adultos, criancas_mais10, criancas_menos10,
        total_pagar, comprovativo, comprovativo_nome, comprovativo_tipo)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      dados.nome,
      dados.telemovel,
      dados.email,
      dados.adultos,
      dados.criancasMais10,
      dados.criancasMenos10,
      total,
      dados.comprovativoBytes,
      dados.comprovativoNome,
      dados.comprovativoTipo,
    ],
  );
  const inscricaoId = rows[0]!.id;

  const rotulos: string[] = [];
  for (let n = 1; n <= dados.adultos; n++) rotulos.push(`Adulto ${n}`);
  for (let n = 1; n <= dados.criancasMais10; n++) rotulos.push(`Criança +10 anos ${n}`);

  const bilhetes: BilheteNovo[] = [];
  for (const rotulo of rotulos) {
    const { rows: bilheteRows } = await db().query<{ id: string }>(
      `insert into evento_bilhetes (inscricao_id, rotulo) values ($1, $2) returning id`,
      [inscricaoId, rotulo],
    );
    bilhetes.push({ id: bilheteRows[0]!.id, rotulo });
  }

  return { id: inscricaoId, bilhetes };
}

export interface ResultadoInscricaoEvento {
  id: string;
  total: number;
  emailEnviado: boolean;
}

/**
 * Regista a inscrição e envia o email com um QR code por bilhete (um por
 * adulto e por criança que paga) — usado tanto pelo formulário público do
 * painel do consultor como pela inscrição manual no admin (ver
 * app/api/admin/eventos/inscrever), para as duas nunca desalinharem. Uma
 * falha a enviar o email não desfaz a inscrição — fica registada na mesma,
 * só o `emailEnviado` vem a false para quem chamou avisar a pessoa.
 */
export async function inscreverNoEventoEEnviarEmail(
  sender: EmailSender,
  baseUrl: string,
  dados: DadosInscricaoEvento,
): Promise<ResultadoInscricaoEvento> {
  const { id, bilhetes } = await registarInscricaoEvento(dados);
  const total = calcularTotalEvento(dados.adultos, dados.criancasMais10);

  let emailEnviado = true;
  try {
    const anexos: AnexoMensagem[] = await Promise.all(
      bilhetes.map(async (bilhete) => {
        const linkCheckin = `${baseUrl}/api/eventos/checkin/${bilhete.id}`;
        const qrBuffer = await QRCode.toBuffer(linkCheckin, { width: 500, margin: 2 });
        return { nome: `${gerarSlug(bilhete.rotulo)}.png`, conteudoBase64: qrBuffer.toString("base64") };
      }),
    );

    await sender.enviar({
      destinatario: dados.email,
      assunto: `A tua inscrição no ${EVENTO_TITULO}`,
      corpoTexto:
        `Olá ${dados.nome},\n\n` +
        `A tua inscrição no ${EVENTO_TITULO} (${EVENTO_DATA_TEXTO}, ${EVENTO_LOCAL}) está confirmada.\n\n` +
        `Em anexo vai um QR code por cada pessoa (${bilhetes.map((b) => b.rotulo).join(", ")}) — ` +
        `leva-os contigo no dia do evento, cada um vai ser lido à entrada para confirmar essa pessoa.\n\n` +
        `Até lá!`,
      anexos,
    });
  } catch (erroEmail) {
    console.error("falha ao enviar o email com os QR codes do evento:", erroEmail);
    emailEnviado = false;
  }

  await db().query(`update evento_inscricoes set email_enviado = $1 where id = $2`, [emailEnviado, id]);

  return { id, total, emailEnviado };
}

export interface DocumentoEvento {
  id: string;
  nome: string;
  tipo: string;
  criadoEm: Date;
}

/** Sem os bytes — só o essencial para listar em /admin/eventos. */
export async function listarDocumentosEvento(): Promise<DocumentoEvento[]> {
  const { rows } = await db().query<{ id: string; nome: string; tipo: string; criado_em: Date }>(
    `select id, nome, tipo, criado_em from evento_documentos order by criado_em desc`,
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, criadoEm: r.criado_em }));
}

export async function guardarDocumentoEvento(nome: string, tipo: string, bytes: Buffer): Promise<void> {
  await db().query(`insert into evento_documentos (nome, tipo, bytes) values ($1, $2, $3)`, [
    nome,
    tipo,
    bytes,
  ]);
}

export async function apagarDocumentoEvento(id: string): Promise<void> {
  await db().query(`delete from evento_documentos where id = $1`, [id]);
}

export async function buscarDocumentoEvento(
  id: string,
): Promise<{ bytes: Buffer; nome: string; tipo: string } | undefined> {
  const { rows } = await db().query<{ bytes: Buffer; nome: string; tipo: string }>(
    `select bytes, nome, tipo from evento_documentos where id = $1`,
    [id],
  );
  return rows[0];
}

export interface BilheteEvento {
  id: string;
  rotulo: string;
  presente: boolean;
  presenteEm: Date | null;
}

export interface InscricaoEvento {
  id: string;
  nome: string;
  telemovel: string;
  email: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  totalPagar: number;
  comprovativoNome: string | null;
  criadoEm: Date;
  bilhetes: BilheteEvento[];
  emailEnviado: boolean | null;
}

/** Sem os bytes do comprovativo — só o essencial para a tabela do admin. */
export async function listarInscricoesEvento(): Promise<InscricaoEvento[]> {
  const [{ rows: inscricoes }, { rows: bilhetes }] = await Promise.all([
    db().query<{
      id: string;
      nome: string;
      telemovel: string;
      email: string;
      adultos: number;
      criancas_mais10: number;
      criancas_menos10: number;
      total_pagar: string;
      comprovativo_nome: string | null;
      criado_em: Date;
      email_enviado: boolean | null;
    }>(
      `select id, nome, telemovel, email, adultos, criancas_mais10, criancas_menos10,
              total_pagar, comprovativo_nome, criado_em, email_enviado
       from evento_inscricoes
       order by criado_em desc`,
    ),
    db().query<{
      id: string;
      inscricao_id: string;
      rotulo: string;
      presente: boolean;
      presente_em: Date | null;
    }>(`select id, inscricao_id, rotulo, presente, presente_em from evento_bilhetes order by rotulo asc`),
  ]);

  const bilhetesPorInscricao = new Map<string, BilheteEvento[]>();
  for (const b of bilhetes) {
    const lista = bilhetesPorInscricao.get(b.inscricao_id) ?? [];
    lista.push({ id: b.id, rotulo: b.rotulo, presente: b.presente, presenteEm: b.presente_em });
    bilhetesPorInscricao.set(b.inscricao_id, lista);
  }

  return inscricoes.map((r) => ({
    id: r.id,
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    adultos: r.adultos,
    criancasMais10: r.criancas_mais10,
    criancasMenos10: r.criancas_menos10,
    totalPagar: Number(r.total_pagar),
    comprovativoNome: r.comprovativo_nome,
    criadoEm: r.criado_em,
    bilhetes: bilhetesPorInscricao.get(r.id) ?? [],
    emailEnviado: r.email_enviado,
  }));
}

export async function buscarComprovativoEvento(
  id: string,
): Promise<{ bytes: Buffer; nome: string; tipo: string } | undefined> {
  const { rows } = await db().query<{
    comprovativo: Buffer;
    comprovativo_nome: string | null;
    comprovativo_tipo: string | null;
  }>(
    `select comprovativo, comprovativo_nome, comprovativo_tipo from evento_inscricoes where id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    bytes: r.comprovativo,
    nome: r.comprovativo_nome ?? "comprovativo",
    tipo: r.comprovativo_tipo ?? "application/octet-stream",
  };
}

/**
 * Marca a presença de um bilhete ao ler o QR code (ver
 * /api/eventos/checkin/[id]) — idempotente, ler o mesmo código duas vezes
 * não é erro. Devolve o nome de quem se inscreveu + o rótulo do bilhete
 * (ex: "Adulto 2"), para a página de confirmação.
 */
export async function marcarPresencaBilhete(
  bilheteId: string,
): Promise<{ nomeInscricao: string; rotulo: string; jaEstavaPresente: boolean } | undefined> {
  const { rows } = await db().query<{ rotulo: string; presente: boolean; nome: string }>(
    `select b.rotulo, b.presente, i.nome
     from evento_bilhetes b
     join evento_inscricoes i on i.id = b.inscricao_id
     where b.id = $1`,
    [bilheteId],
  );
  const linha = rows[0];
  if (!linha) return undefined;

  if (!linha.presente) {
    await db().query(
      `update evento_bilhetes set presente = true, presente_em = now() where id = $1`,
      [bilheteId],
    );
  }
  return { nomeInscricao: linha.nome, rotulo: linha.rotulo, jaEstavaPresente: linha.presente };
}

/** Todos os números inteiros de um texto livre — "5, 8" ou "5 e 8 anos" dão [5, 8]. */
function extrairIdades(texto: string | null): number[] {
  if (!texto) return [];
  return [...texto.matchAll(/\d+/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 100);
}

export interface ParticipanteEvento {
  nome: string;
  email: string;
  adultos: number;
  criancasMenos5: number;
  criancasMais5: number;
  /** true quando as idades do questionário do hotel dizem respeito a mais crianças do que as inscritas — vale a pena confirmar à mão. */
  contagemPorConfirmar: boolean;
}

/**
 * Todos os inscritos no evento, um por email (soma as inscrições de quem
 * se inscreveu mais do que uma vez — mesma lógica de
 * listarInscritosComFaturacao), com as crianças separadas por idade: menos
 * de 5 anos e 5 ou mais.
 *
 * A idade real só existe para quem respondeu ao questionário do quarto de
 * hotel e disse que leva crianças (respostas_hotel.idades_criancas, texto
 * livre). Para quem não respondeu, ou respondeu com menos idades do que
 * crianças tem inscritas, as que sobram entram em "5 ou mais" — regra
 * pedida explicitamente (quem não se sabe a idade, considera-se crescida
 * o suficiente para não precisar de berço/cama de grades no quarto).
 */
export async function listarParticipantesEvento(): Promise<ParticipanteEvento[]> {
  const { rows } = await db().query<{
    email: string;
    nome: string | null;
    adultos: string;
    criancas_mais10: string;
    criancas_menos10: string;
    idades_criancas: string | null;
  }>(
    `select ei.email, max(ei.nome) as nome,
            sum(ei.adultos) as adultos,
            sum(ei.criancas_mais10) as criancas_mais10,
            sum(ei.criancas_menos10) as criancas_menos10,
            (select rh.idades_criancas from respostas_hotel rh where rh.email = ei.email) as idades_criancas
     from evento_inscricoes ei
     group by ei.email
     order by max(ei.nome)`,
  );

  return rows.map((r) => {
    const totalCriancas = Number(r.criancas_mais10) + Number(r.criancas_menos10);
    const idades = extrairIdades(r.idades_criancas);
    const menos5Conhecidas = idades.filter((i) => i < 5).length;
    const mais5Conhecidas = idades.length - menos5Conhecidas;
    const desconhecidas = Math.max(0, totalCriancas - idades.length);

    return {
      nome: r.nome ?? r.email,
      email: r.email,
      adultos: Number(r.adultos),
      criancasMenos5: menos5Conhecidas,
      criancasMais5: mais5Conhecidas + desconhecidas,
      contagemPorConfirmar: idades.length > totalCriancas,
    };
  });
}

/**
 * O Excel dos participantes, com uma Tabela nativa e uma linha de Total
 * no fim (soma a sério, por fórmula — não um número fixo) — ver
 * gerarExcelRespostasHotel em src/lib/hotel.ts, mesmo padrão.
 */
export async function gerarExcelParticipantesEvento(participantes: ParticipanteEvento[]): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const livro = new ExcelJS.Workbook();
  livro.creator = "Viajar é Viver";
  livro.created = new Date();

  const folha = livro.addWorksheet("Participantes", { views: [{ state: "frozen", ySplit: 1 }] });

  const colunas: { nome: string; largura: number; totalsRowFunction?: "sum"; totalsRowLabel?: string }[] = [
    { nome: "Nome", largura: 28, totalsRowLabel: "Total" },
    { nome: "Email", largura: 30 },
    { nome: "Adultos", largura: 11, totalsRowFunction: "sum" },
    { nome: "Crianças menos de 5", largura: 18, totalsRowFunction: "sum" },
    { nome: "Crianças 5 ou mais", largura: 17, totalsRowFunction: "sum" },
    { nome: "Nota", largura: 26 },
  ];
  folha.columns = colunas.map((c) => ({ width: c.largura }));

  const linhas = participantes.map((p) => [
    p.nome,
    p.email,
    p.adultos,
    p.criancasMenos5,
    p.criancasMais5,
    p.contagemPorConfirmar ? "confirmar idades — não batem com as crianças inscritas" : "",
  ]);

  folha.addTable({
    name: "ParticipantesEvento",
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((c) => ({
      name: c.nome,
      filterButton: true,
      totalsRowFunction: c.totalsRowFunction ?? "none",
      totalsRowLabel: c.totalsRowLabel,
    })),
    rows: linhas,
  });

  const arrayBuffer = await livro.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
