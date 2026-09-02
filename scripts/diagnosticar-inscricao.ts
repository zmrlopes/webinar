/**
 * Só lê, não altera nada. Mostra todas as inscrições (mesmo as canceladas)
 * que batem com um nome ou email, em todas as sessões — para confirmar se
 * a base de dados que os scripts usam (a do .env local) é a mesma que o
 * site em produção mostra.
 *
 * Corre com: npm run diagnosticar-inscricao -- <pedaço do nome ou email>
 * Exemplo:   npm run diagnosticar-inscricao -- "lucia paradela"
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";

async function main(): Promise<void> {
  const termo = process.argv[2];
  if (!termo) {
    console.error('Uso: npm run diagnosticar-inscricao -- "nome ou email a procurar"');
    process.exit(1);
  }

  const { rows } = await db().query<{
    id: string;
    nome: string;
    apelido: string;
    email: string;
    titulo: string;
    webinar_id: string;
    presenca: string;
    criado_em: Date;
    cancelada_em: Date | null;
  }>(
    `select r.id, r.nome, r.apelido, r.email, w.titulo, r.webinar_id, r.presenca, r.criado_em, r.cancelada_em
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.nome ilike $1 or r.apelido ilike $1 or r.email ilike $1
     order by r.criado_em asc`,
    [`%${termo}%`],
  );

  console.log(`\nLigado à base de dados: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":***@")}\n`);

  if (rows.length === 0) {
    console.log(`Nenhuma inscrição encontrada para "${termo}" nesta base de dados.`);
  } else {
    console.log(`${rows.length} inscrição(ões) encontrada(s) para "${termo}":\n`);
    for (const r of rows) {
      console.log(
        `  [${r.cancelada_em ? "CANCELADA" : "ativa"}] ${r.nome} ${r.apelido} <${r.email}> — "${r.titulo}" ` +
          `(webinar_id=${r.webinar_id})\n` +
          `      presença=${r.presenca}, inscrito em ${r.criado_em.toISOString()}` +
          (r.cancelada_em ? `, cancelada em ${r.cancelada_em.toISOString()}` : ""),
      );
    }
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
