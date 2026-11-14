import assert from "node:assert/strict";
import config from "../next.config";
import { REDIRECIONAMENTOS_AREA_ANTIGA, seccaoEntradaNovaArea } from "../src/lib/consultor-navegacao";

const regras = await config.redirects!();
for (const esperado of REDIRECIONAMENTOS_AREA_ANTIGA) {
  const regra = regras.find(r => r.source === esperado.source);
  assert.equal(regra?.destination, esperado.destination);
  assert.equal(regra?.permanent, false);
  const destino = new URL(esperado.destination, "http://localhost");
  assert.equal(destino.pathname, "/consultor/nova-area");
  const seccao = destino.searchParams.get("seccao");
  if (seccao) assert.equal(seccaoEntradaNovaArea(destino.search, false), seccao, `O favorito ${esperado.source} abre a secção certa`);
}
assert(REDIRECIONAMENTOS_AREA_ANTIGA.findIndex(r => r.source.endsWith("/testemunhos")) < REDIRECIONAMENTOS_AREA_ANTIGA.findIndex(r => r.source.endsWith("/:categoria")), "Testemunhos não é interpretado como categoria");
assert.equal(seccaoEntradaNovaArea("?area=atual", false), "inicio");
assert.equal(seccaoEntradaNovaArea("?seccao=admin", false), "inicio");
assert.equal(seccaoEntradaNovaArea("?seccao=admin", true), "admin");
assert.equal(seccaoEntradaNovaArea("?seccao=__proto__", true), "inicio");
assert.equal(seccaoEntradaNovaArea("?seccao=https://example.com", true), "inicio");
for (const auxiliar of ["/consultor/hotel", "/consultor/teambuilding", "/consultor/trofeus", "/consultor/questionario/:slug"]) {
  assert(!regras.some(r => r.source === auxiliar), "Manter os formulários auxiliares dos eventos");
}

// Ensaio HTTP opcional, sem autenticar contas nem alterar dados.
if (process.env.TESTE_CONSULTOR_BASE_URL) {
  const base = process.env.TESTE_CONSULTOR_BASE_URL;
  for (const regra of REDIRECIONAMENTOS_AREA_ANTIGA) {
    const caminho = regra.source.replace(":categoria", "blackfriday-26");
    for (const query of ["", "?area=atual"]) {
      const resposta = await fetch(base + caminho + query, { redirect: "manual" });
      assert.equal(resposta.status, 307, caminho + query);
      const destino = new URL(resposta.headers.get("location")!, base);
      const esperado = new URL(regra.destination.replace(":categoria", "blackfriday-26"), base);
      assert.equal(destino.pathname, esperado.pathname);
      for (const [chave, valor] of esperado.searchParams) assert.equal(destino.searchParams.get(chave), valor);
    }
  }
  const nova = await fetch(base + "/consultor/nova-area");
  assert.equal(nova.status, 200);
  assert(!(await nova.text()).includes("Escolhe a área que queres consultar"));
}
console.log("OK: área única, favoritos por secção/categoria, Admin exclusivo de líder e formulários auxiliares preservados.");
