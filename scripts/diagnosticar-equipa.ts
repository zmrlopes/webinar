/**
 * Só lê, não altera nada. Ajuda a perceber porque é que alguém aparece com
 * leads na tabela "Por consultor" do admin (agrupada pelo código curto,
 * `referencia`) mas 0 leads na árvore da equipa do painel do consultor
 * (agrupada por email, `equipa_afiliados.email` = `registrations.referencia_email`).
 *
 * A causa mais provável é o email não bater certo: a pessoa gerou o link
 * curto em /consultor com um email diferente do que está no CSV da equipa
 * (scripts/importar-equipa.ts).
 *
 * Corre com: npm run diagnosticar-equipa -- <pedaço do nome ou da referencia>
 * Exemplo:   npm run diagnosticar-equipa -- "marisa rocha"
 */

import { db, fecharDb } from "../src/lib/db";

async function main(): Promise<void> {
  const termo = process.argv[2];
  if (!termo) {
    console.error('Uso: npm run diagnosticar-equipa -- "nome ou referencia a procurar"');
    process.exit(1);
  }

  console.log(`\n=== equipa_afiliados (CSV da equipa) — nome contém "${termo}" ===`);
  const { rows: naEquipa } = await db().query<{
    email: string;
    nome: string;
    upline_email: string | null;
    estado: string;
  }>(`select email, nome, upline_email, estado from equipa_afiliados where nome ilike $1`, [
    `%${termo}%`,
  ]);
  if (naEquipa.length === 0) console.log("  (ninguém encontrado com esse nome)");
  for (const r of naEquipa) {
    console.log(`  ${r.nome}  <${r.email}>  estado=${r.estado}  upline=${r.upline_email ?? "—"}`);
  }

  console.log(`\n=== links_consultor (link gerado em /consultor) — nome ou referencia contém "${termo}" ===`);
  const { rows: naLinks } = await db().query<{
    referencia: string;
    nome: string | null;
    referencia_email: string;
  }>(
    `select referencia, nome, referencia_email from links_consultor
     where nome ilike $1 or referencia ilike $1`,
    [`%${termo}%`],
  );
  if (naLinks.length === 0) console.log("  (ninguém encontrado com esse nome/referência)");
  for (const r of naLinks) {
    const emailBateCerto = naEquipa.some((e) => e.email === r.referencia_email);
    console.log(
      `  referencia="${r.referencia}"  nome="${r.nome ?? "—"}"  email_usado_no_link=<${r.referencia_email}>` +
        (emailBateCerto ? "  [OK, bate certo com equipa_afiliados]" : "  [!! NÃO existe com este email em equipa_afiliados]"),
    );
  }

  // `referencia` é o código curto (ex: "marisa-rocha"), com hífenes em vez de
  // espaços — um termo de pesquisa com espaços não bate certo com ILIKE
  // direto, por isso troca cada espaço por um "%" (qualquer coisa lá no meio).
  const padraoReferencia = `%${termo.trim().split(/\s+/).join("%")}%`;

  console.log(`\n=== registrations (inscrições) — referencia contém "${termo}" ===`);
  const { rows: nasInscricoes } = await db().query<{
    id: string;
    nome: string;
    referencia: string | null;
    referencia_email: string | null;
    webinar_id: string;
    titulo: string;
    cancelada: boolean;
  }>(
    `select r.id, r.nome, r.referencia, r.referencia_email, r.webinar_id, w.titulo,
            (r.cancelada_em is not null) as cancelada
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.referencia ilike $1
     order by r.criado_em desc`,
    [padraoReferencia],
  );
  if (nasInscricoes.length === 0) console.log("  (nenhuma inscrição encontrada com essa referência)");
  for (const r of nasInscricoes) {
    console.log(
      `  lead="${r.nome}"  referencia="${r.referencia}"  referencia_email=<${r.referencia_email ?? "—"}>` +
        `  sessão="${r.titulo}"${r.cancelada ? "  [cancelada]" : ""}`,
    );
  }

  console.log("\n=== Conclusão automática ===");
  const emailsNaEquipa = new Set(naEquipa.map((e) => e.email));
  const emailsUsadosNasInscricoes = new Set(
    nasInscricoes.filter((r) => !r.cancelada).map((r) => r.referencia_email).filter(Boolean),
  );
  const emailsSemCorrespondencia = [...emailsUsadosNasInscricoes].filter(
    (email) => !emailsNaEquipa.has(email as string),
  );
  if (emailsSemCorrespondencia.length > 0) {
    console.log(
      `  Há inscrições com referencia_email que NÃO existe em equipa_afiliados: ${emailsSemCorrespondencia.join(", ")}`,
    );
    console.log(
      "  É por isso que a árvore da equipa não conta estes leads — o email usado para gerar o link\n" +
        "  não é o mesmo que está no CSV da equipa. Corrige atualizando o email em equipa_afiliados\n" +
        "  (ou pede à pessoa para gerar o link outra vez com o email certo).",
    );
  } else {
    console.log("  Os emails batem certo — se a árvore ainda não mostrar os leads, é outra causa (avisa).");
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
