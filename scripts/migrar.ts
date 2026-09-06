/**
 * Aplica os ficheiros em migrations/ (por ordem alfabética) que ainda não
 * tiverem corrido, dentro de uma transação cada um. Regista o que já correu
 * em schema_migrations, por isso é seguro correr repetidamente.
 *
 * Corre com: npm run migrar
 * Requer DATABASE_URL no ambiente.
 */

import "./_env";
import { aplicarMigracoesPendentes } from "../src/lib/migrar";
import { fecharDb } from "../src/lib/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL no ambiente.");
    process.exit(1);
  }

  const resultados = await aplicarMigracoesPendentes();
  for (const r of resultados) {
    console.log(r.aplicada ? `OK  ${r.ficheiro}` : `--  já aplicada: ${r.ficheiro}`);
  }
  console.log("Migrations em dia.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
