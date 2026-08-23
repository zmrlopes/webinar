/**
 * Corre uma vez, antes de começar a divulgar o sistema à equipa: apaga
 * inscrições, emails, cliques e links de consultor de teste, para a base
 * ficar limpa para dados reais.
 *
 * Não toca em `webinars` (sincronizado a sério a partir da sala do Patrick,
 * não deve ser apagado) nem em `schema_migrations`.
 *
 * Corre com: CONFIRMAR=sim npm run limpar-dados-teste
 * Sem essa variável, só mostra o que iria apagar (nada é gravado).
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";

async function contar(tabela: string): Promise<number> {
  const { rows } = await db().query<{ total: string }>(`select count(*) as total from ${tabela}`);
  return Number(rows[0]?.total ?? 0);
}

async function main(): Promise<void> {
  const confirmar = process.env.CONFIRMAR === "sim";

  const antes = {
    registrations: await contar("registrations"),
    emails: await contar("emails"),
    cliques_link: await contar("cliques_link"),
    links_consultor: await contar("links_consultor"),
  };

  console.log("A apagar (se confirmado):");
  console.log(`  registrations:    ${antes.registrations}`);
  console.log(`  emails:           ${antes.emails}`);
  console.log(`  cliques_link:     ${antes.cliques_link}`);
  console.log(`  links_consultor:  ${antes.links_consultor}`);
  console.log("(webinars não é tocado)");

  if (!confirmar) {
    console.log("\nNada foi apagado. Corre com CONFIRMAR=sim npm run limpar-dados-teste para apagar a sério.");
    return;
  }

  // Ordem por causa da chave estrangeira: emails referencia registrations.
  await db().query("delete from emails");
  await db().query("delete from cliques_link");
  await db().query("delete from links_consultor");
  await db().query("delete from registrations");

  console.log("\nApagado. A base está limpa para começar a receber dados reais.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
