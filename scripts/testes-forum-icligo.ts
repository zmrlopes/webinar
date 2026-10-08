import assert from "node:assert/strict";
import { extrairFormacoesForum, juntarFormacoesIcligo } from "../src/lib/formacoes-forum-icligo";
import { db, fecharDb } from "../src/lib/db";
import { CHAVE_LIGACAO_FORUM, obterCalendarioForum } from "../src/lib/forum-icligo";

const evento = (id: number, nome: string, inicio = "2026-10-13T20:00:00.000Z", tipo = "tbd") => ({
  id, name: nome, slug: `formacao-${id}`, status: "published", event_setting_attributes: { starts_at: inicio, ends_at: "2026-10-13T21:00:00.000Z", location_type: tipo },
});
const es = evento(1, "🇪🇸 Be an Expert • Uruguay");
const pt = evento(2, "🇵🇹 Be an Expert • Uruguay");
const gb = evento(3, "🇬🇧 Be a Pro • Follow Up");
const us = evento(4, "🇺🇸 Be a Pro • Follow Up");
const importadas = extrairFormacoesForum([es, pt, gb, us, evento(5, "Halloween"), evento(6, "🇪🇸 Congresso", undefined, "in_person"), { ...es, status: "draft" }], "2026-10");
assert.equal(importadas.length, 4);
assert.deepEqual(importadas.map(e => e.lingua), ["es", "pt", "gb", "us"]);
assert.equal(importadas[0]!.titulo, "Be an Expert • Uruguay");
assert(!JSON.stringify(importadas).includes("community_member"));
assert.equal(extrairFormacoesForum([evento(8, "🇵🇹 Formação", "2026-09-30T23:30:00Z")], "2026-10").length, 1);
assert.equal(extrairFormacoesForum([evento(9, "🇵🇹 Formação", "2026-10-31T23:30:00Z")], "2026-11").length, 0);
assert.throws(() => extrairFormacoesForum([{ ...pt, event_setting_attributes: { starts_at: "inválido", location_type: "virtual" } }], "2026-10"));
const manual = { ...importadas[1]!, id: "manual", titulo: "Título antigo", comecaEm: "2026-10-13T19:00:00Z", url: importadas[1]!.url + "?origem=manual" };
assert.equal(juntarFormacoesIcligo([manual], importadas).length, 4, "O URL identifica a formação mesmo depois de mudar o título ou a hora");
assert.equal(juntarFormacoesIcligo([{ ...importadas[1]!, id: "manual", url: null }], importadas).length, 4);
assert.equal(juntarFormacoesIcligo([{ ...importadas[1]!, id: "manual", titulo: "Outra formação", url: null }], importadas).length, 5);
console.log("OK: línguas, horas de Portugal, feriados, eventos presenciais, rascunhos e duplicados");

process.env.DATABASE_URL ??= "postgres://teste:teste@localhost/teste";
const pool = db(), queryOriginal = pool.query, fetchOriginal = globalThis.fetch;
const memoria = new Map<string, unknown>([[CHAVE_LIGACAO_FORUM, { cookie: "sessao-de-teste" }]]);
pool.query = (async (sql: string, valores: unknown[]) => {
  if (sql.startsWith("select valor")) return { rows: memoria.has(String(valores[0])) ? [{ valor: memoria.get(String(valores[0])) }] : [] };
  if (sql.startsWith("insert into dashboard_config")) { memoria.set(String(valores[0]), JSON.parse(String(valores[1]))); return { rows: [] }; }
  throw new Error("Consulta inesperada no teste");
}) as typeof pool.query;
let pedidos = 0, falhar = false;
globalThis.fetch = (async (url: URL | RequestInfo) => {
  pedidos++;
  if (falhar) return new Response(null, { status: 302, headers: { Location: "/users/sign_in" } });
  const pagina = new URL(String(url)).searchParams.get("page");
  return Response.json({ records: pagina === "1" ? [es, pt] : [gb, us], has_next_page: pagina === "1" });
}) as typeof fetch;
try {
  const resultado = await obterCalendarioForum("2026-10", true);
  assert.equal(resultado.formacoes.length, 4);
  assert.equal(pedidos, 2, "Importa todas as páginas");
  await obterCalendarioForum("2026-10");
  assert.equal(pedidos, 2, "Usa a última importação durante uma hora");
  falhar = true;
  const falha = await obterCalendarioForum("2026-10", true);
  assert.equal(falha.formacoes.length, 4, "A falha não apaga as formações");
  assert.equal(falha.atualizadoEm, resultado.atualizadoEm);
  assert.match(falha.aviso!, /precisa de ser renovada/);
  const vazia = await obterCalendarioForum("2026-11", true);
  assert.equal(vazia.formacoes.length, 0);
  assert(vazia.aviso);
  const antes = pedidos;
  await obterCalendarioForum("2026-11");
  assert.equal(pedidos, antes, "Limita novas tentativas depois de uma falha");
  assert(!JSON.stringify(resultado).includes("sessao-de-teste"));
  console.log("OK: paginação, cache, sessão expirada, preservação da última importação e credenciais privadas");
} finally { pool.query = queryOriginal; globalThis.fetch = fetchOriginal; await fecharDb(); }
