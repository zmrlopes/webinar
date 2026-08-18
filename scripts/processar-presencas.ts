/**
 * Corre com: npm run processar-presencas
 * Pensado para correr a cada 15 minutos (secção 9 do guia).
 */

import { fecharDb } from "../src/lib/db";
import { processarPresencas } from "../src/lib/presencas";

async function main(): Promise<void> {
  const resultado = await processarPresencas();
  console.log(
    `presenças: ${resultado.sessoesProcessadas} sessão(ões) processada(s), ${resultado.presencasAtualizadas} presença(s) atualizada(s)`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
