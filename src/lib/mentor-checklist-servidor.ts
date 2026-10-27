import {db} from "./db";
import {comporProgressoMentor, limparTarefasMentor, tarefaMentorValida, type TPMentorado} from "./mentor-checklist";
import {limparPrimeirosPassos, migrarPrimeirosPassosAnteriores} from "./primeiros-passos";
import {TITULO_WELCOME_ABOARD} from "./webinars";

export class ErroChecklistMentor extends Error {
  constructor(mensagem: string, public status = 400) {super(mensagem);}
}
const prefixo = (email: string) => `consultor:mentor-checklist:${email.trim().toLowerCase()}:`;

/** Lê a relação atual: uma importação da árvore basta para aparecer um novo TP. */
export async function listarTPsMentorados(mentor: string): Promise<TPMentorado[]> {
  const {rows} = await db().query<{
    email: string; nome: string; data_registo: string | null; estado: string;
    valor: unknown; progresso_em: Date | string | null;
    tp_valor: unknown; tp_antigo: unknown; tp_guardado: boolean; tp_progresso_em: Date | string | null;
    sessao1: boolean; sessao2: boolean;
  }>(
    `select tp.email, tp.nome, to_char(tp.data_registo, 'YYYY-MM-DD') as data_registo,
            tp.estado, progresso.valor, progresso.atualizado_em as progresso_em,
            arranque.valor as tp_valor, anterior.valor as tp_antigo, arranque.chave is not null as tp_guardado,
            case when arranque.chave is not null then arranque.atualizado_em else anterior.atualizado_em end as tp_progresso_em,
            (coalesce(tp.welcome_aboard_sessao1, false) or presencas.total >= 1) as sessao1,
            (coalesce(tp.welcome_aboard_sessao2, false) or presencas.total >= 2) as sessao2
     from equipa_afiliados tp
     left join dashboard_config progresso on progresso.chave = $2 || tp.email || ':v1'
     left join dashboard_config arranque on arranque.chave = 'consultor:primeiros-passos:' || tp.email || ':v2'
     left join dashboard_config anterior on anterior.chave = 'consultor:primeiros-passos:' || tp.email || ':v1'
     left join lateral (
       select count(distinct r.webinar_id) as total from registrations r
       join webinars w on w.id = r.webinar_id
       where r.email = tp.email and r.cancelada_em is null and r.presenca = 'attended'
         and w.tipo = 'sincronizado' and w.titulo = $3
     ) presencas on true
     where tp.upline_email = $1 and tp.email <> $1
     order by tp.data_registo desc nulls last, lower(tp.nome), tp.email`,
    [mentor.trim().toLowerCase(), prefixo(mentor), TITULO_WELCOME_ABOARD],
  );
  return rows.map(r => {
    const progresso = comporProgressoMentor(r.valor, r.tp_guardado ? limparPrimeirosPassos(r.tp_valor) : migrarPrimeirosPassosAnteriores(r.tp_antigo), r.sessao1, r.sessao2);
    return {email: r.email, nome: r.nome, dataRegisto: r.data_registo, estado: r.estado, ...progresso,
      atualizadoEm: r.progresso_em ? new Date(r.progresso_em).toISOString() : null,
      progressoTP: {...progresso.progressoTP, atualizadoEm: r.tp_progresso_em ? new Date(r.tp_progresso_em).toISOString() : null}};
  });
}

/** A autorização faz parte da escrita: só o mentor direto atual pode marcar. */
export async function marcarTarefaMentor(mentor: string, tp: unknown, tarefa: unknown, concluido: unknown): Promise<string[]> {
  const tpEmail = typeof tp === "string" ? tp.trim().toLowerCase() : "";
  if (tpEmail.length > 254 || !/^[^\s@:]+@[^\s@:.]+(?:\.[^\s@:]+)+$/.test(tpEmail)
    || !tarefaMentorValida(tarefa) || typeof concluido !== "boolean") {
    throw new ErroChecklistMentor("Escolhe um TP e uma tarefa válidos.");
  }
  const email = mentor.trim().toLowerCase();
  const {rows} = await db().query<{valor: unknown}>(
    `insert into dashboard_config (chave, valor)
     select $2 || tp.email || ':v1', case when $5 then jsonb_build_array($4::text) else '[]'::jsonb end
     from equipa_afiliados tp where tp.email = $3 and tp.upline_email = $1 and tp.email <> $1
     on conflict (chave) do update set valor = (
       select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from (
         select existente.id from jsonb_array_elements_text(dashboard_config.valor) existente(id) where existente.id <> $4
         union select $4::text where $5
       ) tarefas
     ), atualizado_em = now()
     returning valor`,
    [email, prefixo(email), tpEmail, tarefa, concluido],
  );
  if (!rows[0]) throw new ErroChecklistMentor("Este TP não está associado a ti como mentor direto. Atualiza a lista depois de atualizar a árvore da equipa.", 403);
  return limparTarefasMentor(rows[0].valor);
}
