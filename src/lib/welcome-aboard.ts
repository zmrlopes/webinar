import { db } from "./db";

/**
 * Temporário — até o Patrick construir isto do lado dele, por API. Duas
 * sessões semanais (quartas-feiras) obrigatórias para quem está no negócio
 * há pouco tempo, geridas à mão em /admin/welcome-aboard porque ainda não
 * há forma automática de confirmar quem assistiu no Calendly.
 */
export const LINK_WELCOME_ABOARD = "https://calendly.com/intravel/reuniao-welcome-aboard-1";
const MESES_ELEGIVEL = 3;

/** Painel de demonstração — mostra sempre tudo, para testes e apresentações. */
const EMAIL_DEMO = "zmrlopes@gmail.com";

function dentroDoPrazo(dataRegisto: Date | null): boolean {
  if (!dataRegisto) return false;
  const limite = new Date(dataRegisto);
  limite.setMonth(limite.getMonth() + MESES_ELEGIVEL);
  return limite.getTime() > Date.now();
}

export interface EstadoWelcomeAboard {
  sessao1Concluida: boolean;
  sessao2Concluida: boolean;
}

/**
 * null = não mostrar o aviso (não é elegível, ou já terminou as duas
 * sessões). Uma vez começado (sessão 1 concluída), continua elegível até
 * terminar a sessão 2, mesmo que os 3 meses já tenham passado entretanto.
 */
export async function obterElegibilidadeWelcomeAboard(email: string): Promise<EstadoWelcomeAboard | null> {
  if (email === EMAIL_DEMO) {
    return { sessao1Concluida: false, sessao2Concluida: false };
  }

  const { rows } = await db().query<{
    data_registo: Date | null;
    welcome_aboard_sessao1: boolean;
    welcome_aboard_sessao2: boolean;
  }>(
    `select data_registo, welcome_aboard_sessao1, welcome_aboard_sessao2
     from equipa_afiliados where email = $1`,
    [email],
  );
  const r = rows[0];
  if (!r || r.welcome_aboard_sessao2) return null;
  if (!dentroDoPrazo(r.data_registo) && !r.welcome_aboard_sessao1) return null;

  return { sessao1Concluida: r.welcome_aboard_sessao1, sessao2Concluida: r.welcome_aboard_sessao2 };
}

export interface PessoaWelcomeAboard {
  email: string;
  nome: string;
  dataRegisto: Date | null;
  sessao1Concluida: boolean;
  sessao2Concluida: boolean;
}

/** Para a gestão em /admin/welcome-aboard — mesmo critério de elegibilidade, mas para todos, não só uma pessoa. */
export async function listarWelcomeAboard(): Promise<PessoaWelcomeAboard[]> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    data_registo: Date | null;
    welcome_aboard_sessao1: boolean;
    welcome_aboard_sessao2: boolean;
  }>(
    `select email, nome, data_registo, welcome_aboard_sessao1, welcome_aboard_sessao2
     from equipa_afiliados
     where welcome_aboard_sessao2 = false
       and (welcome_aboard_sessao1 = true or data_registo >= now() - interval '${MESES_ELEGIVEL} months')
     order by data_registo desc nulls last`,
  );
  return rows.map((r) => ({
    email: r.email,
    nome: r.nome,
    dataRegisto: r.data_registo,
    sessao1Concluida: r.welcome_aboard_sessao1,
    sessao2Concluida: r.welcome_aboard_sessao2,
  }));
}

export async function definirSessaoWelcomeAboard(
  email: string,
  sessao: 1 | 2,
  concluida: boolean,
): Promise<void> {
  const coluna = sessao === 1 ? "welcome_aboard_sessao1" : "welcome_aboard_sessao2";
  await db().query(`update equipa_afiliados set ${coluna} = $2 where email = $1`, [email, concluida]);
}
