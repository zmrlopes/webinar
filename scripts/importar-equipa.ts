/**
 * Importa a hierarquia da equipa (quem está abaixo de quem) a partir do CSV
 * exportado da plataforma de afiliados, para a tabela `equipa_afiliados`.
 * Alimenta a secção "A minha equipa" no painel do consultor.
 *
 * A plataforma de afiliados não tem sincronização automática — sempre que a
 * equipa mudar (gente nova, mudanças de upline), exporta o CSV outra vez e
 * corre este script de novo. É seguro correr repetidamente: cada consultor
 * é upsert pelo email, os que já existem só são atualizados.
 *
 * Corre com: CONFIRMAR=sim npm run importar-equipa -- caminho/para/export.csv
 * Sem CONFIRMAR=sim, só mostra o que iria fazer (nada é gravado).
 */

import "./_env";
import { readFile } from "node:fs/promises";
import { importarLinhasEquipa, parseCsvEquipa } from "../src/lib/equipa-import";
import { db, fecharDb } from "../src/lib/db";

async function main(): Promise<void> {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Uso: npm run importar-equipa -- caminho/para/export.csv");
    process.exit(1);
  }

  const confirmar = process.env.CONFIRMAR === "sim";

  const texto = await readFile(caminho, "utf8");
  const { linhas, totalLinhasCru, semEmail } = parseCsvEquipa(texto);

  const existentes = await db().query<{ total: string }>(
    "select count(*) as total from equipa_afiliados",
  );

  console.log(`Ficheiro: ${caminho}`);
  console.log(`Linhas no CSV: ${totalLinhasCru}`);
  console.log(`Consultores válidos (com email): ${linhas.length}`);
  if (semEmail.length > 0) {
    console.log(`Ignorados por falta de email: ${semEmail.length} (${semEmail.slice(0, 5).join(", ")}${semEmail.length > 5 ? ", ..." : ""})`);
  }
  console.log(`Já existem em equipa_afiliados: ${existentes.rows[0]?.total ?? 0}`);

  if (!confirmar) {
    console.log("\nNada foi gravado. Corre com CONFIRMAR=sim npm run importar-equipa -- <ficheiro> para importar a sério.");
    return;
  }

  await importarLinhasEquipa(linhas);

  console.log(`\nImportado: ${linhas.length} consultores.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
