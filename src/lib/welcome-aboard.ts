import { db } from "./db";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { TITULO_WELCOME_ABOARD } from "./webinars";

/**
 * Duas sessões (quartas-feiras) obrigatórias para quem está no negócio há
 * pouco tempo. Até 20 de setembro de 2026 eram geridas à mão — sem forma
 * automática de saber quem assistiu de verdade a um link de Calendly.
 * Agora que o Patrick sincroniza "Welcome Aboard" como sessão normal da
 * sala partilhada (mesmo mecanismo das outras formações, com presença
 * real do Zoom — ver TITULO_WELCOME_ABOARD em webinars.ts), passa a dar
 * para confirmar a sério quem esteve lá.
 */
const MESES_ELEGIVEL = 3;

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
 * Quantas sessões "Welcome Aboard" distintas este email assistiu mesmo
 * (presença confirmada pelo Zoom, não só inscrição) — 0, 1 ou mais.
 * Não há título diferente para "1ª" e "2ª"; é a própria contagem
 * cronológica que define isso: a primeira sessão que a pessoa assistiu é
 * a dela "1ª", a segunda distinta é a "2ª" — por construção nunca dá para
 * ter a 2ª sem a 1ª, o que já resolve sozinho a exigência de ordem.
 */
async function contarPresencasWelcomeAboard(email: string): Promise<number> {
  const { rows } = await db().query<{ total: string }>(
    `select count(distinct r.webinar_id) as total
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.email = $1
       and r.cancelada_em is null
       and r.presenca = 'attended'
       and w.tipo = 'sincronizado'
       and w.titulo = $2`,
    [email, TITULO_WELCOME_ABOARD],
  );
  return Number(rows[0]?.total ?? 0);
}

/**
 * Todas as presenças reais (por email), numa só consulta — usada pelas
 * listagens (admin, equipa) para não fazer uma consulta por pessoa.
 */
async function mapaPresencasWelcomeAboard(): Promise<Map<string, number>> {
  const { rows } = await db().query<{ email: string; total: string }>(
    `select r.email, count(distinct r.webinar_id) as total
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.cancelada_em is null
       and r.presenca = 'attended'
       and w.tipo = 'sincronizado'
       and w.titulo = $1
     group by r.email`,
    [TITULO_WELCOME_ABOARD],
  );
  return new Map(rows.map((r) => [r.email, Number(r.total)]));
}

/**
 * Combina o histórico manual antigo (guardado por quem já tinha marcado
 * "feito" antes desta mudança — fica sempre a contar, por pedido
 * explícito, para não parecer que essas pessoas regrediram, e continua a
 * servir de correção manual daqui em diante, para quando a presença do
 * Zoom falhar a registar alguém) com a contagem real de presenças.
 */
function combinarComHistoricoManual(
  manual1: boolean,
  manual2: boolean,
  presencasReais: number,
): EstadoWelcomeAboard {
  return {
    sessao1Concluida: manual1 || presencasReais >= 1,
    sessao2Concluida: manual2 || presencasReais >= 2,
  };
}

/**
 * null = não mostrar o aviso (não é elegível, ou já terminou as duas
 * sessões). Uma vez começado (sessão 1 concluída), continua elegível até
 * terminar a sessão 2, mesmo que os 3 meses já tenham passado entretanto.
 * O painel de demonstração mostra-se sempre, mesmo com as duas
 * concluídas — é o que permite continuar a ver e testar o cartão.
 */
export async function obterElegibilidadeWelcomeAboard(email: string): Promise<EstadoWelcomeAboard | null> {
  const ehDemo = email === EMAIL_PAINEL_DEMONSTRACAO;

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
  if (!ehDemo && !r) return null;

  const presencasReais = await contarPresencasWelcomeAboard(email);
  const estado = combinarComHistoricoManual(
    r?.welcome_aboard_sessao1 ?? false,
    r?.welcome_aboard_sessao2 ?? false,
    presencasReais,
  );

  if (ehDemo) return estado;
  if (estado.sessao2Concluida) return null;
  if (!dentroDoPrazo(r!.data_registo) && !estado.sessao1Concluida) return null;

  return estado;
}

