/**
 * Apaga inscrições de teste do evento "Teambuilding Tropa de Elite"
 * (evento_inscricoes), pelos emails usados para testar o formulário. Os
 * bilhetes/QR codes associados (evento_bilhetes) são apagados
 * automaticamente, por causa do "on delete cascade" na migração 018.
 *
 * Corre com: CONFIRMAR=sim npm run limpar-inscricoes-evento-teste
 * Sem essa variável, só mostra o que iria apagar (nada é gravado).
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";

const EMAILS_TESTE = ["zmrlopes@gmail.com", "v2quadrado@gmail.com", "v2quadrado3@gmail.com"];

async function main(): Promise<void> {
  const confirmar = process.env.CONFIRMAR === "sim";

  const { rows } = await db().query<{ id: string; nome: string; email: string }>(
    `select id, nome, email from evento_inscricoes where email = any($1::text[]) order by criado_em`,
    [EMAILS_TESTE],
  );

  console.log(`A apagar (se confirmado): ${rows.length} inscrição(ões)`);
  for (const r of rows) console.log(`  ${r.nome} <${r.email}>`);

  if (!confirmar) {
    console.log(
      "\nNada foi apagado. Corre com CONFIRMAR=sim npm run limpar-inscricoes-evento-teste para apagar a sério.",
    );
    return;
  }

  await db().query(`delete from evento_inscricoes where email = any($1::text[])`, [EMAILS_TESTE]);
  console.log("\nApagado.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
