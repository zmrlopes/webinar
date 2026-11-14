import assert from "node:assert/strict";
import { eventosEquipa2027, eventosPresenciais2027 } from "../src/lib/eventos-equipa-2027";
import { diaDoAcontecimento } from "../src/lib/calendario-consultor";

const ano = Array.from({ length: 12 }, (_, i) => eventosEquipa2027(`2027-${String(i + 1).padStart(2, "0")}`)).flat();
assert.equal(new Set(ano.map(e => e.titulo)).size, 29);
assert.equal(new Set(ano.map(e => e.id)).size, ano.length);
assert.equal(eventosEquipa2027("2027-08").length, 0);
assert.equal(eventosEquipa2027("2026-12").length, 0);
for (const [data, titulo] of [
  ["2027-05-22", "Business Brunch Centro"], ["2027-05-29", "Business Brunch Norte"],
  ["2027-09-25", "Produtividade Centro"], ["2027-12-11", "Vision 2028 Centro"],
  ["2027-12-18", "Vision 2028 Norte"],
]) assert(ano.some(e => diaDoAcontecimento(e) === data && e.titulo === titulo));
assert.equal(ano.filter(e => e.titulo === "Team Building").length, 4);
assert.equal(ano.filter(e => e.titulo === "Be a Rock").length, 3);
assert.equal(ano.filter(e => e.id === "convencao-2027").length, 1);
for (const e of ano.filter(e => !e.diaInteiro)) {
  assert.equal(new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" }).format(new Date(e.comecaEm)), "21:00");
}
console.log("29 eventos: datas corrigidas, vários dias, Convenção única e horas de Lisboa verificados.");

// Vista "Eventos presenciais": um item por evento, só presenciais, a partir do dia indicado.
const presenciais = eventosPresenciais2027("2026-11-14");
assert.equal(presenciais.length, 20);
assert(presenciais.every(e => e.local?.startsWith("Presencial") && e.diaInteiro));
assert.equal(new Set(presenciais.map(e => e.id)).size, presenciais.length);
assert.deepEqual(presenciais.find(e => e.titulo === "Be a Rock")?.diaFim, "2027-01-10");
assert.equal(presenciais.find(e => e.titulo === "Mindset Elite")?.diaFim, undefined);
assert.equal(presenciais.find(e => e.id === "convencao-2027")?.url, "/bilhetes-convencao");
assert(!presenciais.some(e => e.titulo === "Kick-Off Elite 2027"));
// Um encontro de vários dias continua visível até ao último dia.
assert(eventosPresenciais2027("2027-04-25").some(e => e.titulo === "Team Building"));
assert(!eventosPresenciais2027("2027-04-26").some(e => e.titulo === "Team Building"));
assert.equal(eventosPresenciais2027("2028-01-01").length, 0);
console.log("Eventos presenciais: 20 encontros, intervalos de vários dias e corte por data verificados.");
