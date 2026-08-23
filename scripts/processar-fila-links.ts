/**
 * Corre com: npm run processar-fila
 * Pensado para correr a cada 5 minutos (secção 9 do guia).
 */

import "./_env";
import { fecharDb } from "../src/lib/db";
import { criarEmailSender } from "../src/lib/email";
import { processarFilaLinks } from "../src/lib/fila-links";

async function main(): Promise<void> {
  const resultado = await processarFilaLinks({ sender: criarEmailSender() });
  console.log(
    `fila: ${resultado.obtidos} obtido(s), ${resultado.falhados} falhado(s), ${resultado.reagendados} reagendado(s)`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
