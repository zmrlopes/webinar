import { db } from "./db";
import { TITULO_WEBINAR_PUBLICO } from "./webinars";

export type EstadoLead = "follow_up" | "convertido" | "desistiu";
const ESTADOS_VALIDOS: readonly EstadoLead[] = ["follow_up", "convertido", "desistiu"];

export function estadoLeadValido(valor: unknown): valor is EstadoLead {
  return typeof valor === "string" && (ESTADOS_VALIDOS as readonly string[]).includes(valor);
}

export interface LeadConsolidado {
  nome: string;
  telemovel: string | null;
  email: string;
  sessoesFeitas: number;
  assistiu: boolean;
  percentagemAssistencia: number | null;
  ultimaSessaoAssistida: string | null;
  trazidoPor: string | null;
  estado: EstadoLead | null;
  podeEditar: boolean;
}

export interface ResumoLeads {
  leadsTotais: number;
  assistiram: number;
  followUp: number;
  convertidos: number;
  desistiram: number;
  leads: LeadConsolidado[];
}

/**
 * Uma linha por pessoa, juntando todas as sessões públicas a que foi (não
 * uma linha por inscrição) — combina com o estado único por pessoa em
 * `estados_lead`. `podeEditar` só é true se o próprio `proprioEmail` (não
 * a equipa) trouxe essa lead nalguma sessão — é essa a regra de posse.
 *
 * Exclui, como em todo o resto do sistema, quem se inscreveu a si próprio
 * sendo também consultor.
 */
export async function listarLeadsConsolidado(
  referenciaEmails: string[],
  proprioEmail: string,
): Promise<ResumoLeads> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    telemovel: string | null;
    sessoes_feitas: string;
    assistiu: boolean;
    percentagem_assistencia: string | null;
    ultima_sessao_assistida: string | null;
    trazido_por_nome: string | null;
    referencia_email_mais_recente: string | null;
    pode_editar: boolean;
    estado: EstadoLead | null;
  }>(
    `select
       r.email,
       (array_agg(r.nome order by r.criado_em desc))[1] as nome,
       (array_agg(r.telemovel order by r.criado_em desc))[1] as telemovel,
       count(*) as sessoes_feitas,
       bool_or(r.presenca = 'attended') as assistiu,
       max(
         case
           when r.presenca = 'attended' and r.presenca_minutos is not null and w.duracao_minutos > 0
           then least(100, round((r.presenca_minutos::numeric / w.duracao_minutos) * 100))
           else null
         end
       ) as percentagem_assistencia,
       max(case when r.presenca = 'attended' then w.sessao_externa_em end) as ultima_sessao_assistida,
       (array_agg(ea.nome order by r.criado_em desc))[1] as trazido_por_nome,
       (array_agg(r.referencia_email order by r.criado_em desc))[1] as referencia_email_mais_recente,
       bool_or(r.referencia_email = $3) as pode_editar,
       el.estado
     from registrations r
     join webinars w on w.id = r.webinar_id
     left join equipa_afiliados ea on ea.email = r.referencia_email
     left join estados_lead el on el.lead_email = r.email
     where w.titulo = $1
       and r.cancelada_em is null
       and r.referencia_email = any($2::text[])
       and not exists (select 1 from equipa_afiliados ea2 where ea2.email = r.email)
     group by r.email, el.estado
     order by max(r.criado_em) desc`,
    [TITULO_WEBINAR_PUBLICO, referenciaEmails, proprioEmail],
  );

  const leads: LeadConsolidado[] = rows.map((r) => ({
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    sessoesFeitas: Number(r.sessoes_feitas),
    assistiu: r.assistiu,
    percentagemAssistencia:
      r.percentagem_assistencia !== null ? Number(r.percentagem_assistencia) : null,
    ultimaSessaoAssistida: r.ultima_sessao_assistida,
    trazidoPor: r.referencia_email_mais_recente === proprioEmail ? null : r.trazido_por_nome,
    estado: r.estado,
    podeEditar: r.pode_editar,
  }));

  return {
    leadsTotais: leads.length,
    assistiram: leads.filter((l) => l.assistiu).length,
    followUp: leads.filter((l) => l.estado === "follow_up").length,
    convertidos: leads.filter((l) => l.estado === "convertido").length,
    desistiram: leads.filter((l) => l.estado === "desistiu").length,
    leads,
  };
}

/**
 * Só quem trouxe a lead diretamente (existe uma inscrição dela com
 * referencia_email = consultorEmail) pode mudar o estado — verificado aqui,
 * nunca confiado ao pedido. Lança se não tiver posse.
 */
export async function definirEstadoLead(
  leadEmail: string,
  estado: EstadoLead,
  consultorEmail: string,
): Promise<void> {
  const { rows } = await db().query<{ existe: boolean }>(
    `select exists(
       select 1 from registrations
       where email = $1 and referencia_email = $2 and cancelada_em is null
     ) as existe`,
    [leadEmail, consultorEmail],
  );
  if (!rows[0]?.existe) {
    throw new Error("não podes editar o estado de uma lead que não trouxeste");
  }

  await db().query(
    `insert into estados_lead (lead_email, estado, atualizado_por, atualizado_em)
     values ($1, $2, $3, now())
     on conflict (lead_email) do update
       set estado = excluded.estado, atualizado_por = excluded.atualizado_por, atualizado_em = now()`,
    [leadEmail, estado, consultorEmail],
  );
}
