import assert from "node:assert/strict";
import { BONUS_TP, PATAMARES_CALCULADORA, calcularObjetivoComissao } from "../src/lib/calculadora-objetivo";

const misto = calcularObjetivoComissao(500, 12, 30, 50, 24);
assert(misto);
assert.equal(misto.tps, 3);
assert.equal(misto.faturacao, 6944.45);
assert.equal(misto.bonusTPs, 240);
assert.equal(misto.comissaoPontosTPs, 72);
assert.equal(misto.comissaoTPs, 312);
assert.equal(misto.objetivoVendas, 250);
assert.equal(misto.objetivoTPs, 250);
assert(misto.comissaoVendas >= 250);
assert(misto.total >= 500);

const vendas = calcularObjetivoComissao(500, 12, 30, 0, 24);
assert(vendas);
assert.equal(vendas.tps, 0);
assert.equal(vendas.faturacao, 13888.89);
assert(vendas.comissaoVendas >= 500);
const tps = calcularObjetivoComissao(500, 0, 0, 100, 24);
assert(tps);
assert.equal(tps.faturacao, 0);
assert.equal(tps.tps, 5);
assert.equal(tps.total, 520);

for (const patamar of PATAMARES_CALCULADORA) {
  const exato = calcularObjetivoComissao((BONUS_TP + patamar.valorPonto) * 3, 12, 30, 100, patamar.valorPonto);
  assert(exato);
  assert.equal(exato.tps, 3);
  assert.equal(exato.total, exato.objetivoTPs);
  assert.equal(patamar.valorPonto, patamar.percentagem * 2);
}
const junior = calcularObjetivoComissao(500, 12, 30, 10, 0);
assert(junior);
assert.equal(junior.tps, 1);
assert.equal(junior.faturacao, 12500);
assert.equal(junior.total, 530);
const zero = calcularObjetivoComissao(0, 0, 0, 50, 14);
assert(zero);
assert.equal(zero.total, 0);
assert.equal(zero.tps, 0);
assert.equal(zero.faturacao, 0);
assert.equal(calcularObjetivoComissao(500, 0, 30, 50, 24), null);
assert.equal(calcularObjetivoComissao(500, 12, 0, 50, 24), null);
assert.equal(calcularObjetivoComissao(500, 12, 30, 101, 24), null);
assert.equal(calcularObjetivoComissao(500, 12, 30, -1, 24), null);
assert.equal(calcularObjetivoComissao(-1, 12, 30, 50, 24), null);
assert.equal(calcularObjetivoComissao(500, 12, 30, 50, 99), null);
assert.equal(calcularObjetivoComissao(Infinity, 12, 30, 50, 24), null);
// Objetivos decimais e taxas variadas: atingir cada parcela com o mínimo de TPs.
for (const objetivo of [0.01, 0.1, 499.99, 500, 520, 1000.5]) {
  for (const parcela of [0, 10, 33.3, 50, 99.9, 100]) {
    const r = calcularObjetivoComissao(objetivo, 12.5, 35, parcela, 24);
    assert(r);
    assert(r.comissaoTPs + 1e-9 >= r.objetivoTPs);
    assert(r.comissaoVendas + 1e-9 >= r.objetivoVendas);
    assert(r.total + 1e-9 >= objetivo);
    if (r.tps > 0) assert((r.tps - 1) * r.valorTP < r.objetivoTPs);
  }
}
console.log("OK: repartição do objetivo, bónus de 80 € por TP, ponto por patamar, arredondamento, só vendas, só TPs e taxas inválidas.");
