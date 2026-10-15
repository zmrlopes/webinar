/**
 * Muda o email e apaga um consultor fictício na base de dados real, dentro de
 * uma transação que é sempre revertida no fim — nada fica gravado.
 */
import "./_env";
import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import { db, fecharDb } from "../src/lib/db";
import { alterarConsultorAdmin, apagarConsultorAdmin, ErroConsultorAdmin } from "../src/lib/consultores-admin";

const antigo = "antigo-teste@example.test", novo = "novo-teste@example.test", lider = "lider-teste@example.test";
const filho = "filho-teste@example.test", outro = "outro-teste@example.test";

const pool = db(), cliente = await pool.connect(), connectOriginal = pool.connect.bind(pool);
const consulta = (sql: string, valores: unknown[] = []) => cliente.query(sql, valores);
// As funções abrem a sua própria transação; aqui passam a usar savepoints dentro da nossa.
const embrulhado = {
  query: (sql: string, valores?: unknown[]) => cliente.query(
    sql === "begin" ? "savepoint t" : sql === "commit" ? "release savepoint t" : sql === "rollback" ? "rollback to savepoint t" : sql,
    valores),
  release: () => {},
} as unknown as PoolClient;
pool.connect = (async () => embrulhado) as typeof pool.connect;

try {
  await consulta("begin");
  await consulta(`insert into equipa_afiliados (email, nome, upline_email) values
    ($1, 'Líder', null), ($2, 'Antigo Nome', $1), ($3, 'Filho', $2), ($4, 'Outro', $1)`, [lider, antigo, filho, outro]);
  await consulta(`insert into links_consultor (referencia, referencia_email, nome) values ('teste-ref-xyz', $1, 'Antigo Nome')`, [antigo]);
  await consulta(`insert into respostas_trofeus (email, quero, ja_tenho) values ($1, '{}', '{faturacao-100k}')`, [antigo]);
  await consulta(`insert into push_subscriptions (email, endpoint, p256dh, auth) values ($1, 'https://teste.example/xyz', 'p', 'a')`, [antigo]);
  await consulta(`insert into dashboard_config (chave, valor) values ($1, $2::jsonb)`,
    [`core-rank:2026:dia:${antigo}:2026-10-01`, JSON.stringify({email: antigo, data: "2026-10-01"})]);

  await assert.rejects(alterarConsultorAdmin({emailAtual: antigo, nome: "X", email: outro}),
    (e: unknown) => e instanceof ErroConsultorAdmin && e.status === 409, "Não pode ficar com o email de outro consultor");
  await assert.rejects(alterarConsultorAdmin({emailAtual: "nao-existe@example.test", nome: "X", email: "x@example.test"}),
    (e: unknown) => e instanceof ErroConsultorAdmin && e.status === 404);

  assert.deepEqual(await alterarConsultorAdmin({emailAtual: antigo, nome: " Novo Nome ", email: " NOVO-TESTE@example.test "}), {nome: "Novo Nome", email: novo});
  assert.equal((await consulta(`select 1 from equipa_afiliados where email = $1`, [antigo])).rowCount, 0);
  assert.equal((await consulta(`select nome from equipa_afiliados where email = $1`, [novo])).rows[0].nome, "Novo Nome");
  assert.equal((await consulta(`select upline_email from equipa_afiliados where email = $1`, [filho])).rows[0].upline_email, novo);
  assert.deepEqual((await consulta(`select referencia_email, nome from links_consultor where referencia = 'teste-ref-xyz'`)).rows[0],
    {referencia_email: novo, nome: "Novo Nome"}, "O link de partilha mantém o mesmo código");
  assert.deepEqual((await consulta(`select ja_tenho from respostas_trofeus where email = $1`, [novo])).rows[0].ja_tenho, ["faturacao-100k"]);
  assert.equal((await consulta(`select 1 from push_subscriptions where email = $1`, [novo])).rowCount, 1);
  const core = (await consulta(`select valor from dashboard_config where chave = $1`, [`core-rank:2026:dia:${novo}:2026-10-01`])).rows[0];
  assert.equal(core?.valor.email, novo, "O Core Rank segue o novo email");

  await apagarConsultorAdmin({email: novo});
  assert.equal((await consulta(`select 1 from equipa_afiliados where email = $1`, [novo])).rowCount, 0);
  assert.equal((await consulta(`select upline_email from equipa_afiliados where email = $1`, [filho])).rows[0].upline_email, lider,
    "A equipa de quem sai passa para o upline");
  assert.equal((await consulta(`select 1 from links_consultor where referencia_email = $1`, [novo])).rowCount, 0);
  assert.equal((await consulta(`select 1 from respostas_trofeus where email = $1`, [novo])).rowCount, 1, "O histórico fica");
  await assert.rejects(apagarConsultorAdmin({email: novo}), (e: unknown) => e instanceof ErroConsultorAdmin && e.status === 404);
  console.log("Consultores: mudança de email com histórico, email repetido recusado e apagar com equipa reatribuída verificados. Tudo revertido.");
} finally {
  await consulta("rollback");
  pool.connect = connectOriginal;
  cliente.release();
  await fecharDb();
}
