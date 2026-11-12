import assert from "node:assert/strict";
import {NextRequest} from "next/server";
import {db, fecharDb} from "../src/lib/db";
import {POST} from "../app/api/admin/consultores/email-teste/route";
import {proxy, config as configProxy} from "../proxy";

// Base e fornecedores substituídos: nenhum email ou pedido de rede real.
const chaves = ["DATABASE_URL", "BREVO_API_KEY", "ACTIVECAMPAIGN_API_KEY", "ACTIVECAMPAIGN_API_URL", "ACTIVECAMPAIGN_AUTOMATION_ID", "ACTIVECAMPAIGN_LISTA_CONSULTORES", "ADMIN_PASSWORD"];
const ambiente = Object.fromEntries(chaves.map(c => [c, process.env[c]]));
process.env.DATABASE_URL ||= "postgres://teste:teste@localhost/teste";
process.env.ADMIN_PASSWORD = "teste-local";
delete process.env.ACTIVECAMPAIGN_API_KEY;
delete process.env.ACTIVECAMPAIGN_API_URL;
delete process.env.ACTIVECAMPAIGN_AUTOMATION_ID;
delete process.env.BREVO_API_KEY;
const pool = db(), queryOriginal = pool.query, fetchOriginal = globalThis.fetch;
const tentativas = new Map<string, {id: string; estado: string}>();
const chamadas: {url: string; corpo: Record<string, unknown>}[] = [];
let falharFornecedor = false, falharRegisto = false;
Object.assign(pool, {query: async (sql: string, params: unknown[]) => {
  if (sql.startsWith("select nome, email")) return {rows: params[0] === "tp@example.com" ? [{nome: "Nome guardado", email: "tp@example.com"}] : []};
  if (sql.startsWith("insert into dashboard_config")) {
    assert.match(sql, /on conflict \(chave\) do update/);
    assert.match(sql, /where dashboard_config.atualizado_em <= now\(\) - interval '1 minute'/);
    const chave = String(params[0]);
    if (tentativas.has(chave)) return {rows: []};
    tentativas.set(chave, JSON.parse(String(params[1])));
    return {rows: [{chave}]};
  }
  if (sql.startsWith("update dashboard_config")) {
    assert.match(sql, /valor->>'id' = \$2/);
    if (falharRegisto) throw new Error("Base temporariamente indisponível");
    const tentativa = tentativas.get(String(params[0]));
    if (tentativa && tentativa.id === params[1]) tentativa.estado = String(params[2]);
    return {rows: []};
  }
  throw new Error("Consulta inesperada no teste");
}});
globalThis.fetch = async (input, init) => {
  const url = String(input), corpo = JSON.parse(String(init?.body ?? "{}"));
  chamadas.push({url, corpo});
  if (falharFornecedor) return Response.json({message: "Fornecedor recusou o pedido"}, {status: 500});
  if (url.endsWith("/v3/smtp/email")) return Response.json({messageId: "teste-local"}, {status: 201});
  if (url.endsWith("/api/3/contact/sync")) return Response.json({contact: {id: "123"}});
  if (url.endsWith("/api/3/contactLists") || url.endsWith("/api/3/contactAutomations")) return Response.json({});
  throw new Error("Pedido de rede inesperado: " + url);
};
const pedido = (corpo: unknown) => POST(new Request("https://plataforma.example/api/admin/consultores/email-teste", {
  method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo),
}));
const reiniciar = () => {tentativas.clear(); chamadas.length = 0; falharFornecedor = false; falharRegisto = false;};
try {
  assert(configProxy.matcher.includes("/api/admin/:path*"));
  assert.equal(proxy(new NextRequest("https://plataforma.example/api/admin/consultores/email-teste")).status, 401);
  for (const corpo of [null, {}, [], {email: ""}, {email: "invalido"}, {email: "a@example.com\r\nBcc: b@example.com"}]) {
    assert.equal((await pedido(corpo)).status, 400);
  }
  assert.equal((await POST(new Request("https://plataforma.example/api", {method: "POST", body: "{"}))).status, 400);
  assert.equal((await pedido({email: "fora@example.com"})).status, 404);
  assert.equal((await pedido({email: "tp@example.com"})).status, 503, "Sem fornecedor, não simula sucesso com o ConsoleEmailSender.");
  assert.equal(chamadas.length, 0);
  assert.equal(tentativas.size, 0);

  process.env.BREVO_API_KEY = "teste-sem-rede";
  const resposta = await pedido({email: " TP@EXAMPLE.COM ", nome: "Ignorar", destinatario: "outra@example.com"});
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await resposta.json()).fornecedor, "Brevo");
  assert.equal(chamadas.length, 1);
  assert.deepEqual(chamadas[0]!.corpo.to, [{email: "tp@example.com"}]);
  assert.match(String(chamadas[0]!.corpo.textContent), /Nome guardado/);
  assert.match(String(chamadas[0]!.corpo.subject), /teste/);
  assert.equal(tentativas.get("consultor:email-teste:tp@example.com")?.estado, "aceite");
  const repetida = await pedido({email: "tp@example.com"});
  assert.equal(repetida.status, 429); assert.equal(repetida.headers.get("Retry-After"), "60");
  assert.equal(chamadas.length, 1, "Não repete o teste ao clicar novamente.");

  reiniciar();
  const simultaneos = await Promise.all([pedido({email: "tp@example.com"}), pedido({email: "tp@example.com"})]);
  assert.deepEqual(simultaneos.map(r => r.status).sort(), [200, 429]);
  assert.equal(chamadas.length, 1);

  reiniciar(); falharFornecedor = true;
  const falha = await pedido({email: "tp@example.com"});
  assert.equal(falha.status, 502);
  assert.equal(tentativas.get("consultor:email-teste:tp@example.com")?.estado, "incerto");
  assert.equal((await pedido({email: "tp@example.com"})).status, 429);
  assert.equal(chamadas.length, 1, "Não reenvia automaticamente um pedido incerto.");

  reiniciar(); falharRegisto = true;
  assert.equal((await pedido({email: "tp@example.com"})).status, 200, "Uma falha posterior no registo não nega um envio aceite.");
  assert.equal(chamadas.length, 1);

  reiniciar();
  process.env.ACTIVECAMPAIGN_API_KEY = "teste-sem-rede";
  process.env.ACTIVECAMPAIGN_API_URL = "https://activecampaign.example";
  process.env.ACTIVECAMPAIGN_AUTOMATION_ID = "7";
  process.env.ACTIVECAMPAIGN_LISTA_CONSULTORES = "24";
  const respostaAC = await pedido({email: "tp@example.com"});
  assert.equal(respostaAC.status, 200); assert.equal((await respostaAC.json()).fornecedor, "ActiveCampaign");
  assert.equal(chamadas.length, 3, "Reutiliza o fornecedor dos avisos normais, mesmo com Brevo configurada.");
  assert.deepEqual(chamadas[1]!.corpo.contactList, {list: "24", contact: "123", status: 1});
  assert.deepEqual(chamadas[2]!.corpo.contactAutomation, {contact: "123", automation: "7"});
  console.log("OK: email individual de teste — validação, autenticação admin, destinatário real, Brevo/ActiveCampaign, configuração ausente, erros e proteção de envios repetidos. Nenhum email enviado.");
} finally {
  pool.query = queryOriginal; globalThis.fetch = fetchOriginal;
  for (const chave of chaves) {
    if (ambiente[chave] === undefined) delete process.env[chave]; else process.env[chave] = ambiente[chave];
  }
  await fecharDb();
}
