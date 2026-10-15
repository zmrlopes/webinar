import { db } from "./db";

export class ErroConsultorAdmin extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

export interface NovoConsultor {
  nome: string;
  email: string;
}

export function validarNovoConsultor(valor: unknown): NovoConsultor {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroConsultorAdmin("Indica o nome e o email do consultor.");
  const dados = valor as Record<string, unknown>;
  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  if (!nome || nome.length > 200) throw new ErroConsultorAdmin("Indica um nome com até 200 caracteres.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) throw new ErroConsultorAdmin("Indica um email válido.");
  return {nome, email};
}

/** Liberta o acesso usado por todas as áreas do consultor, sem alterar membros existentes. */
export async function adicionarConsultorAdmin(valor: unknown): Promise<NovoConsultor> {
  const consultor = validarNovoConsultor(valor);
  const { rows } = await db().query<NovoConsultor>(
    `insert into equipa_afiliados (email, nome, estado)
     values ($1, $2, 'ACTIVE')
     on conflict (email) do nothing
     returning nome, email`,
    [consultor.email, consultor.nome],
  );
  if (!rows[0]) throw new ErroConsultorAdmin("Este email já está registado na equipa e já pode entrar na área de consultor.", 409);
  return rows[0];
}

export interface ConsultorRegistado {
  email: string;
  nome: string;
  nivel: string | null;
  estado: string;
  uplineNome: string | null;
  /** Já gerou o link em /consultor — ou seja, já usou o painel. */
  temPainel: boolean;
}

/** Toda a gente com acesso à área de consultor (vem de equipa_afiliados, o gate de /api/consultor). */
export async function listarConsultoresRegistados(): Promise<ConsultorRegistado[]> {
  const { rows } = await db().query<{
    email: string; nome: string; nivel: string | null; estado: string; upline_nome: string | null; tem_painel: boolean;
  }>(
    `select ea.email, ea.nome, ea.nivel, ea.estado,
            (select u.nome from equipa_afiliados u where u.email = ea.upline_email) as upline_nome,
            exists(select 1 from links_consultor lc where lc.referencia_email = ea.email) as tem_painel
     from equipa_afiliados ea
     order by lower(ea.nome)`,
  );
  return rows.map((r) => ({
    email: r.email, nome: r.nome, nivel: r.nivel, estado: r.estado, uplineNome: r.upline_nome, temPainel: r.tem_painel,
  }));
}

/**
 * Tabelas onde o email do consultor é chave de algo que lhe pertence. Ao
 * mudar o email, o histórico vai com ele — leads, Core Rank, respostas aos
 * questionários, notificações. As que têm unicidade por email só mudam se o
 * novo email ainda não tiver o seu próprio registo (o do novo prevalece).
 */
const RENOMEAR_EMAIL: string[] = [
  `update equipa_afiliados set upline_email = $2 where upline_email = $1`,
  `update links_consultor set referencia_email = $2 where referencia_email = $1`,
  `update registrations set referencia_email = $2 where referencia_email = $1`,
  `update registrations r set email = $2 where r.email = $1
     and (r.cancelada_em is not null or not exists (
       select 1 from registrations o where o.webinar_id = r.webinar_id and o.email = $2 and o.cancelada_em is null))`,
  `update cliques_link set referencia_email = $2 where referencia_email = $1`,
  `update evento_inscricoes set email = $2 where email = $1`,
  `update respostas_teambuilding set email = $2 where email = $1 and not exists (select 1 from respostas_teambuilding where email = $2)`,
  `update respostas_trofeus set email = $2 where email = $1 and not exists (select 1 from respostas_trofeus where email = $2)`,
  `update respostas_hotel set email = $2 where email = $1 and not exists (select 1 from respostas_hotel where email = $2)`,
  `update push_subscriptions set email = $2 where email = $1`,
  `update formacoes_vistas v set email = $2 where v.email = $1
     and not exists (select 1 from formacoes_vistas o where o.email = $2 and o.aula_id = v.aula_id)`,
  `update questionario_participacoes p set email = $2 where p.email = $1
     and not exists (select 1 from questionario_participacoes o where o.email = $2 and o.slug = p.slug)`,
  `update notificacoes_equipa n set destinatario = $2 where n.destinatario = $1
     and not exists (select 1 from notificacoes_equipa o where o.destinatario = $2 and o.webinar_id = n.webinar_id)`,
  `update webinars set destinatarios_emails = array_replace(destinatarios_emails, $1, $2) where $1 = any(destinatarios_emails)`,
  // Core Rank, primeiros passos e Reservas guardam-se em dashboard_config com o email dentro da chave.
  `update dashboard_config d
     set chave = replace(d.chave, ':' || $1 || ':', ':' || $2 || ':'),
         valor = case when d.valor ? 'email' and d.valor->>'email' = $1
                      then jsonb_set(d.valor, '{email}', to_jsonb($2::text)) else d.valor end
   where strpos(d.chave, ':' || $1 || ':') > 0
     and not exists (select 1 from dashboard_config o where o.chave = replace(d.chave, ':' || $1 || ':', ':' || $2 || ':'))`,
];

export interface AlteracaoConsultor {
  emailAtual: string;
  nome: string;
  email: string;
}

export function validarAlteracaoConsultor(valor: unknown): AlteracaoConsultor {
  const dados = (valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {}) as Record<string, unknown>;
  const emailAtual = typeof dados.emailAtual === "string" ? dados.emailAtual.trim().toLowerCase() : "";
  if (!emailAtual) throw new ErroConsultorAdmin("Falta indicar que consultor estás a alterar.");
  return {emailAtual, ...validarNovoConsultor(valor)};
}

/** Muda o nome e/ou o email de um consultor, levando o histórico todo para o novo email. */
export async function alterarConsultorAdmin(valor: unknown): Promise<NovoConsultor> {
  const { emailAtual, nome, email } = validarAlteracaoConsultor(valor);
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    const atual = await cliente.query(`select 1 from equipa_afiliados where email = $1 for update`, [emailAtual]);
    if (!atual.rowCount) throw new ErroConsultorAdmin("Este consultor já não existe. Atualiza a página.", 404);
    if (email !== emailAtual) {
      const ocupado = await cliente.query(`select 1 from equipa_afiliados where email = $1`, [email]);
      if (ocupado.rowCount) throw new ErroConsultorAdmin("Já existe outro consultor com este email.", 409);
      await cliente.query(`update equipa_afiliados set email = $2 where email = $1`, [emailAtual, email]);
      if (await cliente.query(`select to_regclass('pedidos_bilhete_convencao') is not null as existe`).then((r) => r.rows[0].existe)) {
        await cliente.query(`update pedidos_bilhete_convencao set email = $2 where lower(email) = $1`, [emailAtual, email]);
      }
      for (const consulta of RENOMEAR_EMAIL) await cliente.query(consulta, [emailAtual, email]);
    }
    await cliente.query(`update equipa_afiliados set nome = $2, atualizado_em = now() where email = $1`, [email, nome]);
    await cliente.query(`update links_consultor set nome = $2 where referencia_email = $1`, [email, nome]);
    await cliente.query("commit");
    return { nome, email };
  } catch (erro) {
    await cliente.query("rollback");
    throw erro;
  } finally {
    cliente.release();
  }
}

/**
 * Tira o acesso à área de consultor. A equipa que estava abaixo passa para
 * o upline de quem sai, para a árvore não ficar partida. O histórico (leads,
 * inscrições, respostas) fica, porque pertence também a outras pessoas.
 */
export async function apagarConsultorAdmin(valor: unknown): Promise<void> {
  const dados = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  if (!email) throw new ErroConsultorAdmin("Falta indicar que consultor queres apagar.");
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    const { rows } = await cliente.query<{ upline_email: string | null }>(
      `delete from equipa_afiliados where email = $1 returning upline_email`, [email],
    );
    if (!rows[0]) throw new ErroConsultorAdmin("Este consultor já não existe. Atualiza a página.", 404);
    await cliente.query(`update equipa_afiliados set upline_email = $2 where upline_email = $1`, [email, rows[0].upline_email]);
    await cliente.query(`delete from links_consultor where referencia_email = $1`, [email]);
    await cliente.query(`delete from push_subscriptions where email = $1`, [email]);
    await cliente.query("commit");
  } catch (erro) {
    await cliente.query("rollback");
    throw erro;
  } finally {
    cliente.release();
  }
}
