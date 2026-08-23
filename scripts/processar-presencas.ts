/**
 * Corre com: npm run processar-presencas
 * Pensado para correr a cada 15 minutos (secção 9 do guia).
 *
 * Por omissão só processa sessões terminadas há ≥45 min. Para pedir mais
 * cedo (ex: o Patrick já confirmou que os dados estão prontos do lado
 * dele), corre com FORCAR=sim npm run processar-presencas — ignora essa
 * margem, mas continua a só tocar em quem está `unknown`.
 */

import { fecharDb } from "../src/lib/db";
import { processarPresencas } from "../src/lib/presencas";

async function main(): Promise<void> {
  const forcar = process.env.FORCAR === "sim";
  if (forcar) {
    console.log("A ignorar a margem de 45 min — a perguntar ao Zoom já.\n");
  }
  const resultado = await processarPresencas({ esperaMinutos: forcar ? 0 : 45 });
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
