import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";
import { db } from "./db";

const DIR_MIGRATIONS = path.join(process.cwd(), "migrations");

export interface ResultadoMigracao {
  ficheiro: string;
  aplicada: boolean; // false = já estava aplicada antes, não fez nada
}

/**
 * Aplica os ficheiros em migrations/ (por ordem alfabética) que ainda não
 * tiverem corrido, cada um dentro da sua própria transação — mesma lógica
 * de scripts/migrar.ts, partilhada com a página /admin/migrar para quando
 * não há acesso ao PC para correr `npm run migrar`. Usa um client dedicado
 * do pool (não `db().query()` direto) porque begin/commit/rollback só
 * fazem sentido presos à mesma ligação.
 */
export async function aplicarMigracoesPendentes(): Promise<ResultadoMigracao[]> {
  const ficheiros = (await readdir(DIR_MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();

  const client: PoolClient = await db().connect();
  const resultados: ResultadoMigracao[] = [];
  try {
    await client.query(`
      create table if not exists schema_migrations (
        nome        text primary key,
        aplicada_em timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ nome: string }>("select nome from schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.nome));

    for (const ficheiro of ficheiros) {
      if (aplicadas.has(ficheiro)) {
        resultados.push({ ficheiro, aplicada: false });
        continue;
      }

      const sql = await readFile(path.join(DIR_MIGRATIONS, ficheiro), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (nome) values ($1)", [ficheiro]);
        await client.query("commit");
        resultados.push({ ficheiro, aplicada: true });
      } catch (erro) {
        await client.query("rollback");
        throw erro;
      }
    }
  } finally {
    client.release();
  }

  return resultados;
}
