import { configActiveCampaign } from "./activecampaign";
import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import type { EmailSender } from "./email";
import { notificarPush } from "./push";
import { TROFEUS_JA_TENHO, TROFEUS_QUERO } from "./trofeus-lista";

export { chaveDoPatamar, TROFEUS_JA_TENHO, TROFEUS_QUERO } from "./trofeus-lista";
export type { Trofeu } from "./trofeus-lista";

/**
 * Enquanto for `true`, o questionário só aparece no painel de demonstração
 * (zmrlopes@gmail.com). Passar a `false` publica-o para os consultores
 * inscritos no evento — é o único sítio a mexer para o pôr no ar.
 */
const SO_PAINEL_DEMONSTRACAO = false;

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
  /** O patamar atual, vindo do CSV da equipa — para detetar quem pediu troféus a mais. */
  nivel: string | null;
  criadoEm: Date;
}

/**
 * Traz o `nivel` (patamar) de equipa_afiliados a par de cada resposta — só
 * se tem direito ao troféu do próprio patamar, não aos de patamares acima
 * (ver chaveDoPatamar em trofeus-lista.ts). Sem isto aqui, um engano como
 * alguém marcar "quero" em todos os patamares fica invisível na tabela do
 * admin até alguém reparar à mão.
 */
export async function listarRespostasTrofeus(): Promise<RespostaTrofeusAdmin[]> {
  const { rows } = await db().query<{
    nome: string | null;
    email: string;
    quero: string[];
    ja_tenho: string[];
    nivel: string | null;
    criado_em: Date;
  }>(
    `select rt.email, rt.quero, rt.ja_tenho, rt.criado_em,
            (select max(ei.nome) from evento_inscricoes ei where ei.email = rt.email) as nome,
            (select ea.nivel from equipa_afiliados ea where ea.email = rt.email) as nivel
     from respostas_trofeus rt
     order by rt.criado_em desc`,
  );
  return rows.map((r) => ({
    nome: r.nome ?? r.email,
    email: r.email,
    quero: r.quero,
    jaTenho: r.ja_tenho,
    nivel: r.nivel,
    criadoEm: r.criado_em,
  }));
}

/**
 * Correção manual pelo admin — a mesma regra do upsert do questionário,
 * mas sem a exigência de estar inscrito no evento (a resposta já existe;
 * isto só a corrige). Usada em /admin/trofeus-respostas quando alguém se
 * enganou a marcar troféus que não são do seu patamar.
 */
export async function corrigirRespostaTrofeus(email: string, quero: string[], jaTenho: string[]): Promise<void> {
  const { rowCount } = await db().query(`select 1 from respostas_trofeus where email = $1`, [email]);
  if (!rowCount) throw new Error("esta pessoa ainda não respondeu ao questionário — nada para corrigir");
  await guardarRespostaTrofeus(email, quero, jaTenho);
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

/** O texto do aviso — único sítio a mexer para o mudar. */
function mensagemAvisoTrofeus(nome: string, base: string): { assunto: string; corpoTexto: string } {
  return {
    assunto: "🏆 Troféus do Teambuilding — diz-nos quais queres",
    corpoTexto:
      `Olá${nome ? ` ${nome}` : ""},\n\n` +
      `No Teambuilding de 14 de novembro vamos entregar os troféus de patamar. Precisamos da tua ajuda ` +
      `para acertar exactamente quantos mandar fazer.\n\n` +
      `Preparámos um questionário rápido (1 minuto) no teu painel, onde marcas:\n` +
      `- que troféus ainda te faltam e queres receber nesse dia\n` +
      `- que troféus já tens em casa\n\n` +
      `Assim ninguém fica sem o seu.\n\n` +
      `Responde ao questionário aqui:\n${base}/consultor\n\n` +
      `Até dia 14!\nEquipa Viajar é Viver`,
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
    // Fora do try do email: se o email falhar — acontece a quem se
    // descansou da lista da ActiveCampaign — quem tem a app instalada
    // ficava sem aviso nenhum, que é exatamente o contrário do que a
    // notificação serve.
    await notificarPush(d.email, {
      titulo: "Troféus do Teambuilding",
      corpo: "Diz-nos quais queres receber e quais já tens — questionário rápido no teu painel.",
      url: "/consultor/trofeus",
    }).catch((erroPush) => console.error(`falha ao enviar push a ${d.email}:`, erroPush));

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
