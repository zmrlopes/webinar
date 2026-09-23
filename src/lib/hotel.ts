import { configActiveCampaign } from "./activecampaign";
import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import type { EmailSender } from "./email";
import { notificarPush } from "./push";

/**
 * Reserva de quartos para o Teambuilding de 14 de novembro (Aurea Fátima
 * Hotel Congress & Spa) — a Sara precisa de saber quem quer quarto, que
 * tipo e que noites, para fechar a reserva com o hotel. Enquanto for
 * `true`, o questionário só aparece no painel de demonstração
 * (zmrlopes@gmail.com). Passar a `false` publica-o para os consultores
 * inscritos no evento — é o único sítio a mexer para o pôr no ar.
 */
const SO_PAINEL_DEMONSTRACAO = false;

export const PRECO_SINGLE = 60;
export const PRECO_DUPLO = 72;

export function questionarioHotelPublicado(): boolean {
  return !SO_PAINEL_DEMONSTRACAO;
}

/**
 * Mesma regra do formulário de preparação e dos troféus: só quem está
 * inscrito no evento (evento_inscricoes) e ainda não respondeu. O painel de
 * demonstração vê sempre, mesmo depois de responder.
 */
export async function precisaResponderHotel(email: string): Promise<boolean> {
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return true;
  if (SO_PAINEL_DEMONSTRACAO) return false;

  const { rows } = await db().query<{ precisa: boolean }>(
    `select
       exists(select 1 from evento_inscricoes where email = $1)
       and not exists(select 1 from respostas_hotel where email = $1)
       as precisa`,
    [email],
  );
  return rows[0]?.precisa ?? false;
}

export type TipoQuarto = "single" | "duplo";

export interface RespostaHotelDados {
  querQuarto: boolean;
  tipoQuarto: TipoQuarto | null;
  noiteAnterior: boolean;
  noiteSeguinte: boolean;
  temCriancas: boolean;
  idadesCriancas: string | null;
}

/**
 * Upsert pelo email — responder outra vez substitui a resposta anterior.
 * Quem não quer quarto não precisa de mais nada — gravam-se sempre os
 * valores em branco nesse caso, mesmo que o pedido traga outra coisa, para
 * a listagem do admin nunca mostrar dados de quem disse que não quer
 * ficar. As idades só se gravam quando há mesmo crianças marcadas.
 */
export async function guardarRespostaHotel(email: string, dados: RespostaHotelDados): Promise<void> {
  const tipoQuarto = dados.querQuarto ? dados.tipoQuarto : null;
  const noiteAnterior = dados.querQuarto ? dados.noiteAnterior : false;
  const noiteSeguinte = dados.querQuarto ? dados.noiteSeguinte : false;
  const temCriancas = dados.querQuarto ? dados.temCriancas : false;
  const idadesCriancas = temCriancas ? dados.idadesCriancas?.trim() || null : null;

  await db().query(
    `insert into respostas_hotel
       (email, quer_quarto, tipo_quarto, noite_anterior, noite_seguinte, tem_criancas, idades_criancas)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (email) do update
       set quer_quarto = excluded.quer_quarto,
           tipo_quarto = excluded.tipo_quarto,
           noite_anterior = excluded.noite_anterior,
           noite_seguinte = excluded.noite_seguinte,
           tem_criancas = excluded.tem_criancas,
           idades_criancas = excluded.idades_criancas,
           criado_em = now()`,
    [email, dados.querQuarto, tipoQuarto, noiteAnterior, noiteSeguinte, temCriancas, idadesCriancas],
  );
}

export interface RespostaHotelAdmin {
  nome: string;
  email: string;
  querQuarto: boolean;
  tipoQuarto: TipoQuarto | null;
  noiteAnterior: boolean;
  noiteSeguinte: boolean;
  temCriancas: boolean;
  idadesCriancas: string | null;
  criadoEm: Date;
}

export async function listarRespostasHotel(): Promise<RespostaHotelAdmin[]> {
  const { rows } = await db().query<{
    nome: string | null;
    email: string;
    quer_quarto: boolean;
    tipo_quarto: TipoQuarto | null;
    noite_anterior: boolean;
    noite_seguinte: boolean;
    tem_criancas: boolean;
    idades_criancas: string | null;
    criado_em: Date;
  }>(
    `select rh.email, rh.quer_quarto, rh.tipo_quarto, rh.noite_anterior, rh.noite_seguinte,
            rh.tem_criancas, rh.idades_criancas, rh.criado_em,
            (select max(ei.nome) from evento_inscricoes ei where ei.email = rh.email) as nome
     from respostas_hotel rh
     order by rh.criado_em desc`,
  );
  return rows.map((r) => ({
    nome: r.nome ?? r.email,
    email: r.email,
    querQuarto: r.quer_quarto,
    tipoQuarto: r.tipo_quarto,
    noiteAnterior: r.noite_anterior,
    noiteSeguinte: r.noite_seguinte,
    temCriancas: r.tem_criancas,
    idadesCriancas: r.idades_criancas,
    criadoEm: r.criado_em,
  }));
}

