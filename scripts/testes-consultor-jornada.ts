import assert from "node:assert/strict";
import { calcularJornadaConsultor } from "../src/lib/consultor-jornada";
import { ESCADA_PATAMARES } from "../src/lib/patamares-carreira";
import { db, fecharDb } from "../src/lib/db";
import { POST } from "../app/api/consultor/nova-area/jornada/route";

const atualizado = "2026-11-17T10:00:00Z";
const junior = calcularJornadaConsultor("JUNIOR", "12.5", atualizado);
assert.equal(junior.patamarAtual, "Júnior");
assert.equal(junior.proximoPatamar, "Sénior");
assert.equal(junior.metaPontos, 15); assert.equal(junior.faltam, 2.5);
assert.equal(junior.pontos, 12.5); assert.equal(junior.estado, "progresso");
assert(Math.abs(junior.percentagem! - 83.3333333333) < .001);
assert.equal(calcularJornadaConsultor(" jÚnior ", 0, atualizado).percentagem, 0);
assert.equal(calcularJornadaConsultor("SENIOR", 50.25, atualizado).faltam, 24.75);
const rumoPrata = calcularJornadaConsultor("BRONZE", 10000, atualizado);
assert.equal(rumoPrata.proximoPatamar, "Prata"); assert.equal(rumoPrata.metaPontos, 12500);
assert.equal(rumoPrata.faltam, 2500); assert.equal(rumoPrata.percentagem, 80);
assert.equal(rumoPrata.estado, "progresso");
assert.deepEqual(rumoPrata.estrutura?.requisitos.map(r => [r.patamar, r.necessarios]), [["Diretor", 2], ["Coordenador", 3]]);
assert.equal(calcularJornadaConsultor("BRONZE", 12499.99, atualizado).faltam, .01);
assert.equal(calcularJornadaConsultor("BRONZE", 12500, atualizado).estado, "meta-atingida");
for (let i = 0; i < ESCADA_PATAMARES.length - 1; i++) {
  const atual = ESCADA_PATAMARES[i]!, seguinte = ESCADA_PATAMARES[i + 1]!;
  const jornada = calcularJornadaConsultor(atual.nome, atual.pontos, atualizado);
  assert.equal(jornada.proximoPatamar, seguinte.nome);
  assert.equal(jornada.metaPontos, seguinte.pontos);
  assert.equal(jornada.faltam, seguinte.pontos - atual.pontos);
  const meta = calcularJornadaConsultor(atual.nome, seguinte.pontos, atualizado);
  assert.equal(meta.estado, "meta-atingida"); assert.equal(meta.percentagem, 100); assert.equal(meta.faltam, 0);
  assert.equal(meta.patamarAtual, atual.nome, "Os pontos não promovem a conta automaticamente");
}
const coordenador = calcularJornadaConsultor("COORDENADOR", 1739.36, atualizado);
assert.equal(coordenador.patamarAtual, "Coordenador"); assert.equal(coordenador.proximoPatamar, "Diretor");
assert.equal(coordenador.estado, "meta-atingida"); assert.equal(coordenador.faltam, 0); assert.equal(coordenador.percentagem, 100);
const ouro = calcularJornadaConsultor("OURO", 35000, atualizado);
assert.equal(ouro.estado, "progresso"); assert.equal(ouro.proximoPatamar, "Platina"); assert.equal(ouro.metaPontos, 225000);
assert.equal(calcularJornadaConsultor("SILVER", 12500, atualizado).metaPontos, 50000);
for (const [nivel, nome, meta] of [["COORDINATOR", "Coordenador", 1000], ["DIRECTOR", "Diretor", 3500], ["GOLD", "Ouro", 225000], ["PLATINUM", "Platina", 1125000], ["SAFIRE", "Safira", 6500000]] as const) {
  const jornada = calcularJornadaConsultor(nivel, 0, atualizado);
  assert.equal(jornada.patamarAtual, nome); assert.equal(jornada.metaPontos, meta);
}
const esmeralda = calcularJornadaConsultor("EMERALD", 6500000, atualizado);
assert.equal(esmeralda.estado, "ultimo-patamar"); assert.equal(esmeralda.proximoPatamar, null); assert.equal(esmeralda.metaPontos, null);
for (const pontos of [null, undefined, NaN, Infinity, -1, "", " ", "inválido"]) {
  const jornada = calcularJornadaConsultor("JUNIOR", pontos, atualizado);
  assert.equal(jornada.estado, "sem-dados"); assert.equal(jornada.pontos, null); assert.equal(jornada.percentagem, null);
}
for (const nivel of [null, undefined, "", "DESCONHECIDO"]) {
  const jornada = calcularJornadaConsultor(nivel, 10, atualizado);
  assert.equal(jornada.estado, "sem-dados"); assert.equal(jornada.patamarAtual, null); assert.equal(jornada.pontos, 10);
}
assert.equal(calcularJornadaConsultor("MASTER", 100, "inválida").atualizadoEm, null);

process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
const pool = db(), originalQuery = pool.query;
const contas = new Map([
  ["ana@example.com", {nivel: "JUNIOR", pontos: "12.5", atualizado_em: new Date(atualizado)}],
  ["bruno@example.com", {nivel: "MASTER", pontos: "120", atualizado_em: new Date(atualizado)}],
  ["sem-pontos@example.com", {nivel: "JUNIOR", pontos: null, atualizado_em: new Date(atualizado)}],
]);
let consultasPessoais = 0;
pool.query = (async (sql: string, args: unknown[] = []) => {
  const email = String(args[0]);
  if (sql.startsWith("select nome from equipa_afiliados")) return {rows: contas.has(email) ? [{nome: "TP"}] : []};
  if (sql.startsWith("select nivel, pontos, atualizado_em")) {
    assert(sql.includes("where email = $1")); consultasPessoais++;
    return {rows: contas.has(email) ? [contas.get(email)] : []};
  }
  throw Error("Consulta inesperada: " + sql);
}) as typeof pool.query;
try {
  const pedido = (corpo: unknown) => new Request("http://localhost/api/consultor/nova-area/jornada", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo)});
  for (const corpo of [null, {}, {email: "sem-arroba"}, {email: "fora@example.com"}]) assert.equal((await POST(pedido(corpo))).status, 403);
  assert.equal(consultasPessoais, 0, "Não lê pontos de quem não tem acesso");
  const ana = await POST(pedido({email: " ANA@EXAMPLE.COM ", nivel: "OURO", pontos: 99999}));
  assert.equal(ana.status, 200); assert.equal(ana.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await ana.json(), {jornada: junior}, "Os pontos e patamar vêm apenas do registo da própria conta");
  const bruno = await (await POST(pedido({email: "bruno@example.com"}))).json();
  assert.equal(bruno.jornada.pontos, 120); assert.equal(bruno.jornada.patamarAtual, "Master");
  const semPontos = await (await POST(pedido({email: "sem-pontos@example.com"}))).json();
  assert.equal(semPontos.jornada.estado, "sem-dados"); assert.equal(semPontos.jornada.pontos, null);
  console.log("Jornada: escada, decimais, metas atingidas sem promoção, último patamar, dados ausentes e privacidade por conta verificados.");
} finally {pool.query = originalQuery; await fecharDb();}
