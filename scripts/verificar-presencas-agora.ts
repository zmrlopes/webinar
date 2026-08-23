/**
 * Verificação manual, só de leitura: pergunta à sala de Zoom quem já entrou,
 * SEM gravar nada na base de dados (não mexe em `registrations.presenca`).
 * Serve para espreitar antes do processo automático (secção 7-D, que só
 * corre 45 min depois do fim previsto da sessão).
 *
 * Aviso: o Zoom normalmente só fecha os dados de presença depois da sessão
 * terminar — perguntar a meio da sessão pode devolver "não entrou" para
 * quem está lá dentro neste preciso momento, porque os dados ainda não
 * assentaram do lado do Zoom/Patrick. Isto é só uma prévia, não uma
 * contagem final.
 *
 * Corre com: npm run verificar-presencas-agora
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";
import { pedirPresencas } from "../src/lib/sala-zoom";
import { buscarWebinarRelevante } from "../src/lib/webinars";

async function main(): Promise<void> {
  const webinar = await buscarWebinarRelevante();
  if (!webinar) {
    console.log("Não há nenhuma sessão para verificar.");
    return;
  }

  const { rows } = await db().query<{ sessao_externa_id: string | null }>(
    `select sessao_externa_id from webinars where id = $1`,
    [webinar.id],
  );
  const sessaoExternaId = rows[0]?.sessao_externa_id;
  if (!sessaoExternaId) {
    console.log("Esta sessão ainda não está sincronizada com a sala de Zoom.");
    return;
  }

  const { rows: inscritos } = await db().query<{ nome: string; email: string }>(
    `select nome, email from registrations
     where webinar_id = $1 and cancelada_em is null
     order by criado_em asc`,
    [webinar.id],
  );

  console.log(`Sessão: ${webinar.titulo} — id externo "${sessaoExternaId}"`);
  console.log(`Inscritos a verificar: ${inscritos.length}\n`);

  if (inscritos.length === 0) {
    console.log("Ninguém inscrito para verificar.");
    return;
  }

  const presencas = await pedirPresencas(
    sessaoExternaId,
    inscritos.map((i) => i.email),
  );
  const porEmail = new Map(presencas.map((p) => [p.email.toLowerCase(), p]));

  let entraram = 0;
  let naoEntraram = 0;
  let semResposta = 0;

  for (const i of inscritos) {
    const p = porEmail.get(i.email.toLowerCase());
    if (!p || p.presenca === "unknown") {
      semResposta++;
      console.log(`  ? ${i.nome} <${i.email}> — sem resposta ainda`);
    } else if (p.presenca === "attended") {
      entraram++;
      console.log(`  ✓ ${i.nome} <${i.email}> — entrou (${p.minutos ?? "?"} min)`);
    } else {
      naoEntraram++;
      console.log(`  ✗ ${i.nome} <${i.email}> — não entrou`);
    }
  }

  console.log(`\nResumo: ${entraram} entraram, ${naoEntraram} não entraram, ${semResposta} sem resposta ainda.`);
  console.log("(Nada foi gravado — isto é só uma prévia, não a contagem oficial.)");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
