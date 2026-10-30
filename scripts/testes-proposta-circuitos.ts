import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
import {desenharProposta} from "../src/lib/proposta-desenho";
import {MARCA_PADRAO} from "../src/lib/travel-planner";
import { juntarLeituras, validarLeitura, validarProposta, propostaVazia } from "../src/lib/proposta";

const hotel = (nome: string, total: number | null) => ({nome, quarto: "Duplo", regime: "PA", total, precoPessoa: null});
const dados = {viagem: {destino: "Marrocos", viajantes: 2}, hoteis: [hotel("Hotel Marrakech", 400), hotel("Hotel Fez", 300)]};
const circuito = validarLeitura({...dados, circuito: hotel("Circuito - Cidades imperiais", 1800)}, "circuito.pdf");
const j = juntarLeituras([circuito]);
assert.ok(j.opcoes[0]);
assert.equal(j.opcoes.length, 1, "As estadias sucessivas pertencem ao mesmo programa");
assert.equal(j.opcoes[0].tipo, "circuito");
assert.equal(j.opcoes[0].total, 1800);
assert.equal(j.opcoes[0].precoPessoa, 900);
const semPreco = juntarLeituras([validarLeitura({...dados, circuito: hotel("Circuito", null)}, "sem-preco.pdf")]);
assert.ok(semPreco.opcoes[0]);
assert.equal(semPreco.opcoes[0].total, null, "Nunca soma nem reutiliza os preços das etapas");
assert.equal(juntarLeituras([validarLeitura(dados, "alternativas.pdf")]).opcoes.length, 2, "Preserva alternativas de hotéis");
const p = validarProposta({...propostaVazia("00000000-0000-4000-8000-000000000001"), opcoes: j.opcoes});
assert.ok(p.opcoes[0]);
assert.equal(p.opcoes[0].tipo, "circuito", "Preserva a classificação ao guardar/reabrir");
assert.deepEqual(p.opcoes[0].hoteisCircuito?.map(h => h.nome), ["Hotel Marrakech", "Hotel Fez"], "Preserva cada hotel pela ordem da viagem");
assert.equal(p.opcoes[0].hoteisCircuito?.[1]?.regime, "PA");
assert.equal(juntarLeituras([circuito, {...circuito, ficheiro: "outro.pdf"}]).opcoes.length, 2);
const desenhar = (hoteis: NonNullable<typeof p.opcoes[0]>["hoteisCircuito"]) => desenharProposta({
  p: {...p, viagem: {...j.viagem}, opcoes: [{...p.opcoes[0]!, hoteisCircuito: hoteis}]}, marca: MARCA_PADRAO, escala: 0.75, consultor: null,
  imagens: {capa: null, hoteis: [null], destaques: []},
});
const duas = await desenhar(p.opcoes[0].hoteisCircuito);
const tres = await desenhar([...p.opcoes[0].hoteisCircuito!, {...p.opcoes[0].hoteisCircuito![0]!, nome: "Terceiro hotel"}]);
assert.equal(tres.length, duas.length + 1, "Um terceiro hotel cria mais uma página, sem cortar os hotéis ou o preço final");
if (process.env.PROPOSTA_PREVIA) writeFileSync(process.env.PROPOSTA_PREVIA, duas[2]!);
console.log("Circuitos: etapas agrupadas, preço global, ausência de preço e alternativas verificados.");
