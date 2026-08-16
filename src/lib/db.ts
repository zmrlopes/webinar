import { Pool } from "pg";

let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("variável de ambiente em falta: DATABASE_URL");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function fecharDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
