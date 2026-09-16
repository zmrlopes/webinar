import { configActiveCampaign } from "./activecampaign";
import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import type { EmailSender } from "./email";
import { TROFEUS_JA_TENHO, TROFEUS_QUERO } from "./trofeus-lista";

export { TROFEUS_JA_TENHO, TROFEUS_QUERO } from "./trofeus-lista";
export type { Trofeu } from "./trofeus-lista";

/**
 * Enquanto for `true`, o questionário só aparece no painel de demonstração
 * (zmrlopes@gmail.com). Passar a `false` publica-o para os consultores
 * inscritos no evento — é o único sítio a mexer para o pôr no ar.
 */
const SO_PAINEL_DEMONSTRACAO = true;

const CHAVES_QUERO = new Set(TROFEUS_QUERO.map((t) => t.chave));
const CHAVES_JA_TENHO = new Set(TROFEUS_JA_TENHO.map((t) => t.chave));

/**
 * Quem vê o aviso: só quem está inscrito no evento (evento_inscricoes) e
 * ainda não respondeu. O painel de demonstração vê sempre, mesmo depois de
 * responder — é o que permite continuar a testar o formulário sem ficar
 * sem forma de lá voltar.
 */
/** O questionário já está no ar para os inscritos, ou ainda só na demonstração? */
export function questionarioTrofeusPublicado(): boolean {
  return !SO_PAINEL_DEMONSTRACAO;
}

export async function precisaResponderTrofeus(email: string): Promise<boolean> {
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return true;
  if (SO_PAINEL_DEMONSTRACAO) return false;

  const { rows } = await db().query<{ precisa: boolean }>(
    `select
       exists(select 1 from evento_inscricoes where email = $1)
       and not exists(select 1 from respostas_trofeus where email = $1)
       as precisa`,
    [email],
  );
  return rows[0]?.precisa ?? false;
}

/** Descarta chaves que não existam na lista — o que chega do browser não é de confiança. */
function limpar(escolhas: string[], validas: Set<string>): string[] {
  return [...new Set(escolhas.filter((c) => validas.has(c)))];
}

/**
 * Upsert pelo email: responder outra vez substitui a resposta anterior em
 * vez de duplicar. Aceita listas vazias — quem não quer nenhum troféu e
 * não tem nenhum também tem de conseguir dizê-lo, e essa é uma resposta
 * tão válida como outra qualquer.
 */
export async function guardarRespostaTrofeus(
  email: string,
  quero: string[],
  jaTenho: string[],
): Promise<void> {
  await db().query(
    `insert into respostas_trofeus (email, quero, ja_tenho)
     values ($1, $2, $3)
     on conflict (email) do update
       set quero = excluded.quero, ja_tenho = excluded.ja_tenho, criado_em = now()`,
    [email, limpar(quero, CHAVES_QUERO), limpar(jaTenho, CHAVES_JA_TENHO)],
  );
}

export interface RespostaTrofeusAdmin {
  nome: string;
  email: string;
  quero: string[];
  jaTenho: string[];
  criadoEm: Date;
}

export async function listarRespostasTrofeus(): Promise<RespostaTrofeusAdmin[]> {
  const { rows } = await db().query<{
    nome: string | null;
    email: string;
    quero: string[];
    ja_tenho: string[];
    criado_em: Date;
  }>(
    `select rt.email, rt.quero, rt.ja_tenho, rt.criado_em,
            (select max(ei.nome) from evento_inscricoes ei where ei.email = rt.email) as nome
     from respostas_trofeus rt
     order by rt.criado_em desc`,
  );
  return rows.map((r) => ({
    nome: r.nome ?? r.email,
    email: r.email,
    quero: r.quero,
    jaTenho: r.ja_tenho,
    criadoEm: r.criado_em,
  }));
}

export interface ContagemTrofeu {
  chave: string;
  rotulo: string;
  pedidos: number;
  jaTem: number;
}