export interface PessoaWelcomeAboard {
  email: string;
  nome: string;
  dataRegisto: Date | null;
  sessao1Concluida: boolean;
  sessao2Concluida: boolean;
}

/**
 * Para a gestão em /admin/welcome-aboard — mesmo critério de
 * elegibilidade do aviso pessoal (dentro do prazo, ou já começou por
 * marcação manual ou presença real), com as duas sessões já cruzadas com
 * a presença real. Sem isto, a lista ficava presa aos campos manuais —
 * que ninguém mais atualiza, agora que a confirmação é automática — e
 * parecia que ninguém andava a terminar nada.
 */
export async function listarWelcomeAboard(): Promise<PessoaWelcomeAboard[]> {
  const [{ rows }, presencas] = await Promise.all([
    db().query<{
      email: string;
      nome: string;
      data_registo: Date | null;
      welcome_aboard_sessao1: boolean;
      welcome_aboard_sessao2: boolean;
    }>(
      `select email, nome, data_registo, welcome_aboard_sessao1, welcome_aboard_sessao2
       from equipa_afiliados
       where data_registo >= now() - interval '${MESES_ELEGIVEL} months'
          or welcome_aboard_sessao1 = true`,
    ),
    mapaPresencasWelcomeAboard(),
  ]);

  return rows
    .map((r) => ({
      email: r.email,
      nome: r.nome,
      dataRegisto: r.data_registo,
      ...combinarComHistoricoManual(
        r.welcome_aboard_sessao1,
        r.welcome_aboard_sessao2,
        presencas.get(r.email) ?? 0,
      ),
    }))
    .filter((p) => !p.sessao2Concluida)
    .sort((a, b) => (b.dataRegisto?.getTime() ?? 0) - (a.dataRegisto?.getTime() ?? 0));
}

export interface MembroEquipaWelcomeAboard {
  nome: string;
  email: string;
  dataRegisto: Date | null;
  sessao1Concluida: boolean;
  sessao2Concluida: boolean;
}

/**
 * Os consultores da equipa (toda a descendência, não só os diretos) que
 * entraram há menos de 3 meses, para o líder ver quem já fez cada sessão,
 * já com a presença real cruzada. Ao contrário do aviso pessoal, aqui não
 * se escondem os que já terminaram as duas — o líder quer justamente ver
 * quem está e quem não está feito.
 */
export async function listarWelcomeAboardDaEquipa(
  emailLider: string,
): Promise<MembroEquipaWelcomeAboard[]> {
  const [{ rows }, presencas] = await Promise.all([
    db().query<{
      nome: string;
      email: string;
      data_registo: Date | null;
      welcome_aboard_sessao1: boolean;
      welcome_aboard_sessao2: boolean;
    }>(
      `with recursive descendentes as (
         select email from equipa_afiliados where upline_email = $1
         union all
         select ea.email from equipa_afiliados ea
         join descendentes d on ea.upline_email = d.email
       )
       select ea.nome, ea.email, ea.data_registo,
              ea.welcome_aboard_sessao1, ea.welcome_aboard_sessao2
       from equipa_afiliados ea
       join descendentes d on d.email = ea.email
       where ea.data_registo >= now() - interval '${MESES_ELEGIVEL} months'
       order by ea.data_registo desc`,
      [emailLider],
    ),
    mapaPresencasWelcomeAboard(),
  ]);
  return rows.map((r) => ({
    nome: r.nome,
    email: r.email,
    dataRegisto: r.data_registo,
    ...combinarComHistoricoManual(
      r.welcome_aboard_sessao1,
      r.welcome_aboard_sessao2,
      presencas.get(r.email) ?? 0,
    ),
  }));
}

/**
 * Correção manual — para quando a presença do Zoom falhar a registar
 * alguém que esteve mesmo lá. Continua a existir por isso, mesmo sem
 * consultor nenhum a usar diretamente: só o admin, em /admin/welcome-aboard.
 */
export async function definirSessaoWelcomeAboard(
  email: string,
  sessao: 1 | 2,
  concluida: boolean,
): Promise<void> {
  const coluna = sessao === 1 ? "welcome_aboard_sessao1" : "welcome_aboard_sessao2";
  await db().query(`update equipa_afiliados set ${coluna} = $2 where email = $1`, [email, concluida]);
}
