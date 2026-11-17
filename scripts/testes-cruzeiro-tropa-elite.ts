import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db, fecharDb } from "../src/lib/db";
import { CRUZEIRO_TROPA_ELITE, resumirVotosCruzeiroTropaElite, type VotoCruzeiroTropaElite } from "../src/lib/cruzeiro-tropa-elite";
import { listarVotosCruzeiroTropaElite } from "../src/lib/cruzeiro-tropa-elite-servidor";
import { POST } from "../app/api/consultor/nova-area/eventos/cruzeiro-tropa-elite/route";
import { proxy } from "../proxy";
import { EMAIL_PAINEL_DEMONSTRACAO } from "../src/lib/demo";

const pedido = (corpo: unknown) => new Request("http://localhost/api", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
});

async function main() {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), originalQuery = pool.query;
  const registos = new Map<string, VotoCruzeiroTropaElite>();
  const equipa = new Map([["ana@example.com", "Ana"], ["bruno@example.com", "Bruno"]]);
  let escritas = 0;
  pool.query = (async (sql: string, args: unknown[] = []) => {
    if (sql.startsWith("select nome from equipa_afiliados")) return { rows: equipa.has(String(args[0])) ? [{ nome: equipa.get(String(args[0])) }] : [] };
    if (sql.startsWith("select valor from dashboard_config where chave = $1")) return { rows: registos.has(String(args[0])) ? [{ valor: structuredClone(registos.get(String(args[0]))) }] : [] };
    if (sql.startsWith("select valor from dashboard_config where starts_with")) return { rows: [...registos].filter(([k]) => k.startsWith(String(args[0]))).map(([, valor]) => ({ valor: structuredClone(valor) })) };
    if (sql.startsWith("insert into dashboard_config")) {
      assert(sql.includes("on conflict (chave) do update"), "Gravação atómica por conta");
      registos.set(String(args[0]), JSON.parse(String(args[1]))); escritas++;
      return { rows: [] };
    }
    throw new Error(`Consulta inesperada: ${sql}`);
  }) as typeof pool.query;
  try {
    assert.equal(CRUZEIRO_TROPA_ELITE.inicio, "2027-04-22"); assert.equal(CRUZEIRO_TROPA_ELITE.fim, "2027-04-29");
    assert.deepEqual(resumirVotosCruzeiroTropaElite([]), { total: 0, totalAcompanhantes: 0, dispostosDividirCabine: [], CRUZEIRO_BARCELONA: [], SO_CRUZEIRO: [], SO_BARCELONA: [] });
    for (const corpo of [null, {}, { email: "ana@example.com", acao: "apagar" }, { email: "ana@example.com", acao: "votar", opcao: "SO_AVIAO" }]) {
      assert.equal((await POST(pedido(corpo))).status, 400);
    }
    for (const email of ["", "fora@example.com", EMAIL_PAINEL_DEMONSTRACAO]) {
      assert.equal((await POST(pedido({ email, acao: "votar", opcao: "SO_BARCELONA" }))).status, 403, "A votação exige conta na equipa, incluindo a demonstração");
    }
    assert.equal(escritas, 0, "Pedidos inválidos não gravam");
    const consultar = async (email: string) => {
      const resposta = await POST(pedido({ email, acao: "consultar" }));
      assert.equal(resposta.status, 200);
      assert.equal(resposta.headers.get("cache-control"), "private, no-store");
      return resposta.json();
    };
    assert.deepEqual(await consultar("ana@example.com"), { voto: null });
    const votar = async (email: string, opcao: string, acompanhantes?: number, dispostoDividirCabine?: unknown) => {
      const resposta = await POST(pedido({ email, acao: "votar", opcao, acompanhantes, dispostoDividirCabine, nome: "Nome falsificado" }));
      assert.equal(resposta.status, 200);
      const corpo = await resposta.json();
      assert.equal(corpo.voto.opcao, opcao);
      return corpo.voto as VotoCruzeiroTropaElite;
    };

    // Opção sem cruzeiro: acompanhantes e cabine nunca são gravados, mesmo que pedidos.
    let voto = await votar(" ANA@EXAMPLE.COM ", "SO_BARCELONA", 3, true);
    assert.equal(voto.acompanhantes, 0, "Só BARCELONA não pergunta acompanhantes");
    assert.equal(voto.dispostoDividirCabine, null, "Só BARCELONA não pergunta sobre a cabine");
    assert.deepEqual(await consultar("ana@example.com"), { voto });

    // Opção com cruzeiro: grava o número de acompanhantes, limitado ao máximo e a inteiros não negativos.
    voto = await votar("ana@example.com", "SO_CRUZEIRO", 2);
    assert.equal(voto.acompanhantes, 2);
    assert.equal(voto.dispostoDividirCabine, null, "Com acompanhantes não pergunta sobre a cabine");
    voto = await votar("ana@example.com", "CRUZEIRO_BARCELONA", 999);
    assert.equal(voto.acompanhantes, 10, "Acompanhantes é limitado ao máximo");
    voto = await votar("ana@example.com", "CRUZEIRO_BARCELONA", -5);
    assert.equal(voto.acompanhantes, 0, "Acompanhantes nunca é negativo");

    // Sem acompanhantes, no cruzeiro: pergunta e grava a disponibilidade para dividir cabine.
    assert.equal(voto.dispostoDividirCabine, null, "Ainda não respondeu sobre a cabine");
    voto = await votar("ana@example.com", "CRUZEIRO_BARCELONA", 0, true);
    assert.equal(voto.dispostoDividirCabine, true);
    voto = await votar("ana@example.com", "CRUZEIRO_BARCELONA", 0, false);
    assert.equal(voto.dispostoDividirCabine, false);
    voto = await votar("ana@example.com", "CRUZEIRO_BARCELONA", 0, "sim" /* valor inválido */);
    assert.equal(voto.dispostoDividirCabine, null, "Só aceita true/false explícitos");

    assert.deepEqual(await consultar("bruno@example.com"), { voto: null }, "Não expõe o voto de outro consultor");
    await Promise.all(Array.from({ length: 10 }, () => votar("ana@example.com", "CRUZEIRO_BARCELONA", 0, true)));
    assert.equal(registos.size, 1, "Repetições não duplicam o voto");

    await votar("bruno@example.com", "SO_CRUZEIRO", 0, true);
    let votos = await listarVotosCruzeiroTropaElite();
    assert.deepEqual(votos.map(v => v.nome), ["Ana", "Bruno"], "Os nomes vêm da equipa");
    let resumo = resumirVotosCruzeiroTropaElite(votos);
    assert.equal(resumo.total, 2);
    assert.equal(resumo.CRUZEIRO_BARCELONA.length, 1);
    assert.equal(resumo.SO_CRUZEIRO.length, 1);
    assert.equal(resumo.totalAcompanhantes, 0, "Sem acompanhantes nesta fase");
    assert.equal(resumo.dispostosDividirCabine.length, 2, "Ana e Bruno disponíveis para dividir cabine");

    equipa.set("carla@example.com", "Carla");
    await votar("carla@example.com", "SO_BARCELONA");
    votos = await listarVotosCruzeiroTropaElite(); resumo = resumirVotosCruzeiroTropaElite(votos);
    assert.equal(resumo.total, 3); assert.equal(resumo.SO_BARCELONA.length, 1); assert.equal(resumo.SO_BARCELONA[0]!.nome, "Carla");
    assert.equal(resumo.dispostosDividirCabine.length, 2, "Barcelona isolada não entra na contagem da cabine");

    equipa.delete("ana@example.com");
    assert.equal((await POST(pedido({ email: "ana@example.com", acao: "votar", opcao: "SO_BARCELONA" }))).status, 403, "Revalida a pertença à equipa");

    const senha = process.env.ADMIN_PASSWORD;
    try {
      process.env.ADMIN_PASSWORD = "senha-de-teste";
      assert.equal(proxy(new NextRequest("http://localhost/admin/eventos")).status, 401, "Resultados e identidades reservados ao admin");
    } finally { if (senha === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = senha; }
    console.log("Cruzeiro Tropa de Elite: acesso, privacidade, persistência, voto único, acompanhantes, divisão de cabine e totais por opção verificados.");
  } finally { pool.query = originalQuery; await fecharDb(); }
}
main().catch(erro => { console.error(erro); process.exitCode = 1; });
