import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db, fecharDb } from "../src/lib/db";
import { BE_A_ROCK, resumirVotosBeARock, type VotoBeARock } from "../src/lib/be-a-rock";
import { listarVotosBeARock } from "../src/lib/be-a-rock-servidor";
import { POST } from "../app/api/consultor/nova-area/eventos/be-a-rock/route";
import { proxy } from "../proxy";
import { EMAIL_PAINEL_DEMONSTRACAO } from "../src/lib/demo";

const pedido = (corpo: unknown) => new Request("http://localhost/api", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
});

async function main() {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), originalQuery = pool.query;
  const registos = new Map<string, VotoBeARock>();
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
    assert.equal(BE_A_ROCK.inicio, "2027-01-08"); assert.equal(BE_A_ROCK.fim, "2027-01-10");
    assert.deepEqual(resumirVotosBeARock([]), { total: 0, NORTE: [], SUL: [] });
    for (const corpo of [null, {}, { email: "ana@example.com", acao: "apagar" }, { email: "ana@example.com", acao: "votar", zona: "CENTRO" }]) {
      assert.equal((await POST(pedido(corpo))).status, 400);
    }
    for (const email of ["", "fora@example.com", EMAIL_PAINEL_DEMONSTRACAO]) {
      assert.equal((await POST(pedido({ email, acao: "votar", zona: "NORTE" }))).status, 403, "A votação exige conta na equipa, incluindo a demonstração");
    }
    assert.equal(escritas, 0, "Pedidos inválidos não gravam");
    const consultar = async (email: string) => {
      const resposta = await POST(pedido({ email, acao: "consultar" }));
      assert.equal(resposta.status, 200);
      assert.equal(resposta.headers.get("cache-control"), "private, no-store");
      return resposta.json();
    };
    assert.deepEqual(await consultar("ana@example.com"), { voto: null });
    const votar = async (email: string, zona: string) => {
      const resposta = await POST(pedido({ email, acao: "votar", zona, nome: "Nome falsificado" }));
      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), { voto: zona });
    };
    await votar(" ANA@EXAMPLE.COM ", "NORTE");
    assert.deepEqual(await consultar("ana@example.com"), { voto: "NORTE" });
    assert.deepEqual(await consultar("bruno@example.com"), { voto: null }, "Não expõe o voto de outro consultor");
    await Promise.all(Array.from({ length: 10 }, () => votar("ana@example.com", "NORTE")));
    assert.equal(registos.size, 1, "Repetições não duplicam o voto");
    await votar("bruno@example.com", "SUL");
    let votos = await listarVotosBeARock();
    assert.deepEqual(votos.map(v => v.nome), ["Ana", "Bruno"], "Os nomes vêm da equipa");
    let resumo = resumirVotosBeARock(votos);
    assert.equal(resumo.total, 2); assert.equal(resumo.NORTE.length, 1); assert.equal(resumo.SUL.length, 1);
    await votar("ana@example.com", "SUL");
    votos = await listarVotosBeARock(); resumo = resumirVotosBeARock(votos);
    assert.equal(resumo.total, 2); assert.equal(resumo.NORTE.length, 0); assert.equal(resumo.SUL.length, 2);
    assert.deepEqual(await consultar("ana@example.com"), { voto: "SUL" }, "A escolha fica guardada para nova visita");
    equipa.delete("ana@example.com");
    assert.equal((await POST(pedido({ email: "ana@example.com", acao: "votar", zona: "NORTE" }))).status, 403, "Revalida a pertença à equipa");
    const senha = process.env.ADMIN_PASSWORD;
    try {
      process.env.ADMIN_PASSWORD = "senha-de-teste";
      assert.equal(proxy(new NextRequest("http://localhost/admin/eventos")).status, 401, "Resultados e identidades reservados ao admin");
    } finally { if (senha === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = senha; }
    console.log("Be a Rock: acesso, privacidade, persistência, voto único, alteração e totais Norte/Sul verificados.");
  } finally { pool.query = originalQuery; await fecharDb(); }
}
main().catch(erro => { console.error(erro); process.exitCode = 1; });
