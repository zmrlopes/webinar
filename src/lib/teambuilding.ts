import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import type { EmailSender } from "./email";

/**
 * Só faz sentido perguntar a quem se inscreveu no evento — evento_inscricoes
 * é a única fonte disso (ver src/lib/eventos.ts). Quem já respondeu não
 * volta a ver o aviso. Exceção: o painel de demonstração vê sempre, mesmo
 * sem estar inscrito (ver EMAIL_PAINEL_DEMONSTRACAO).
 */
export async function precisaResponderTeambuilding(email: string): Promise<boolean> {
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return true;

  const { rows } = await db().query<{ precisa: boolean }>(
    `select
       exists(select 1 from evento_inscricoes where email = $1)
       and not exists(select 1 from respostas_teambuilding where email = $1)
       as precisa`,
    [email],
  );
  return rows[0]?.precisa ?? false;
}

export interface RespostaTeambuildingDados {
  expectativa: string;
  formacoesDesejadas: string;
  duvidas: string;
  outros: string;
}

/**
 * Upsert pelo email — se por algum motivo a pessoa voltar a submeter
 * (ex: reabriu o formulário antes de a página atualizar), substitui a
 * resposta anterior em vez de duplicar ou rejeitar.
 */
export async function guardarRespostaTeambuilding(
  email: string,
  dados: RespostaTeambuildingDados,
): Promise<void> {
  await db().query(
    `insert into respostas_teambuilding (email, expectativa, formacoes_desejadas, duvidas, outros)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
       set expectativa = excluded.expectativa,
           formacoes_desejadas = excluded.formacoes_desejadas,
           duvidas = excluded.duvidas,
           outros = excluded.outros`,
    [email, dados.expectativa, dados.formacoesDesejadas, dados.duvidas || null, dados.outros || null],
  );
}

export interface RespostaTeambuildingAdmin {
  email: string;
  expectativa: string;
  formacoesDesejadas: string;
  duvidas: string | null;
  outros: string | null;
  criadoEm: Date;
}

export async function listarRespostasTeambuilding(): Promise<RespostaTeambuildingAdmin[]> {
  const { rows } = await db().query<{
    email: string;
    expectativa: string;
    formacoes_desejadas: string;
    duvidas: string | null;
    outros: string | null;
    criado_em: Date;
  }>(`select email, expectativa, formacoes_desejadas, duvidas, outros, criado_em
      from respostas_teambuilding
      order by criado_em desc`);
  return rows.map((r) => ({
    email: r.email,
    expectativa: r.expectativa,
    formacoesDesejadas: r.formacoes_desejadas,
    duvidas: r.duvidas,
    outros: r.outros,
    criadoEm: r.criado_em,
  }));
}

export interface InscritoSemResposta {
  nome: string;
  email: string;
}

/** Quem se inscreveu no evento mas ainda não respondeu — para lembrares. */
export async function listarInscritosSemResposta(): Promise<InscritoSemResposta[]> {
  const { rows } = await db().query<{ nome: string; email: string }>(
    `select distinct on (ei.email) ei.nome, ei.email
     from evento_inscricoes ei
     where not exists (select 1 from respostas_teambuilding rt where rt.email = ei.email)
     order by ei.email, ei.criado_em desc`,
  );
  return rows;
}

export interface ResultadoNotificacaoTeambuilding {
  enviados: number;
  falhas: { email: string; erro: string }[];
}

/**
 * Lembrete manual, disparado por um clique no admin (não automático) —
 * avisa quem se inscreveu no Teambuilding e ainda não respondeu ao
 * formulário. Uma falha a notificar alguém não trava as restantes.
 */
export async function notificarInscritosSemResposta(
  sender: EmailSender,
): Promise<ResultadoNotificacaoTeambuilding> {
  const pendentes = await listarInscritosSemResposta();
  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  const falhas: { email: string; erro: string }[] = [];
  let enviados = 0;

  for (const p of pendentes) {
    try {
      await sender.enviar({
        destinatario: p.email,
        assunto: `Ajuda-nos a preparar o Teambuilding de 14 de novembro`,
        corpoTexto:
          `Olá ${p.nome},\n\n` +
          `Inscreveste-te no Teambuilding de 14 de novembro — ainda não respondeste ao formulário rápido ` +
          `(4 perguntas) sobre o que esperas do dia e que formações gostavas de ver.\n\n` +
          `Entra no teu painel e responde por lá (secção "Avisos"):\n${base}/consultor`,
      });
      enviados += 1;
    } catch (erro) {
      falhas.push({ email: p.email, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  return { enviados, falhas };
}

export interface InscritoFaturacao {
  nome: string;
  email: string;
  nivel: string | null;
  vendas: number | null;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
}

/**
 * Um por email inscrito no Teambuilding, com o patamar e o volume de
 * faturação própria vindos de equipa_afiliados (coluna "sales" do CSV da
 * plataforma de afiliados — ver src/lib/equipa-import.ts). `nivel`/`vendas`
 * ficam a null se o email não estiver em equipa_afiliados, ou se o CSV
 * ainda não tiver sido reimportado depois desta coluna passar a ser lida.
 * Adultos/crianças são a soma de todas as inscrições desse email — uma
 * pessoa pode ter-se inscrito mais do que uma vez.
 */
export async function listarInscritosComFaturacao(): Promise<InscritoFaturacao[]> {
  const { rows } = await db().query<{
    nome: string;
    email: string;
    nivel: string | null;
    vendas: string | null;
    adultos: string;
    criancas_mais10: string;
    criancas_menos10: string;
  }>(
    `select ei.email, max(ei.nome) as nome, max(ea.nivel) as nivel, max(ea.vendas) as vendas,
            sum(ei.adultos) as adultos,
            sum(ei.criancas_mais10) as criancas_mais10,
            sum(ei.criancas_menos10) as criancas_menos10
     from evento_inscricoes ei
     left join equipa_afiliados ea on ea.email = ei.email
     group by ei.email`,
  );
  return rows.map((r) => ({
    nome: r.nome,
    email: r.email,
    nivel: r.nivel,
    vendas: r.vendas === null ? null : Number(r.vendas),
    adultos: Number(r.adultos),
    criancasMais10: Number(r.criancas_mais10),
    criancasMenos10: Number(r.criancas_menos10),
  }));
}

export interface InscritoEventoLider {
  nome: string;
  email: string;
}

/**
 * Quem está inscrito no Teambuilding, dentro da equipa (o próprio líder +
 * toda a descendência em equipa_afiliados) de um email de liderança — para
 * a página pública /equipa/[lider]/teambuilding, feita para partilhar um
 * link direto sem precisar da password do admin.
 */
export async function listarInscritosEventoPorLider(liderEmail: string): Promise<InscritoEventoLider[]> {
  const { rows } = await db().query<{ nome: string; email: string }>(
    `with recursive equipa as (
       select email from equipa_afiliados where email = $1
       union all
       select ea.email
       from equipa_afiliados ea
       join equipa eq on ea.upline_email = eq.email
     )
     select distinct on (ei.email) ei.nome, ei.email
     from evento_inscricoes ei
     where ei.email in (select email from equipa)
     order by ei.email, ei.criado_em desc`,
    [liderEmail],
  );
  return rows;
}