/**
 * Quantos troféus de cada é preciso mandar fazer. `jaTem` fica ao lado de
 * propósito: um número de pedidos alto num troféu que quase toda a gente
 * já tem é sinal de engano na resposta, e mais vale ver isso antes de
 * encomendar.
 */
export function contarTrofeus(respostas: RespostaTrofeusAdmin[]): ContagemTrofeu[] {
  return TROFEUS_JA_TENHO.map((t) => ({
    chave: t.chave,
    rotulo: t.rotulo,
    pedidos: respostas.filter((r) => r.quero.includes(t.chave)).length,
    jaTem: respostas.filter((r) => r.jaTenho.includes(t.chave)).length,
  }));
}

export interface InscritoSemRespostaTrofeus {
  nome: string;
  email: string;
}

/** Quem está inscrito no evento e ainda não respondeu — para lembrares. */
export async function listarInscritosSemRespostaTrofeus(): Promise<InscritoSemRespostaTrofeus[]> {
  const { rows } = await db().query<{ nome: string; email: string }>(
    `select distinct on (ei.email) ei.nome, ei.email
     from evento_inscricoes ei
     where not exists (select 1 from respostas_trofeus rt where rt.email = ei.email)
     order by ei.email, ei.criado_em desc`,
  );
  return rows;
}

/**
 * O texto do aviso. Por agora é uma mensagem de teste — antes de isto sair
 * para os 76 inscritos há uma mensagem definitiva a escrever, e é este o
 * único sítio a mexer. `notificarInscritosTrofeus` recusa-se a enviar a
 * toda a gente enquanto o questionário estiver só na demonstração, o que
 * também serve de travão a mandar este texto de teste por engano.
 */
function mensagemAvisoTrofeus(nome: string, base: string): { assunto: string; corpoTexto: string } {
  return {
    assunto: "Teste — questionário dos troféus",
    corpoTexto:
      `Olá${nome ? ` ${nome}` : ""},\n\n` +
      `Mensagem de teste para o questionário dos troféus do Teambuilding de 14 de novembro.\n\n` +
      `O questionário está no teu painel, na secção "Avisos":\n${base}/consultor`,
  };
}

export interface ResultadoNotificacaoTrofeus {
  enviados: number;
  falhas: { email: string; erro: string }[];
}

/**
 * Aviso manual, disparado por um clique no admin. Com `teste`, vai só ao
 * painel de demonstração — é como se confirma que o email sai mesmo antes
 * de o mandar a 76 pessoas. Sem `teste`, vai a quem está inscrito no
 * evento e ainda não respondeu, e só depois de o questionário estar
 * publicado (ver questionarioTrofeusPublicado).
 *
 * Cada email passa pela lista dos consultores na ActiveCampaign: sem isso,
 * quem se descansou de uma lista antiga não recebe nada e nós ficávamos a
 * contar o envio como bem-sucedido (ver Mensagem.listaActiveCampaign).
 * Uma falha a avisar alguém não trava as restantes.
 */
export async function notificarInscritosTrofeus(
  sender: EmailSender,
  teste: boolean,
): Promise<ResultadoNotificacaoTrofeus> {
  if (!teste && !questionarioTrofeusPublicado()) {
    throw new Error(
      "o questionário ainda só está no painel de demonstração — publica-o antes de avisar os inscritos",
    );
  }

  const destinatarios = teste
    ? [{ email: EMAIL_PAINEL_DEMONSTRACAO, nome: await nomeDe(EMAIL_PAINEL_DEMONSTRACAO) }]
    : await listarInscritosSemRespostaTrofeus();

  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  const lista = configActiveCampaign()?.listaConsultores;
  const falhas: { email: string; erro: string }[] = [];
  let enviados = 0;

  for (const d of destinatarios) {
    try {
      await sender.enviar({
        destinatario: d.email,
        ...mensagemAvisoTrofeus(d.nome, base),
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
