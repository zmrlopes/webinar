import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { db, fecharDb } from "../src/lib/db";
import { enviarPushComResultado, notificarPush } from "../src/lib/push";

async function main() {
  const require = createRequire(import.meta.url), webpush = require("web-push") as typeof import("web-push");
  const originalSend = webpush.sendNotification;
  const configAntes = {publica: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privada: process.env.VAPID_PRIVATE_KEY};
  const chamadas: {endpoint: string; payload: string; timeout?: number}[] = [];
  webpush.sendNotification = (async (subscricao, payload, opcoes) => {
    chamadas.push({endpoint: subscricao.endpoint, payload: String(payload), timeout: opcoes?.timeout});
    if (subscricao.endpoint.endsWith("expirada")) throw Object.assign(new Error("Expirada"), {statusCode: 410});
    if (subscricao.endpoint.endsWith("falha")) throw Object.assign(new Error("Falha transitória"), {statusCode: 503});
    return {statusCode: 201, body: "", headers: {}};
  }) as typeof webpush.sendNotification;
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), originalQuery = pool.query, removidas: string[] = [];
  pool.query = (async (sql: string, valores: unknown[] = []) => {
    if (sql.startsWith("delete from push_subscriptions")) {removidas.push(String(valores[0])); return {rows: [], rowCount: 1};}
    return {rows: ["sucesso", "expirada", "falha"].map(nome => ({endpoint: "https://push.exemplo.test/" + nome, p256dh: "teste", auth: "teste"})), rowCount: 3};
  }) as typeof pool.query;
  const aviso = {titulo: "Nova formação gravada", corpo: "Título da formação", url: "/consultor/formacoes/essenciais", tag: "gravacao-teste"};
  const logOriginal = console.error;
  try {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY;
    assert.deepEqual(await enviarPushComResultado("consultor@example.com", aviso), {configurado: false, enviadas: 0, falhas: 0});
    const chaves = webpush.generateVAPIDKeys(); process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = chaves.publicKey; process.env.VAPID_PRIVATE_KEY = chaves.privateKey;
    console.error = () => {};
    assert.deepEqual(await enviarPushComResultado("consultor@example.com", aviso), {configurado: true, enviadas: 1, falhas: 1});
    assert.deepEqual(removidas, ["https://push.exemplo.test/expirada"]);
    assert.deepEqual(JSON.parse(chamadas[0]!.payload), aviso); assert.equal(chamadas[0]!.timeout, 8000);
    assert.equal(await notificarPush("consultor@example.com", {titulo: "Aviso existente", corpo: "Texto", url: "/consultor"}), undefined);
    assert.equal(chamadas[3]!.timeout, undefined, "Os outros avisos mantêm as opções de envio anteriores");
    assert.equal(JSON.parse(chamadas[3]!.payload).tag, undefined);

    const listeners = new Map<string, (evento: unknown) => void>();
    const mostradas: {titulo: string; opcoes: {tag?: string; data: {url: string}}}[] = [];
    const self = {addEventListener: (nome: string, callback: (evento: unknown) => void) => listeners.set(nome, callback), registration: {showNotification: async (titulo: string, opcoes: {tag?: string; data: {url: string}}) => {mostradas.push({titulo, opcoes});}}};
    vm.runInNewContext(await readFile("public/sw.js", "utf8"), {self});
    const trabalho: Promise<unknown>[] = [];
    listeners.get("push")!({data: {json: () => aviso}, waitUntil: (p: Promise<unknown>) => trabalho.push(p)});
    listeners.get("push")!({data: {json: () => ({titulo: "Aviso anterior", corpo: "Texto", url: "/consultor"})}, waitUntil: (p: Promise<unknown>) => trabalho.push(p)});
    await Promise.all(trabalho);
    assert.equal(mostradas[0]!.opcoes.tag, aviso.tag); assert.equal(mostradas[0]!.opcoes.data.url, aviso.url);
    assert.equal(mostradas[1]!.opcoes.tag, undefined);
    console.log("OK: resultados de entrega, falhas transitórias, subscrições expiradas, etiqueta e link no dispositivo, e compatibilidade dos avisos existentes. Sem envios reais.");
  } finally {
    console.error = logOriginal; webpush.sendNotification = originalSend; pool.query = originalQuery;
    if (configAntes.publica === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = configAntes.publica;
    if (configAntes.privada === undefined) delete process.env.VAPID_PRIVATE_KEY; else process.env.VAPID_PRIVATE_KEY = configAntes.privada;
    await fecharDb();
  }
}
main().catch(e => {console.error(e); process.exitCode = 1;});
