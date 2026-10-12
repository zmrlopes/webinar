/** Valida o acesso com dados fictícios em tabela temporária, sem registos reais nem emails. */
import "./_env";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { db, fecharDb } from "../src/lib/db";
import { ErroConsultorAdmin, validarNovoConsultor } from "../src/lib/consultores-admin";
import { buscarMembroEquipa } from "../src/lib/equipa";
import { POST } from "../app/api/admin/consultores/route";
import { proxy } from "../proxy";

const novo = {nome: "Ana João Teste", email: "ana@example.test"};
assert.deepEqual(validarNovoConsultor({nome: "  Ana João Teste  ", email: " ANA@EXAMPLE.TEST "}), novo);
for (const valor of [null, [], {}, {nome: " ", email: novo.email}, {nome: 42, email: novo.email},
  {nome: "A".repeat(201), email: novo.email}, ...["inválido", "ana@", "ana@example.", "ana@.test", "ana@ex..test", "ana @example.test", "ana@@example.test", "a".repeat(250) + "@example.test"].map(email => ({nome: novo.nome, email}))]) {
  assert.throws(() => validarNovoConsultor(valor), ErroConsultorAdmin);
}

const senhaOriginal = process.env.ADMIN_PASSWORD, utilizadorOriginal = process.env.ADMIN_USER;
try {
  delete process.env.ADMIN_PASSWORD;
  assert.equal(proxy(new NextRequest("https://exemplo.test/api/admin/consultores")).status, 401);
  process.env.ADMIN_PASSWORD = "teste-consultores"; process.env.ADMIN_USER = "admin";
  assert.equal(proxy(new NextRequest("https://exemplo.test/api/admin/consultores", {method: "POST"})).status, 401);
  assert.equal(proxy(new NextRequest("https://exemplo.test/api/admin/consultores", {headers: {Authorization: `Basic ${btoa("admin:errada")}`}})).status, 401);
  assert.equal(proxy(new NextRequest("https://exemplo.test/api/admin/consultores", {headers: {Authorization: `Basic ${btoa("admin:teste-consultores")}`}})).status, 200);
} finally {
  if (senhaOriginal === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = senhaOriginal;
  if (utilizadorOriginal === undefined) delete process.env.ADMIN_USER; else process.env.ADMIN_USER = utilizadorOriginal;
}

const pool = db(), queryOriginal = pool.query;
const planos: {consulta: string; valores: unknown[]}[] = [];
let insercoes = 0;
pool.query = (async (consulta: string, valores: unknown[] = []) => {
  planos.push({consulta, valores});
  if (consulta.startsWith("insert")) return {rows: ++insercoes === 1 ? [novo] : []};
  return {rows: [{nome: novo.nome}]};
}) as typeof pool.query;
function pedido(valor: unknown) { return new Request("https://exemplo.test/api/admin/consultores", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(valor)}); }
try {
  assert.equal((await POST(pedido({nome: "", email: "errado"}))).status,400);
  assert.equal((await POST(new Request("https://exemplo.test/api/admin/consultores", {method: "POST", body: "{"}))).status,400);
  assert.equal(planos.length,0, "Dados inválidos não chegam à base de dados");
  const resposta = await POST(pedido({nome: "  Ana João Teste  ", email: " ANA@EXAMPLE.TEST "}));
  assert.equal(resposta.status,201); assert.deepEqual(await resposta.json(), {consultor: novo});
  assert.deepEqual(await buscarMembroEquipa(novo.email), {nome: novo.nome});
  assert.equal((await POST(pedido(novo))).status,409);
  assert.equal((await POST(pedido({nome: "Nome substituto", email: "EXISTENTE@EXAMPLE.TEST"}))).status,409);
} finally { pool.query = queryOriginal; await fecharDb(); }

const sql = neon(process.env.DATABASE_URL!);
const resultados = await sql.transaction([
  sql.query("create temp table equipa_afiliados (like public.equipa_afiliados including defaults including constraints including indexes) on commit drop"),
  sql.query("insert into equipa_afiliados (email, nome, upline_email, nivel, estado, vendas, pontos, data_registo) values ('existente@example.test', 'Nome original', 'lider@example.test', 'CORE', 'INACTIVE', 1234, 50, '2026-09-01')"),
  ...planos.map(p => sql.query(p.consulta, p.valores)),
  sql.query("select email, nome, upline_email, nivel, estado, vendas::text, pontos::text, data_registo::text from equipa_afiliados order by email"),
]);
assert.deepEqual(resultados[2], [novo]);
assert.deepEqual(resultados[3], [{nome: novo.nome}], "O mesmo controlo de acesso reconhece o novo consultor");
assert.deepEqual(resultados[4], [], "Repetir o email não duplica o consultor");
assert.deepEqual(resultados[5], [], "Um membro importado não é alterado pelo formulário");
const membros = resultados.at(-1)!;
assert.equal(membros.length,2);
assert.equal(membros[0]!.estado,"ACTIVE");
assert.equal(membros[0]!.nome,novo.nome);
const existente = membros[1]!;
assert.equal(existente.nome,"Nome original"); assert.equal(existente.upline_email,"lider@example.test");
assert.equal(existente.nivel,"CORE"); assert.equal(existente.estado,"INACTIVE");
assert.equal(Number(existente.vendas),1234); assert.equal(Number(existente.pontos),50);
assert(String(existente.data_registo).startsWith("2026-09-01"));
console.log("Consultores: nome/email validados, acesso imediato, duplicados recusados, dados existentes preservados e autenticação de administrador verificados em tabela temporária. Sem emails ou alterações a dados reais.");
