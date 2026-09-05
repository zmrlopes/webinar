import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TITULO_WEBINAR_PUBLICO } from "@/lib/webinars";

/**
 * Correção pontual, feita a partir do telemóvel (sem acesso ao PC): duas
 * leads da Sofia Pinheiro (Rafaela Lourenço, Fátima Martins) inscreveram-se
 * e assistiram ao primeiro webinar público do dia 23, mas a inscrição
 * desapareceu dos dados — e ambas foram convertidas. Mesma lógica do script
 * scripts/corrigir-leads-sofia.ts, mas executada diretamente por um clique
 * no admin em vez de correr localmente. Protegida pela mesma Basic Auth de
 * /api/admin/* (ver proxy.ts) — não precisa de confirmação extra própria.
 */

const LEADS = [
  { email: "lourencorafaela@gmail.com", nome: "Rafaela", apelido: "David Fernandes Lourenço" },
  { email: "info.oriah@gmail.com", nome: "Fátima Maria", apelido: "Paulos Martins" },
];

export async function POST(): Promise<Response> {
  const linhas: string[] = [];

  const { rows: sofias } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados where nome ilike '%sofia%pinheiro%'`,
  );
  if (sofias.length !== 1) {
    return NextResponse.json(
      {
        erro: `Esperava encontrar exatamente 1 "Sofia Pinheiro" em equipa_afiliados, encontrei ${sofias.length}.`,
      },
      { status: 409 },
    );
  }
  const sofia = sofias[0]!;
  linhas.push(`Sofia Pinheiro: ${sofia.nome} <${sofia.email}>`);

  const { rows: webinares } = await db().query<{ id: string; sessao_externa_em: Date }>(
    `select id, sessao_externa_em
     from webinars
     where titulo = $1
       and extract(day from sessao_externa_em at time zone 'Europe/Lisbon') = 23
     order by sessao_externa_em asc`,
    [TITULO_WEBINAR_PUBLICO],
  );
  if (webinares.length === 0) {
    return NextResponse.json(
      { erro: `Não encontrei nenhum webinar público no dia 23 de nenhum mês.` },
      { status: 409 },
    );
  }
  if (webinares.length > 1) {
    return NextResponse.json(
      {
        erro: `Encontrei ${webinares.length} webinares públicos no dia 23 — é preciso escolher manualmente (usa o script scripts/corrigir-leads-sofia.ts com WEBINAR_ID).`,
      },
      { status: 409 },
    );
  }
  const webinarId = webinares[0]!.id;
  linhas.push(`Webinar em ${webinares[0]!.sessao_externa_em.toISOString()} (id=${webinarId})`);

  for (const lead of LEADS) {
    const { rows: existentes } = await db().query<{ id: string; cancelada_em: Date | null }>(
      `select id, cancelada_em from registrations where webinar_id = $1 and email = $2 order by criado_em desc`,
      [webinarId, lead.email],
    );

    const existente = existentes[0];
    if (existente) {
      await db().query(
        `update registrations
         set cancelada_em = null, presenca = 'attended',
             referencia_email = coalesce(referencia_email, $2)
         where id = $1`,
        [existente.id, sofia.email],
      );
      linhas.push(`${lead.email}: inscrição existente reativada e marcada como presente.`);
    } else {
      await db().query(
        `insert into registrations
           (webinar_id, nome, apelido, email, referencia_email, consentimento_privacidade_em, link_estado, presenca)
         values ($1, $2, $3, $4, $5, now(), 'obtido', 'attended')`,
        [webinarId, lead.nome, lead.apelido, lead.email, sofia.email],
      );
      linhas.push(`${lead.email}: inscrição nova criada, já com presença registada.`);
    }

    await db().query(
      `insert into estados_lead (lead_email, estado, atualizado_por, atualizado_em)
       values ($1, 'convertido', 'admin', now())
       on conflict (lead_email) do update
         set estado = excluded.estado, atualizado_por = excluded.atualizado_por, atualizado_em = now()`,
      [lead.email],
    );
    linhas.push(`${lead.email}: estado marcado como "convertido".`);
  }

  return NextResponse.json({ linhas });
}
