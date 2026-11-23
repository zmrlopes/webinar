import assert from "node:assert/strict";
import { db, fecharDb } from "../src/lib/db";
import { obterAvisosConsultor } from "../src/lib/avisos-consultor";
import { avisoSondagemBeARock, avisoSondagemCruzeiro } from "../src/lib/sondagens-eventos";
import { QUESTIONARIOS } from "../src/lib/questionarios-lista";
import type { VotoCruzeiroTropaElite } from "../src/lib/cruzeiro-tropa-elite";

const agora = new Date("2026-11-23T12:00:00Z");
const cruzeiro: VotoCruzeiroTropaElite = {
  email: "ana@example.com", nome: "Ana", opcao: "SO_CRUZEIRO", acompanhantes: 0,
  dispostoDividirCabine: null, atualizadoEm: agora.toISOString(),
};

async function main() {
  assert(avisoSondagemBeARock(null, agora));
  for (const voto of ["NORTE", "SUL", "CASA"] as const) assert.equal(avisoSondagemBeARock(voto, agora), null);
  assert(avisoSondagemBeARock(null, new Date("2027-01-10T23:59:59Z")), "Mantém o aviso até ao fim do evento");
  assert.equal(avisoSondagemBeARock(null, new Date("2027-01-11T00:00:00Z")), null);
  assert(avisoSondagemCruzeiro(null, agora));
  assert(avisoSondagemCruzeiro(cruzeiro, agora)?.texto.includes("cabine"), "Uma resposta incompleta conta uma vez");
  for (const dispostoDividirCabine of [true, false]) assert.equal(avisoSondagemCruzeiro({ ...cruzeiro, dispostoDividirCabine }, agora), null);
  assert.equal(avisoSondagemCruzeiro({ ...cruzeiro, acompanhantes: 1 }, agora), null);
  assert.equal(avisoSondagemCruzeiro({ ...cruzeiro, opcao: "SO_BARCELONA" }, agora), null);
  assert(avisoSondagemCruzeiro(null, new Date("2027-04-29T22:59:59Z")));
  assert.equal(avisoSondagemCruzeiro(null, new Date("2027-04-29T23:00:00Z")), null, "Termina à meia-noite de Lisboa, incluindo a hora de verão");

  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), originalQuery = pool.query;
  const registos = new Map<string, unknown>();
  const chaveRock = (email: string) => `eventos:be-a-rock:2027:sondagem:${email}`;
  const chaveCruzeiro = (email: string) => `eventos:cruzeiro-tropa-elite:2027:sondagem:${email}`;
  pool.query = (async (sql: string, args: unknown[] = []) => {
    assert(sql.trim().startsWith("select"), "Consultar avisos nunca grava ou envia comunicações");
    if (sql.startsWith("select valor from dashboard_config where chave = $1")) {
      const valor = registos.get(String(args[0]));
      return { rows: valor ? [{ valor: structuredClone(valor) }] : [] };
    }
    if (sql.includes("select e.slug")) return { rows: [{ slug: QUESTIONARIOS[0]!.slug }] };
    if (sql.includes("as precisa")) return { rows: [{ precisa: true }] };
    throw new Error(`Consulta inesperada: ${sql}`);
  }) as typeof pool.query;
  try {
    const ana = "ana@example.com", bruno = "bruno@example.com";
    registos.set(chaveRock(bruno), { zona: "CASA" });
    registos.set(chaveCruzeiro(bruno), { ...cruzeiro, email: bruno, acompanhantes: 2 });
    const inicial = await obterAvisosConsultor(ana, agora);
    const anteriores = inicial.filter(a => a.categoria !== "sondagem");
    assert(anteriores.some(a => a.categoria === "evento"));
    assert(anteriores.some(a => a.categoria === "equipa"));
    assert.equal(inicial.length, anteriores.length + 2, "As duas sondagens somam aos questionários existentes");
    for (const aviso of inicial.filter(a => a.categoria === "sondagem")) {
      assert.equal(new URL(aviso.href, "http://localhost").searchParams.get("seccao"), "eventos-presenciais");
    }
    assert.deepEqual((await obterAvisosConsultor(bruno, agora)).filter(a => a.categoria === "sondagem"), [], "Os votos são privados por conta");
    registos.set(chaveRock(ana), { zona: "NORTE" });
    assert.equal((await obterAvisosConsultor(ana, agora)).length, anteriores.length + 1);
    registos.set(chaveCruzeiro(ana), cruzeiro);
    assert.equal((await obterAvisosConsultor(ana, agora)).length, anteriores.length + 1, "Não duplica o aviso da cabine");
    registos.set(chaveCruzeiro(ana), { ...cruzeiro, dispostoDividirCabine: false });
    assert.deepEqual(await obterAvisosConsultor(ana, agora), anteriores, "Responder retira só as sondagens concluídas");
    registos.clear();
    assert.deepEqual(await obterAvisosConsultor(ana, new Date("2027-04-30T12:00:00Z")), anteriores, "Eventos terminados deixam de contar");
    console.log("OK: sondagens nos avisos, contagem por conta, respostas incompletas, privacidade, ligações e fim dos eventos em Lisboa.");
  } finally { pool.query = originalQuery; await fecharDb(); }
}
main().catch(erro => { console.error(erro); process.exitCode = 1; });
