import assert from "node:assert/strict";
import { testemunhos, linkTestemunho } from "../src/lib/testemunhos";
import { gerarRespostasObjecao, lerRespostasGuardadas } from "../src/lib/objecoes";
import { db, fecharDb } from "../src/lib/db";
import fonte from "../docs/testemunhos-instagram/icligo.json";

async function main() {
  assert.equal(new Set(testemunhos.map(t => t.id)).size, testemunhos.length);
  const instagram = testemunhos.filter(t => t.plataforma === "instagram");
  const esperados = fonte.entradas.filter(e => e.usarNaBase !== false && e.tipo.startsWith("testemunho-"));
  assert.deepEqual(instagram.map(t => linkTestemunho(t)).sort(), esperados.map(e => e.url).sort());
  const ludmila = instagram.find(t => t.id === "instagram:DJzXOySKJGI")!;
  assert(ludmila?.titulo.includes("Ludmila"));
  assert.equal(linkTestemunho(ludmila), "https://www.instagram.com/reel/DJzXOySKJGI/");
  for (const t of testemunhos) {
    const link = new URL(linkTestemunho(t));
    assert.equal(link.protocol, "https:");
    assert.equal(link.hostname, t.plataforma === "instagram" ? "www.instagram.com" : "www.youtube.com");
  }

  const antigo = {id: "oiZoU76Mjok", titulo: "Testemunho antigo", duracao: "5:25", comoUsar: "Enviar"};
  assert.equal(linkTestemunho(lerRespostasGuardadas({respostas: ["Resposta"], testemunho: antigo})!.testemunho!), "https://www.youtube.com/watch?v=oiZoU76Mjok");

  // Sem ligações externas: testar o percurso real que valida o ID devolvido pela IA.
  const ambiente = {database: process.env.DATABASE_URL, anthropic: process.env.ANTHROPIC_API_KEY};
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
  process.env.ANTHROPIC_API_KEY = "teste-local";
  const pool = db(), queryOriginal = pool.query, fetchOriginal = globalThis.fetch;
  pool.query = (async (_sql: string) => ({rows: [], rowCount: 0, command: "SELECT", oid: 0, fields: []})) as typeof pool.query;
  let idEscolhido = ludmila.id;
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const pedido = JSON.parse(String(opcoes?.body));
    let texto: string;
    if (pedido.max_tokens === 200) texto = JSON.stringify({temas: []});
    else {
      assert(pedido.system.includes(ludmila.id));
      assert(pedido.system.includes(ludmila.resumo));
      assert(pedido.system.includes(ludmila.limites));
      texto = JSON.stringify({respostas: ["Primeira resposta", "Segunda resposta"], testemunho: {id: idEscolhido, comoUsar: "Partilhar a experiência respeitando o contexto."}});
    }
    return Response.json({content: [{type: "text", text: texto}]});
  };
  try {
    const novo = await gerarRespostasObjecao("Receio do investimento; testemunho da Ludmila", {comTestemunho: true});
    assert.equal(novo.testemunho?.url, ludmila.url);
    assert.equal(novo.testemunho?.plataforma, "instagram");
    assert.equal(linkTestemunho(lerRespostasGuardadas(novo)!.testemunho!), ludmila.url);
    idEscolhido = antigo.id;
    assert.equal((await gerarRespostasObjecao("Falta de tempo", {comTestemunho: true})).testemunho?.id, antigo.id);
    idEscolhido = "instagram:inexistente";
    assert.equal((await gerarRespostasObjecao("Outra dúvida", {comTestemunho: true})).testemunho, null);
  } finally {
    globalThis.fetch = fetchOriginal;
    pool.query = queryOriginal;
    await fecharDb();
    for (const [chave, valor] of [["DATABASE_URL", ambiente.database], ["ANTHROPIC_API_KEY", ambiente.anthropic]]) {
      if (valor === undefined) delete process.env[chave!]; else process.env[chave!] = valor;
    }
  }
  console.log(`${testemunhos.length} testemunhos: links Instagram/YouTube, contexto da Ludmila, seleção, histórico antigo e rejeição de IDs desconhecidos OK.`);
}

main().catch(erro => { console.error(erro); process.exitCode = 1; });
