/**
 * Corre com: npm run limpar-links
 * Pensado para correr diariamente (secção 9 do guia).
 */

import { fecharDb } from "../src/lib/db";
import { limparLinks } from "../src/lib/limpeza";

async function main(): Promise<void> {
  const resultado = await limparLinks();
  console.log(`limpeza: ${resultado.limpos} link(s) apagado(s)`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
