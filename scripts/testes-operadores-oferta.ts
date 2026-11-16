import assert from "node:assert/strict";
import { CATALOGO_BASE, pesquisarOperadores } from "../src/lib/operadores-destinos";
import { validarCatalogo } from "../src/lib/operadores-atualizacao";
import { completarCatalogoComOferta } from "../src/lib/operadores-oferta";
import oferta from "../src/lib/operadores-oferta.json";

// Reproduz as regras da FAQ efetivamente revista, independentemente da base de recuperação.
const publicado = structuredClone(CATALOGO_BASE);
for (const fonte of oferta.operadores) {
  const o = publicado.operadores.find(o => o.id === fonte.id)!;
  o.atualizado = fonte.faq.atualizado;
  o.permitido = fonte.faq.permitido;
  o.proibido = fonte.faq.proibido;
}
const antes = JSON.stringify(publicado);
const catalogo = validarCatalogo(completarCatalogoComOferta(publicado, oferta.recolhaFAQs));
const procurar = (q: string) => pesquisarOperadores(q, undefined, catalogo).operadores;
const tem = (q: string, id: string) => procurar(q).some(o => o.id === id);
assert.equal(JSON.stringify(publicado), antes, "Preserva o catálogo e o histórico originais");
for (const q of ["Austrália", "Japão", "Hurghada", "Islândia"]) assert.ok(tem(q, "catai"), q);
assert.ok(tem("Sydney", "catai"), "Cidade explicitamente presente no percurso");
for (const q of ["Austrália", "Japão", "Hurghada", "Quénia"]) assert.ok(tem(q, "icarion"), q);
assert.ok(tem("Japão", "nortravel"), "Circuito Exclusivo identificado");
for (const q of ["Hurghada", "hurgadha", "HRG"]) {
  const n = procurar(q).find(o => o.id === "nortravel");
  assert.equal(n?.tipo, "programacao", "A oferta oficial de Voos Especiais confirma agora a categoria manual");
  assert.ok(n?.linhas.some(l => l.fonte?.url.includes("Hurghada-voosespeciais2027")));
}
assert.ok(tem("Nova Iorque", "viagens-tempo"));
assert.ok(tem("Montreal", "viagens-tempo"));
assert.ok(tem("Bélgica", "viagens-tempo"));
assert.ok(tem("Quénia", "viagens-tempo"));
assert.ok(!tem("Hurghada", "viagens-tempo"), "Um circuito no Nilo não é Safari autorizado");
assert.ok(!tem("Madagáscar", "viagens-tempo"), "Uma estadia de praia na secção África não é Safari");
assert.ok(!tem("Marrocos", "viagens-tempo"), "A secção África não autoriza todos os seus produtos");
assert.ok(tem("São Vicente", "viajar-tours"), "Produto de Fim de Ano identificado");
assert.ok(!tem("Japão", "newblue-pt"), "A integração no motor não prova oferta");
assert.ok(!tem("Cuba", "catai"), "Página de destino sem programa não prova oferta");
assert.equal(procurar("destino inexistente de teste").length, 0);
for (const o of catalogo.operadores) for (const l of o.linhas.filter(l => l.fonte)) {
  assert.ok(l.fonte!.titulo.length > 0);
  assert.ok(catalogo.destinos.some(d => d.id === l.destino));
}
assert.equal(completarCatalogoComOferta(publicado, "nova-faq"), publicado, "Uma nova publicação é soberana");
const restrito = structuredClone(publicado);
restrito.operadores.find(o => o.id === "catai")!.permitido = ["Apenas Japão"];
assert.equal(completarCatalogoComOferta(restrito, oferta.recolhaFAQs).operadores.find(o => o.id === "catai"), restrito.operadores.find(o => o.id === "catai"), "Regras alteradas invalidam o cruzamento");
assert.deepEqual(completarCatalogoComOferta(catalogo, oferta.recolhaFAQs), catalogo, "Leituras repetidas não duplicam linhas");
const maliciosa = structuredClone(catalogo);
maliciosa.operadores.find(o => o.id === "catai")!.linhas.find(l => l.fonte)!.fonte!.url = "https://evil.example/produto";
assert.throws(() => validarCatalogo(maliciosa), /Fonte de produto/);
console.log(`Oferta: ${oferta.operadores.reduce((s, o) => s + o.linhas.length, 0)} correspondências com fontes; testes OK`);
