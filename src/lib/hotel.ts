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
const SO_PAINEL_DEMONSTRACAO = true;

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
}

/**
 * Upsert pelo email — responder outra vez substitui a resposta anterior.
 * Quem não quer quarto não precisa de tipo nem de noites — gravam-se
 * sempre a null/false nesse caso, mesmo que o pedido traga outra coisa,
 * para a listagem do admin nunca mostrar um tipo de quarto para quem
 * disse que não quer ficar.
 */
export async function guardarRespostaHotel(email: string, dados: RespostaHotelDados): Promise<void> {
  const tipoQuarto = dados.querQuarto ? dados.tipoQuarto : null;
  const noiteAnterior = dados.querQuarto ? dados.noiteAnterior : false;
  const noiteSeguinte = dados.querQuarto ? dados.noiteSeguinte : false;

  await db().query(
    `insert into respostas_hotel (email, quer_quarto, tipo_quarto, noite_anterior, noite_seguinte)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
       set quer_quarto = excluded.quer_quarto,
           tipo_quarto = excluded.tipo_quarto,
           noite_anterior = excluded.noite_anterior,
           noite_seguinte = excluded.noite_seguinte,
           criado_em = now()`,
    [email, dados.querQuarto, tipoQuarto, noiteAnterior, noiteSeguinte],
  );
}

export interface RespostaHotelAdmin {
  nome: string;
  email: string;
  querQuarto: boolean;
  tipoQuarto: TipoQuarto | null;
  noiteAnterior: boolean;
  noiteSeguinte: boolean;
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
    criado_em: Date;
  }>(
    `select rh.email, rh.quer_quarto, rh.tipo_quarto, rh.noite_anterior, rh.noite_seguinte, rh.criado_em,
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
    criadoEm: r.criado_em,
  }));
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
    try {
      await sender.enviar({
        destinatario: d.email,
        ...mensagemAvisoHotel(d.nome, base),
        listaActiveCampaign: lista,
      });
      await notificarPush(d.email, {
        titulo: "Teambuilding — precisas de quarto?",
        corpo: "Diz-nos se precisas de quarto no hotel — questionário rápido no teu painel.",
        url: "/consultor/hotel",
      }).catch((erroPush) => console.error(`falha ao enviar push a ${d.email}:`, erroPush));
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
