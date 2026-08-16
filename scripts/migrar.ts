/**
 * Aplica os ficheiros em migrations/ (por ordem alfabética) que ainda não
 * tiverem corrido, dentro de uma transação cada um. Regista o que já correu
 * em schema_migrations, por isso é seguro correr repetidamente.
 *
 * Corre com: npm run migrar
 * Requer DATABASE_URL no ambiente.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const DIR_MIGRATIONS = path.join(import.meta.dirname, "..", "migrations");

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Falta DATABASE_URL no ambiente.");
    process.exit(1);
  }

  const ficheiros = (await readdir(DIR_MIGRATIONS))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        nome        text primary key,
        aplicada_em timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ nome: string }>(
      "select nome from schema_migrations",
    );
    const aplicadas = new Set(rows.map((r) => r.nome));

    for (const ficheiro of ficheiros) {
      if (aplicadas.has(ficheiro)) {
        console.log(`--  já aplicada: ${ficheiro}`);
        continue;
      }

      const sql = await readFile(path.join(DIR_MIGRATIONS, ficheiro), "utf8");
      console.log(`->  a aplicar: ${ficheiro}`);

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (nome) values ($1)", [
          ficheiro,
        ]);
        await client.query("commit");
        console.log(`OK  ${ficheiro}`);
      } catch (erro) {
        await client.query("rollback");
        throw erro;
      }
    }

    console.log("Migrations em dia.");
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
