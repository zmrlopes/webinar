import assert from "node:assert/strict";
import { calcularMetaMensalVirtual, calcularPontosVirtuais } from "../src/lib/calculadora-pontos-virtuais";

assert.deepEqual(calcularPontosVirtuais(15400, 25), { pontosEstimados: 10, pontosFalta: 15, faturacaoNecessaria: 23100 });
assert.deepEqual(calcularPontosVirtuais(0, 10), { pontosEstimados: 0, pontosFalta: 10, faturacaoNecessaria: 15400 });
assert.deepEqual(calcularPontosVirtuais(15400, 10), { pontosEstimados: 10, pontosFalta: 0, faturacaoNecessaria: 0 });
assert.deepEqual(calcularPontosVirtuais(30800, 10), { pontosEstimados: 20, pontosFalta: 0, faturacaoNecessaria: 0 });
// A referência arredonda os pontos antes de apurar o que falta para o patamar.
assert.equal(calcularPontosVirtuais(769.99, 10)?.pontosEstimados, 0);
assert.equal(calcularPontosVirtuais(770, 10)?.pontosEstimados, 1);
assert.equal(calcularPontosVirtuais(1540, 10.5)?.faturacaoNecessaria, 14630);
for (const invalido of [-1, NaN, Infinity, -Infinity]) {
  assert.equal(calcularPontosVirtuais(invalido, 10), null);
  assert.equal(calcularPontosVirtuais(1540, invalido), null);
}
assert.equal(calcularPontosVirtuais(0, Number.MAX_VALUE), null);
assert.equal(calcularMetaMensalVirtual(23100, 6), 3850);
assert.equal(calcularMetaMensalVirtual(1540, 3), 513);
assert.equal(calcularMetaMensalVirtual(0, 6), 0);
for (const invalido of [0, -1, 1.5, NaN, Infinity]) assert.equal(calcularMetaMensalVirtual(23100, invalido), null);
assert.equal(calcularMetaMensalVirtual(-1, 6), null);
console.log("Calculadora de pontos virtuais: cálculos, arredondamentos, metas atingidas e validação OK.");
