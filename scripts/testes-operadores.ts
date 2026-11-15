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
assert.deepEqual(pesquisarOperadores("Japão").operadores.filter(o => o.tipo === "todo-o-site").map(o => o.id).sort(), ["catai", "icarion"]);
assert.ok(!pesquisarOperadores("Japão").operadores.some(o => o.tipo === "programacao"), "Não inventa programação manual para um destino apenas a confirmar no motor");
for (const consulta of ["Hurghada", "hurgadha", "HURGADA", "HRG", "pacotes hurgadha"]) {
  const resultado = pesquisarOperadores(consulta);
  assert.ok(resultado.destinos.some(d => d.id === "hurghada"), `${consulta}: reconhece o destino`);
  const nortravel = resultado.operadores.find(o => o.id === "nortravel");
  assert.equal(nortravel?.tipo, "motor", `${consulta}: Nortravel aparece para consulta no motor`);
  assert.equal(nortravel?.motor, true);
  assert.deepEqual(nortravel?.linhas, [], "Não apresenta Hurghada como programação manual autorizada");
}
assert.equal(pesquisarOperadores("Hurghada").operadores.some(o => o.id === "soltour"), false, "Operador só manual não aparece sem programação para o destino");
assert.equal(pesquisarOperadores("Hurghada", "inexistente").operadores.length, 0, "Um filtro sem destinos não devolve sugestões de motor");
assert.equal(pesquisarOperadores("Ilha do Sal", "sal").operadores.find(o => o.id === "nortravel")?.tipo, "programacao", "Mantém as linhas manuais autorizadas existentes");
assert.equal(pesquisarOperadores("Islândia").operadores.length, 0);
assert.equal(procurarDestinos("a").length, 0);
assert.ok(!ops("Maiorca").includes("catai"), "Europa não puxa Catai");
console.log("Destinos por operador: testes OK");
for (const q of ["sal", "egito", "cancun", "safari", "açores"]) console.log(q, "→", pesquisarOperadores(q).destinos.map(d => d.nome).join(", "), "|", ops(q).join(", "));