/** Uma célula segura para CSV: aspas duplicadas e o campo todo entre aspas. */
function celula(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/**
 * O Excel não sabe o que é um fuso horário — grava o número tal como
 * recebe e mostra-o assim, sem converter nada. `criadoEm` vem em UTC; sem
 * isto, a hora no ficheiro ficava uma hora (ou duas, no verão) à frente
 * da que aparece em todo o resto do painel, que já mostra tudo em hora de
 * Lisboa (ver formatarData nesta página). O truque é escrever os números
 * da hora de Lisboa como se fossem UTC — o Excel mostra-os tal e qual.
 */
function paraExcelHoraLisboa(data: Date): Date {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const valor = (tipo: string): number => Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  return new Date(
    Date.UTC(valor("year"), valor("month") - 1, valor("day"), valor("hour") % 24, valor("minute")),
  );
}

/**
 * Todas as respostas numa tabela de texto — para se descarregar ou copiar
 * de uma vez em /admin/hotel-respostas. Existe porque a base de dados não
 * é acessível de fora do site: sem isto, a única forma de levar estas
 * respostas para outro lado (o hotel, uma folha de cálculo, uma conversa)
 * era copiar linha a linha do ecrã.
 *
 * Separador `;` e BOM à frente porque é o que o Excel em português abre
 * direito — com `,` mete tudo numa coluna só.
 */
export function csvRespostasHotel(respostas: RespostaHotelAdmin[]): string {
  const cabecalho = [
    "Nome",
    "Email",
    "Quer quarto",
    "Tipo de quarto",
    "Noite 13-14",
    "Noite 14-15",
    "Total de noites",
    "Leva crianças",
    "Idades das crianças",
    "Respondido em",
  ];

  const linhas = respostas.map((r) => [
    r.nome,
    r.email,
    r.querQuarto ? "Sim" : "Não",
    !r.querQuarto ? "" : r.tipoQuarto === "single" ? "Single" : r.tipoQuarto === "duplo" ? "Duplo/Twin" : "",
    r.querQuarto && r.noiteAnterior ? "Sim" : "Não",
    r.querQuarto && r.noiteSeguinte ? "Sim" : "Não",
    r.querQuarto ? String((r.noiteAnterior ? 1 : 0) + (r.noiteSeguinte ? 1 : 0)) : "0",
    r.querQuarto && r.temCriancas ? "Sim" : "Não",
    r.querQuarto && r.temCriancas ? (r.idadesCriancas ?? "") : "",
    r.criadoEm.toISOString(),
  ]);

  return `﻿${[cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\n")}`;
}

/**
 * A mesma tabela do CSV, mas como ficheiro Excel a sério — uma Tabela
 * nativa (não só células com cor), com cabeçalho fixo e largura das
 * colunas ajustada ao conteúdo. Pedido depois do CSV: aberto num CSV, o
 * Excel mostra tudo espremido numa grelha genérica; como Tabela, já
 * chega com os filtros e o destaque de linhas a alternar prontos.
 */
export async function gerarExcelRespostasHotel(respostas: RespostaHotelAdmin[]): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const livro = new ExcelJS.Workbook();
  livro.creator = "Viajar é Viver";
  livro.created = new Date();

  const folha = livro.addWorksheet("Quartos do hotel", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const colunas = [
    { nome: "Nome", largura: 26 },
    { nome: "Email", largura: 30 },
    { nome: "Quer quarto", largura: 12 },
    { nome: "Tipo de quarto", largura: 15 },
    { nome: "Noite 13-14", largura: 12 },
    { nome: "Noite 14-15", largura: 12 },
    { nome: "Total de noites", largura: 14 },
    { nome: "Leva crianças", largura: 13 },
    { nome: "Idades das crianças", largura: 20 },
    { nome: "Respondido em", largura: 18 },
  ];
  folha.columns = colunas.map((c) => ({ width: c.largura }));

  const linhas = respostas.map((r) => [
    r.nome,
    r.email,
    r.querQuarto ? "Sim" : "Não",
    !r.querQuarto ? "" : r.tipoQuarto === "single" ? "Single" : r.tipoQuarto === "duplo" ? "Duplo/Twin" : "",
    r.querQuarto && r.noiteAnterior ? "Sim" : "Não",
    r.querQuarto && r.noiteSeguinte ? "Sim" : "Não",
    r.querQuarto ? (r.noiteAnterior ? 1 : 0) + (r.noiteSeguinte ? 1 : 0) : 0,
    r.querQuarto && r.temCriancas ? "Sim" : "Não",
    r.querQuarto && r.temCriancas ? (r.idadesCriancas ?? "") : "",
    paraExcelHoraLisboa(r.criadoEm),
  ]);

  folha.addTable({
    name: "QuartosHotel",
    ref: "A1",
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((c) => ({ name: c.nome, filterButton: true })),
    rows: linhas,
  });

  // A coluna de data fica com formato de data a sério em vez de texto —
  // addTable não deixa formatar por coluna, por isso aplica-se a seguir.
  const colunaData = folha.getColumn(colunas.length);
  colunaData.numFmt = "dd/mm/yyyy hh:mm";

  const arrayBuffer = await livro.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface InscritoSemRespostaHotel {
  nome: string;
  email: string;
}

/** Quem está inscrito no evento e ainda não respondeu — para lembrares. */
export async function listarInscritosSemRespostaHotel(): Promise<InscritoSemRespostaHotel[]> {
  const { rows } = await db().query<{ nome: string; email: string }>(
    `select distinct on (ei.email) ei.nome, ei.email
     from evento_inscricoes ei
     where not exists (select 1 from respostas_hotel rh where rh.email = ei.email)
     order by ei.email, ei.criado_em desc`,
  );
  return rows;
}

/** O texto do aviso — único sítio a mexer para o mudar. */
function mensagemAvisoHotel(nome: string, base: string): { assunto: string; corpoTexto: string } {
  return {
    assunto: "🏨 Teambuilding — precisas de quarto no hotel?",
    corpoTexto:
      `Olá${nome ? ` ${nome}` : ""},\n\n` +
      `Para o Teambuilding de 14 de novembro reservámos o Aurea Fátima Hotel Congress & Spa — ` +
      `Single a 60€/noite e Duplo/Twin a 72€/noite, com pequeno-almoço incluído.\n\n` +
      `Precisamos de saber quem quer quarto, para acertar a reserva com o hotel. Responde ao ` +
      `questionário rápido no teu painel:\n${base}/consultor\n\n` +
      `Até dia 14!\nEquipa Viajar é Viver`,
  };
}

export interface ResultadoNotificacaoHotel {
  enviados: number;
  falhas: { email: string; erro: string }[];
}

/**
 * Aviso manual, disparado por um clique no admin. Com `teste`, vai só ao
 * painel de demonstração. Sem `teste`, vai a quem está inscrito no evento e
 * ainda não respondeu, e só depois de o questionário estar publicado (ver
 * questionarioHotelPublicado). Uma falha a avisar alguém não trava as
 * restantes.
 */
export async function notificarInscritosHotel(
  sender: EmailSender,
  teste: boolean,
): Promise<ResultadoNotificacaoHotel> {
  if (!teste && !questionarioHotelPublicado()) {
    throw new Error(
      "o questionário ainda só está no painel de demonstração — publica-o antes de avisar os inscritos",
    );
  }

  const destinatarios = teste
    ? [{ email: EMAIL_PAINEL_DEMONSTRACAO, nome: await nomeDe(EMAIL_PAINEL_DEMONSTRACAO) }]
    : await listarInscritosSemRespostaHotel();

  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  const lista = configActiveCampaign()?.listaConsultores;
  const falhas: { email: string; erro: string }[] = [];
  let enviados = 0;

  for (const d of destinatarios) {
    // A notificação sai por sua conta, antes e fora do try do email: quem
    // tem a app instalada tem de ser avisado mesmo que o email falhe — e
    // falha mesmo, por exemplo a quem se descansou da lista da
    // ActiveCampaign (ver Mensagem.listaActiveCampaign). Antes ficava
    // dentro do try a seguir ao envio, portanto um email falhado levava
    // atrás a notificação dessa pessoa, que era o pior dos dois mundos:
    // não recebia nada por lado nenhum.
    await notificarPush(d.email, {
      titulo: "Teambuilding — precisas de quarto?",
      corpo: "Diz-nos se precisas de quarto no hotel — questionário rápido no teu painel.",
      url: "/consultor/hotel",
    }).catch((erroPush) => console.error(`falha ao enviar push a ${d.email}:`, erroPush));

    try {
      await sender.enviar({
        destinatario: d.email,
        ...mensagemAvisoHotel(d.nome, base),
        listaActiveCampaign: lista,
      });
      enviados += 1;
    } catch (erro) {
      falhas.push({ email: d.email, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  return { enviados, falhas };
}

/** O nome da pessoa, como aparece na inscrição do evento ou no CSV da equipa. */
async function nomeDe(email: string): Promise<string> {
  const { rows } = await db().query<{ nome: string | null }>(
    `select coalesce(
              (select max(ei.nome) from evento_inscricoes ei where ei.email = $1),
              (select ea.nome from equipa_afiliados ea where ea.email = $1)
            ) as nome`,
    [email],
  );
  return rows[0]?.nome ?? "";
}
