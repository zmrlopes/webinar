import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { db, fecharDb } from "../src/lib/db";
import { EMAIL_EQUIPA_ANA_BE_A_ROCK as ANA, resumirVotosBeARock } from "../src/lib/be-a-rock";
import { guardarVotoBeARock, listarVotosBeARock } from "../src/lib/be-a-rock-servidor";
import { POST } from "../app/api/consultor/nova-area/eventos/be-a-rock/resultados/route";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  try {
    const bytes = readFileSync(resolve(process.cwd(), "../.env"));
    const texto = bytes.toString(bytes[0] === 255 && bytes[1] === 254 ? "utf16le" : "utf8").replace(/^\uFEFF/, "");
    process.env.DATABASE_URL = texto.match(/^DATABASE_URL\s*=\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  } catch { /* A asserção abaixo explica a configuração em falta. */ }
}
assert(process.env.DATABASE_URL, "Falta DATABASE_URL para o teste de integração.");

const pool = db();
const client = await pool.connect();
const originalQuery = pool.query;
try {
  await client.query("begin");
  // Só tabelas temporárias nesta ligação; nenhum voto ou membro real é alterado.
  await client.query("create temporary table equipa_afiliados (email text primary key, nome text, upline_email text) on commit drop");
  await client.query("create temporary table dashboard_config (chave text primary key, valor jsonb, atualizado_em timestamptz default now()) on commit drop");
  pool.query = client.query.bind(client) as typeof pool.query;
  const membro = async (email: string, pai: string | null) => client.query("insert into equipa_afiliados values ($1, $1, $2)", [email, pai]);
  await membro(ANA, "geral@example.com");
  await membro("direto@example.com", ` ${ANA.toUpperCase()} `);
  await membro("marisa@example.com", "direto@example.com");
  await membro("profundo@example.com", "marisa@example.com");
  await membro("geral@example.com", null);
  await membro("outro@example.com", "geral@example.com");
  for (const email of [ANA, "direto@example.com", "marisa@example.com", "profundo@example.com", "geral@example.com", "outro@example.com"]) {
    await guardarVotoBeARock(email, email, email === ANA ? "NORTE" : "SUL");
  }
  const snapshot = async () => (await client.query("select * from dashboard_config order by chave")).rows;
  const antes = await snapshot();
  const geral = await listarVotosBeARock();
  const ana = await listarVotosBeARock("ana");
  assert.equal(geral.length, 2); assert.equal(ana.length, 4);
  assert(ana.some(v => v.email === "profundo@example.com"), "Inclui toda a descendência, mesmo sob outras líderes");
  assert(!geral.some(v => ana.some(a => a.email === v.email)), "Grupos sem sobreposição");
  assert.equal(resumirVotosBeARock(ana).NORTE.length, 1);
  assert.deepEqual(await snapshot(), antes, "Leitura não migra nem altera votos anteriores");

  const pedido = (email: string) => new Request("http://localhost/api", { method: "POST", body: JSON.stringify({email, ambito: "geral"}) });
  const resposta = await POST(pedido(ANA));
  assert.equal(resposta.status, 200); assert.deepEqual((await resposta.json()).votos, ana);
  assert.equal((await POST(pedido("direto@example.com"))).status, 403);

  await guardarVotoBeARock("profundo@example.com", "Profundo", "CASA");
  assert.equal((await listarVotosBeARock("ana")).length, 4);
  assert.deepEqual(await listarVotosBeARock(), geral, "Alterar voto da Ana preserva resultados gerais");
  await membro("novo@example.com", "profundo@example.com");
  await guardarVotoBeARock("novo@example.com", "Novo", "CASA");
  assert.equal((await listarVotosBeARock("ana")).length, 5, "Novos descendentes entram automaticamente");
  await client.query("update equipa_afiliados set upline_email = 'geral@example.com' where email = 'direto@example.com'");
  assert.equal((await listarVotosBeARock("ana")).length, 1, "Reclassifica pela hierarquia atual sem copiar votos");
  assert.equal((await listarVotosBeARock()).length, 6);
  await client.query("update equipa_afiliados set upline_email = $1 where email = 'direto@example.com'", [ANA]);
  await client.query("update equipa_afiliados set upline_email = 'profundo@example.com' where email = $1", [ANA]);
  await client.query("set local statement_timeout = '5s'");
  assert.equal((await listarVotosBeARock("ana")).length, 5, "Ciclos não duplicam votos nem bloqueiam a leitura");
  await client.query("delete from equipa_afiliados where email = $1", [ANA]);
  assert.equal((await POST(pedido(ANA))).status, 403, "Revalida a presença da líder na equipa");
  await client.query("truncate dashboard_config");
  assert.deepEqual(await listarVotosBeARock(), []); assert.deepEqual(await listarVotosBeARock("ana"), []);
  console.log("OK: SQL real — separação de votos existentes, hierarquia profunda, normalização, ciclos, novos membros, mudanças de equipa, voto único e acesso da Ana.");
} finally {
  pool.query = originalQuery;
  await client.query("rollback");
  client.release();
  await fecharDb();
}
