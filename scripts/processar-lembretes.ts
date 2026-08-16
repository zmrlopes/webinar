/**
 * Corre com: npm run processar-lembretes
 * Cadência sugerida: 15-30 em 15-30 min (secção 9 do guia).
 */

import { fecharDb } from "../src/lib/db.js";
import { ConsoleEmailSender } from "../src/lib/email.js";
import { processarLembretes } from "../src/lib/lembretes.js";

async function main(): Promise<void> {
  const resultado = await processarLembretes({ sender: new ConsoleEmailSender() });
  console.log(`lembretes: ${resultado.enviados} enviado(s)`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
