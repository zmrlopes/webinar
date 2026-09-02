/**
 * Adiciona (ou atualiza) manualmente uma pessoa em equipa_afiliados — para
 * quem devia lá estar mas nunca ficou por vir do CSV (ex: o topo da
 * pirâmide, que nunca aparece como "membro" no export da equipa, só como
 * upline de quem está por baixo).
 *
 * Corre com:
 *   npm run adicionar-membro-equipa -- "email@x.com" "Nome Completo" ["upline@x.com"]
 * O upline é opcional — sem ele, fica como topo (sem ninguém acima).
 * Sem CONFIRMAR=sim, só mostra o que iria gravar (nada é gravado).
 * Para gravar a sério: CONFIRMAR=sim npm run adicionar-membro-equipa -- ...
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";

async function main(): Promise<void> {
  const [email, nome, uplineEmail] = process.argv.slice(2);
  if (!email || !nome) {
    console.error(
      'Uso: npm run adicionar-membro-equipa -- "email@x.com" "Nome Completo" ["upline@x.com" opcional]',
    );
    process.exit(1);
  }
  const emailNormalizado = email.trim().toLowerCase();
  const uplineNormalizado = uplineEmail?.trim().toLowerCase() || null;
  const confirmar = process.env.CONFIRMAR === "sim";

  const { rows: existente } = await db().query<{ email: string; nome: string; upline_email: string | null }>(
    `select email, nome, upline_email from equipa_afiliados where email = $1`,
    [emailNormalizado],
  );

  console.log(`Email: ${emailNormalizado}`);
  console.log(`Nome: ${nome}`);
  console.log(`Upline: ${uplineNormalizado ?? "(nenhum — fica no topo)"}`);
  if (existente[0]) {
    console.log(
      `\nJá existe uma linha para este email (nome="${existente[0].nome}", upline="${existente[0].upline_email ?? "—"}") — vai ser atualizada.`,
    );
  } else {
    console.log("\nAinda não existe — vai ser criada.");
  }

  if (!confirmar) {
    console.log(
      "\nNada foi gravado. Corre com CONFIRMAR=sim npm run adicionar-membro-equipa -- ... para gravar a sério.",
    );
    return;
  }

  await db().query(
    `insert into equipa_afiliados (email, nome, upline_email, estado, atualizado_em)
     values ($1, $2, $3, 'ACTIVE', now())
     on conflict (email) do update
       set nome = excluded.nome, upline_email = excluded.upline_email, atualizado_em = now()`,
    [emailNormalizado, nome, uplineNormalizado],
  );
  console.log("\nGravado.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
