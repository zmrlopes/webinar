/** Duas ligações independentes à BD, isoladas num schema só com dados fictícios. */
import "./_env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, fecharDb } from "../src/lib/db";
import { construirCoreGrupo } from "../src/lib/core-rank-grupo";
import { guardarAssociacaoCoreGrupo, guardarAtualizacaoCoreGrupo } from "../src/lib/core-rank-grupo-servidor";
import type { MembroCoreDiretos } from "../src/lib/core-rank-diretos";

const schema = "teste_core_grupo_" + randomUUID().replaceAll("-", "");
assert(/^teste_core_grupo_[a-f0-9]{32}$/.test(schema));
// O teste precisa de duas sessões persistentes; não usar o pooler de transações.
const ligacao = new URL(process.env.DATABASE_URL!);
ligacao.hostname = ligacao.hostname.replace("-pooler.", ".");
process.env.DATABASE_URL = ligacao.toString();
const pool = db(), ligar = pool.connect.bind(pool);
const admin = await ligar();
const criadas = new Set<number>();
try {
  await admin.query(`create schema ${schema}`);
  await admin.query(`create table ${schema}.dashboard_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz default now())`);
  await admin.query(`create table ${schema}.dashboard_bruto (chave text primary key, corpo jsonb not null)`);
  // Cada pedido recebe uma sessão PostgreSQL com o mesmo armazenamento do servidor.
  pool.connect = (async () => {
    const client = await ligar();
    await client.query(`set search_path to ${schema}`);
    const pid = await client.query<{pid: number}>("select pg_backend_pid() as pid");
    criadas.add(pid.rows[0]!.pid);
    return client;
  }) as typeof pool.connect;
  const membro = (username: string): MembroCoreDiretos => ({username, email: `${username}@example.test`, nome: username, entrada: "2020-01-01", upline: "", estado: "ACTIVE", reservas: 55, subscricoes: 0});
  const membros = [membro("existente"), membro("um"), membro("dois")];
  const dados = construirCoreGrupo(membros, {nome: "Teste", consultadoEm: "2026-10-29", membros: [
    {nome: "Existente", username: "existente"}, {nome: "Contacto um", username: null}, {nome: "Contacto dois", username: null},
  ]}, "2026-10-01", "2026-10-29", "fixture");
  await admin.query(`insert into ${schema}.dashboard_config (chave, valor) values ('core_rank_grupo', $1)`, [JSON.stringify(dados)]);
  const paginas = [membros.slice(0, 1), membros.slice(1)];
  const bruto = {plano: {periodos: [{chave: "mes-2026-10", inicio: dados.desde, fim: dados.ate}]},
    ...Object.fromEntries(paginas.map((p, i) => [`equipa-mes-2026-10:p${i}`, {list: {totalElements: membros.length, content: p.map(m => ({user: {username: m.username, email: m.email, name: m.nome, creationDate: m.entrada}, stats: {sales: m.reservas}}))}}]))};
  for (const [chave, corpo] of Object.entries(bruto)) await admin.query(`insert into ${schema}.dashboard_bruto (chave, corpo) values ($1, $2)`, [chave, JSON.stringify(corpo)]);
  // Sem árvore prévia e sem ficheiros: a primeira gravação recupera-a da BD.
  await Promise.all([guardarAssociacaoCoreGrupo(1, "Contacto um", "um@example.test"), guardarAssociacaoCoreGrupo(2, "Contacto dois", "dois@example.test")]);
  assert(criadas.size >= 2, "Usar duas sessões reais para verificar concorrência");
  const ler = async () => (await admin.query(`select chave, valor from ${schema}.dashboard_config order by chave`)).rows;
  const linhas = await ler();
  const guardado = linhas.find(c => c.chave === "core_rank_grupo")!.valor;
  assert.deepEqual(guardado.grupo.membros.map((m: {username: string}) => m.username), ["existente", "um", "dois"], "Duas sessões preservam as associações uma da outra");
  assert.equal(guardado.consultores.length, 3);
  assert.deepEqual(guardado.consultores[0], dados.consultores[0]);
  assert.equal(linhas.find(c => c.chave === "core_rank_grupo_arvore")!.valor.length, 3);
  await guardarAssociacaoCoreGrupo(1, "Contacto um", "um@example.test");
  assert.deepEqual(await ler(), linhas, "Repetir o mesmo pedido não duplica nem altera os dados");
  assert.equal(await guardarAtualizacaoCoreGrupo(dados, dados, membros), false, "Uma sincronização antiga não apaga associações feitas noutro computador");
  assert.deepEqual(await ler(), linhas);
  await assert.rejects(guardarAssociacaoCoreGrupo(1, "Nome de uma lista antiga", "um@example.test"), /lista mudou/);
  assert.deepEqual(await ler(), linhas, "Um pedido de uma lista antiga não grava nada");
  await assert.rejects(guardarAssociacaoCoreGrupo(1, "Contacto um", "ausente@example.test"), /única conta/);
  assert.deepEqual(await ler(), linhas, "Um email não identificado não grava nada");
  console.log("Core Rank servidor: recuperação sem ficheiros, duas sessões concorrentes, repetição, lista antiga e sincronização sem perda de associações verificados.");
} finally {
  pool.connect = ligar as typeof pool.connect;
  await admin.query(`drop schema if exists ${schema} cascade`);
  admin.release();
  await fecharDb();
}
