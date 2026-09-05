/**
 * Corrige manualmente duas leads da Sofia Pinheiro (Rafaela Lourenço e Fátima
 * Martins) que, segundo o relato, se inscreveram e assistiram ao primeiro
 * webinar público do dia 23, mas cuja inscrição desapareceu dos dados —
 * possivelmente cancelada por engano durante a limpeza de "duplicados"
 * feita anteriormente. Ambas foram convertidas.
 *
 * Por cada lead:
 *   - Se já existir uma linha (mesmo cancelada) em registrations para esse
 *     email nesse webinar, reativa-a (cancelada_em = null) e marca
 *     presença = attended.
 *   - Se não existir nenhuma, cria uma nova inscrição já com presença
 *     registada e referência à Sofia Pinheiro.
 *   - Em qualquer dos casos, marca o estado da lead como "convertido" em
 *     estados_lead.
 *
 * Sem CONFIRMAR=sim, só mostra o que iria fazer (nada é gravado).
 * Para gravar a sério: CONFIRMAR=sim npm run corrigir-leads-sofia
 *
 * Se houver mais do que um webinar público a bater com "dia 23", o script
 * para e pede para escolher via WEBINAR_ID=<uuid> CONFIRMAR=sim npm run ...
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";
import { TITULO_WEBINAR_PUBLICO } from "../src/lib/webinars";

const LEADS = [
  { email: "lourencorafaela@gmail.com", nome: "Rafaela", apelido: "David Fernandes Lourenço" },
  { email: "info.oriah@gmail.com", nome: "Fátima Maria", apelido: "Paulos Martins" },
];

async function main(): Promise<void> {
  const confirmar = process.env.CONFIRMAR === "sim";
  const webinarIdForcado = process.env.WEBINAR_ID;

  console.log(`\nLigado à base de dados: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":***@")}\n`);

  const { rows: sofias } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados where nome ilike '%sofia%pinheiro%'`,
  );
  if (sofias.length !== 1) {
    console.error(
      `Esperava encontrar exatamente 1 "Sofia Pinheiro" em equipa_afiliados, encontrei ${sofias.length}: ` +
        sofias.map((s) => `${s.nome} <${s.email}>`).join(", "),
    );
    process.exit(1);
  }
  const sofia = sofias[0]!;
  console.log(`Sofia Pinheiro: ${sofia.nome} <${sofia.email}>`);

  let webinarId: string;
  if (webinarIdForcado) {
    const { rows } = await db().query<{ id: string; titulo: string; sessao_externa_em: Date }>(
      `select id, titulo, sessao_externa_em from webinars where id = $1`,
      [webinarIdForcado],
    );
    if (!rows[0]) {
      console.error(`Não encontrei nenhum webinar com id=${webinarIdForcado}`);
      process.exit(1);
    }
    webinarId = rows[0].id;
    console.log(`Webinar (forçado por WEBINAR_ID): "${rows[0].titulo}" em ${rows[0].sessao_externa_em.toISOString()}`);
  } else {
    const { rows } = await db().query<{ id: string; titulo: string; sessao_externa_em: Date }>(
      `select id, titulo, sessao_externa_em
       from webinars
       where titulo = $1
         and extract(day from sessao_externa_em at time zone 'Europe/Lisbon') = 23
       order by sessao_externa_em asc`,
      [TITULO_WEBINAR_PUBLICO],
    );
    if (rows.length === 0) {
      console.error(`Não encontrei nenhum webinar público ("${TITULO_WEBINAR_PUBLICO}") no dia 23 de nenhum mês.`);
      process.exit(1);
    }
    if (rows.length > 1) {
      console.error(
        `Encontrei ${rows.length} webinares públicos no dia 23 — escolhe um com WEBINAR_ID=<uuid>:\n` +
          rows.map((r) => `  ${r.id} — ${r.sessao_externa_em.toISOString()}`).join("\n"),
      );
      process.exit(1);
    }
    webinarId = rows[0]!.id;
    console.log(`Webinar: "${rows[0]!.titulo}" em ${rows[0]!.sessao_externa_em.toISOString()} (id=${webinarId})`);
  }

  console.log();

  for (const lead of LEADS) {
    const { rows: existentes } = await db().query<{
      id: string;
      cancelada_em: Date | null;
      presenca: string;
      referencia_email: string | null;
    }>(
      `select id, cancelada_em, presenca, referencia_email
       from registrations
       where webinar_id = $1 and email = $2`,
      [webinarId, lead.email],
    );

    if (existentes.length > 1) {
      console.log(
        `[${lead.email}] AVISO: ${existentes.length} linhas encontradas para este email e webinar — o script só mexe na mais recente, verifica manualmente as restantes.`,
      );
    }

    const existente = existentes[0];
    if (existente) {
      console.log(
        `[${lead.email}] Já existe uma inscrição (id=${existente.id}, ` +
          `${existente.cancelada_em ? `cancelada em ${existente.cancelada_em.toISOString()}` : "ativa"}, ` +
          `presença=${existente.presenca}) — vai ser reativada e marcada como presente.`,
      );
      if (confirmar) {
        await db().query(
          `update registrations
           set cancelada_em = null, presenca = 'attended',
               referencia_email = coalesce(referencia_email, $2)
           where id = $1`,
          [existente.id, sofia.email],
        );
      }
    } else {
      console.log(`[${lead.email}] Não existe nenhuma inscrição — vai ser criada uma nova, já com presença registada.`);
      if (confirmar) {
        await db().query(
          `insert into registrations
             (webinar_id, nome, apelido, email, referencia_email, consentimento_privacidade_em, link_estado, presenca)
           values ($1, $2, $3, $4, $5, now(), 'obtido', 'attended')`,
          [webinarId, lead.nome, lead.apelido, lead.email, sofia.email],
        );
      }
    }

    console.log(`[${lead.email}] Estado vai ficar "convertido".`);
    if (confirmar) {
      await db().query(
        `insert into estados_lead (lead_email, estado, atualizado_por, atualizado_em)
         values ($1, 'convertido', 'admin', now())
         on conflict (lead_email) do update
           set estado = excluded.estado, atualizado_por = excluded.atualizado_por, atualizado_em = now()`,
        [lead.email],
      );
    }
  }

  if (!confirmar) {
    console.log("\nNada foi gravado. Corre com CONFIRMAR=sim npm run corrigir-leads-sofia para gravar a sério.");
  } else {
    console.log("\nGravado.");
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
