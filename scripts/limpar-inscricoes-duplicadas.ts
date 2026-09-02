/**
 * Encontra inscrições duplicadas (o mesmo email, na mesma sessão) em todo o
 * sistema — webinars, formações, tudo — e cancela as extras, mantendo
 * sempre uma por pessoa/sessão. Nunca apaga a linha: usa o mesmo
 * soft-delete (cancelada_em) do botão "Cancelar inscrição" no admin.
 *
 * Qual delas fica: primeiro quem tiver presença 'attended' registada (para
 * nunca perder um registo de presença real); a seguir, a mais antiga
 * (criado_em) — assumindo que é a inscrição original, as outras vieram de
 * duplo clique, formulário reenviado, etc.
 *
 * Corre com: npm run limpar-inscricoes-duplicadas
 * Sem CONFIRMAR=sim, só mostra o que iria cancelar (nada é gravado).
 * Para cancelar a sério: CONFIRMAR=sim npm run limpar-inscricoes-duplicadas
 */

import "./_env";
import { db, fecharDb } from "../src/lib/db";

interface Linha {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  webinarId: string;
  titulo: string;
  presenca: string;
  criadoEm: Date;
}

async function main(): Promise<void> {
  const confirmar = process.env.CONFIRMAR === "sim";

  const { rows } = await db().query<{
    id: string;
    nome: string;
    apelido: string;
    email: string;
    webinar_id: string;
    titulo: string;
    presenca: string;
    criado_em: Date;
  }>(
    `select r.id, r.nome, r.apelido, r.email, r.webinar_id, w.titulo, r.presenca, r.criado_em
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.cancelada_em is null
     order by r.webinar_id, r.email,
       (r.presenca = 'attended') desc,
       r.criado_em asc`,
  );

  const linhas: Linha[] = rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    apelido: r.apelido,
    email: r.email,
    webinarId: r.webinar_id,
    titulo: r.titulo,
    presenca: r.presenca,
    criadoEm: r.criado_em,
  }));

  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    const chave = `${l.webinarId}::${l.email}`;
    const lista = grupos.get(chave) ?? [];
    lista.push(l);
    grupos.set(chave, lista);
  }

  const aCancelar: Linha[] = [];
  let gruposComDuplicados = 0;

  for (const grupo of grupos.values()) {
    if (grupo.length <= 1) continue;
    gruposComDuplicados++;
    const [manter, ...extras] = grupo;
    console.log(`\n"${manter!.titulo}" — ${manter!.email} (${grupo.length}x)`);
    console.log(`  mantém: ${manter!.nome} ${manter!.apelido} — presença=${manter!.presenca}, inscrito em ${manter!.criadoEm.toISOString()}`);
    for (const e of extras) {
      console.log(`  cancela: ${e.nome} ${e.apelido} — presença=${e.presenca}, inscrito em ${e.criadoEm.toISOString()}`);
      aCancelar.push(e);
    }
  }

  console.log(`\n${gruposComDuplicados} sessão(ões)/pessoa(s) com duplicados, ${aCancelar.length} inscrição(ões) a cancelar no total.`);

  if (!confirmar) {
    console.log(
      "\nNada foi cancelado. Corre com CONFIRMAR=sim npm run limpar-inscricoes-duplicadas para cancelar a sério.",
    );
    return;
  }

  for (const l of aCancelar) {
    await db().query(`update registrations set cancelada_em = now() where id = $1`, [l.id]);
  }
  console.log("\nCancelado.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
