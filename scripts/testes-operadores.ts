import assert from "node:assert/strict";
import { DESTINOS, OPERADORES, pesquisarOperadores, procurarDestinos } from "../src/lib/operadores-destinos";

const ids = new Set(DESTINOS.map(d => d.id));
for (const o of OPERADORES) for (const l of o.linhas) assert.ok(ids.has(l.destino), `${o.id}: destino desconhecido ${l.destino}`);
assert.equal(new Set(DESTINOS.map(d => d.id)).size, DESTINOS.length, "ids de destino repetidos");

const ops = (q: string, f?: string) => pesquisarOperadores(q, f).operadores.filter(o => o.tipo === "programacao").map(o => o.id).sort();

assert.deepEqual(ops("Punta Cana"), ["newblue-es", "newblue-pt", "soltour", "travelplan"]);
assert.deepEqual(ops("puj"), ops("Punta Cana"), "código IATA");
assert.ok(ops("Salvador").includes("solferias"), "Salvador herda a operação regular Brasil da Solférias");
assert.ok(ops("Salvador").includes("viajar-tours"));
assert.ok(ops("brasil").includes("soltropico"), "país expande para as cidades");
assert.ok(ops("Maurícias").includes("solferias") && ops("mauricias").includes("newblue-es"), "sem acentos");
assert.ok(ops("réveillon").includes("viagens-tempo") && ops("fim de ano").includes("soltropico"), "temas");
assert.deepEqual(ops("mercados de natal"), ["viagens-tempo"]);
assert.ok(ops("Canárias").includes("soltour"), "grupo");
assert.ok(ops("Ilha do Sal", "sal").length >= 6);
assert.deepEqual(pesquisarOperadores("Japão").operadores.map(o => o.id), ["icarion"], "Só a Icárion identifica Japão na FAQ; não sugere Catai nem todos os motores");
for (const consulta of ["Maldivas", "Vietname", "Japão", "Costa Rica", "safari"]) {
  assert.ok(ops(consulta).includes("icarion"), `${consulta}: destino identificado na FAQ da Icárion`);
  assert.ok(!pesquisarOperadores(consulta).operadores.some(o => o.id === "catai"), "Continentes e autorização geral não confirmam um destino da Catai");
}
assert.ok(!ops("Quénia").includes("icarion"), "A referência genérica a safaris não comprova um país específico");
assert.equal(pesquisarOperadores("Austrália").operadores.length, 0, "Sem oferta identificada não sugere operadores em vão");
for (const consulta of ["Hurghada", "hurgadha", "HURGADA", "HRG", "pacotes hurgadha"]) {
  const resultado = pesquisarOperadores(consulta);
  assert.ok(resultado.destinos.some(d => d.id === "hurghada"), `${consulta}: reconhece o destino`);
  const nortravel = resultado.operadores.find(o => o.id === "nortravel");
  assert.equal(nortravel?.tipo, "motor", `${consulta}: Nortravel aparece para consulta no motor`);
  assert.equal(nortravel?.motor, true);
  assert.equal(nortravel?.linhas[0]?.destino, "hurghada", "Mostra o destino concreto confirmado no motor");
  assert.ok(!resultado.operadores.some(o => o.id === "catai" || o.id === "icarion" || o.id === "newblue-es"), "Não acrescenta operadores só pela região ou integração");
}
assert.equal(pesquisarOperadores("Hurghada").operadores.some(o => o.id === "soltour"), false, "Operador só manual não aparece sem programação para o destino");
assert.equal(pesquisarOperadores("Hurghada", "inexistente").operadores.length, 0, "Um filtro sem destinos não devolve sugestões de motor");
assert.equal(pesquisarOperadores("Ilha do Sal", "sal").operadores.find(o => o.id === "nortravel")?.tipo, "programacao", "Mantém as linhas manuais autorizadas existentes");
assert.equal(pesquisarOperadores("Islândia").operadores.length, 0);
assert.equal(procurarDestinos("a").length, 0);
assert.ok(!ops("Maiorca").includes("catai"), "Europa não puxa Catai");
for (const consulta of ["Egito", "Punta Cana", "Maurícias", "Japão"]) {
  assert.ok(pesquisarOperadores(consulta).operadores.every(o => o.linhas.length > 0), "Todos os resultados têm correspondência concreta");
}
console.log("Destinos por operador: testes OK");
for (const q of ["sal", "egito", "cancun", "safari", "açores"]) console.log(q, "→", pesquisarOperadores(q).destinos.map(d => d.nome).join(", "), "|", ops(q).join(", "));
