/**
 * Corre com: npm run sincronizar-sessoes
 * Pensado para correr de hora a hora (secção 9 do guia).
 */

import { fecharDb } from "../src/lib/db.js";
import { sincronizarSessoes } from "../src/lib/sessoes.js";

async function main(): Promise<void> {
  const resultado = await sincronizarSessoes();
  console.log(
    `sessões: ${resultado.novas} nova(s), ${resultado.atualizadas} atualizada(s), ${resultado.canceladas} cancelada(s)`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
