/**
 * Corre com: npm run processar-lembretes
 * Cadência sugerida: 15-30 em 15-30 min (secção 9 do guia).
 */

import "./_env";
import { fecharDb } from "../src/lib/db";
import { criarEmailSender } from "../src/lib/email";
import { processarLembretes } from "../src/lib/lembretes";

async function main(): Promise<void> {
  const resultado = await processarLembretes({ sender: criarEmailSender() });
  console.log(`lembretes: ${resultado.enviados} enviado(s)`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
