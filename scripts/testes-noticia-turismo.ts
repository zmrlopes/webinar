import assert from "node:assert/strict";
import { dataLisboa } from "../src/lib/data-lisboa";
import { FONTES_TURISMO, lerNoticiasTurismo, lerNoticiasRss, carregarNoticiaTurismo } from "../src/lib/noticia-turismo";

const agora = new Date("2026-10-22T15:00:00Z");
const fonte = FONTES_TURISMO[0];
const post = (campos: Record<string, unknown> = {}) => ({
  date_gmt: "2026-10-22T13:00:00", link: "https://turisver.pt/noticia-de-teste/",
  title: { rendered: "Turismo &amp; viagens: novas ligações &#8212; Portugal" }, ...campos,
});

const noticias = lerNoticiasTurismo([post()], fonte, agora);
assert.equal(noticias.length, 1);
assert.equal(noticias[0]?.titulo, "Turismo & viagens: novas ligações — Portugal");
assert.equal(noticias[0]?.publicadaEm, "2026-10-22T13:00:00.000Z");
assert.equal(noticias[0]?.fonte, "Turisver");
assert.equal(noticias[0]?.imagem, null);
const foto = "https://turisver.pt/wp-content/uploads/2026/10/destino.webp";
assert.equal(lerNoticiasTurismo([post({ imagem: foto })], fonte, agora)[0]?.imagem, foto);
assert.equal(lerNoticiasTurismo([post({ _embedded: { "wp:featuredmedia": [{ source_url: foto }] } })], fonte, agora)[0]?.imagem, foto);
for (const imagem of ["javascript:alert(1)", "https://evil.test/foto.jpg", "https://turisver.pt.evil.test/foto.jpg", "https://turisver.pt/foto.svg", "https://nome:segredo@turisver.pt/foto.jpg", "http://turisver.pt/foto.jpg"]) {
  assert.equal(lerNoticiasTurismo([post({ imagem })], fonte, agora)[0]?.imagem, null);
}
assert.equal(lerNoticiasTurismo([post({ title: { rendered: "<b>Viagens</b> &#x1F30D; &#99999999; &laquo;Novidades&raquo;" } })], fonte, agora)[0]?.titulo, "Viagens 🌍 «Novidades»");
for (const valor of [null, {}, "erro", [null, false, 1, "post"]]) assert.deepEqual(lerNoticiasTurismo(valor, fonte, agora), []);
for (const url of ["javascript:alert(1)", "http://turisver.pt/noticia/", "https://turisver.pt.evil.test/noticia/", "https://evil.test/turisver.pt", "https://nome:segredo@turisver.pt/", "https://turisver.pt:444/noticia/", "invalido"]) {
  assert.equal(lerNoticiasTurismo([post({ link: url })], fonte, agora).length, 0, url);
}
for (const data of ["2026-10-23T13:00:00", "2026-10-10T13:00:00", "invalida", null]) {
  assert.equal(lerNoticiasTurismo([post({ date_gmt: data })], fonte, agora).length, 0);
}
assert.equal(lerNoticiasTurismo([post({ title: null }), post()], fonte, agora).length, 1);
assert.equal(dataLisboa(new Date("2026-10-22T23:30:00Z")), "2026-10-23");
assert.equal(dataLisboa(new Date("2026-10-25T23:30:00Z")), "2026-10-25");

const buscar = (fn: (url: string) => Response | Promise<Response>) => (async (url: string | URL | Request) => fn(String(url))) as typeof fetch;
const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Viagens &amp; turismo em Portugal]]></title><link>https://turisver.pt/noticia-de-teste/</link><pubDate>Thu, 22 Oct 2026 13:00:00 +0000</pubDate></item></channel></rss>`;
assert.equal(lerNoticiasRss(rss, fonte, agora)[0]?.titulo, "Viagens & turismo em Portugal");
const rssComFoto = rss.replace("</item>", `<description><![CDATA[<p><img width="300" src="${foto}?a=1&amp;b=2" /></p>]]></description></item>`);
assert.equal(lerNoticiasRss(rssComFoto, fonte, agora)[0]?.imagem, foto + "?a=1&b=2");
const rssComMedia = rss.replace("<rss>", '<rss xmlns:media="http://search.yahoo.com/mrss/">').replace("</item>", `<media:thumbnail url="${foto}" /></item>`);
assert.equal(lerNoticiasRss(rssComMedia, fonte, agora)[0]?.imagem, foto);
assert.equal(lerNoticiasRss("<!DOCTYPE rss []>" + rss, fonte, agora).length, 0);
assert.equal(lerNoticiasRss("x".repeat(1_000_001), fonte, agora).length, 0);
let chamadasApi = 0;
const soRss = buscar(url => {
  if (url.includes("wp-json")) { chamadasApi++; return new Response("", { status: 403 }); }
  return new Response(rss, { headers: { "Content-Type": "application/rss+xml" } });
});
assert.equal((await carregarNoticiaTurismo(agora, soRss)).fonte, "Turisver");
assert.equal(chamadasApi, 2); // As outras fontes rejeitam o link de domínio alheio do fixture.
const duasFontes = buscar(url => Response.json(url.includes("ambitur") ? [post({
  link: "https://www.ambitur.pt/outra-noticia/", date_gmt: "2026-10-22T14:00:00",
})] : [post()]));
assert.equal((await carregarNoticiaTurismo(agora, duasFontes)).fonte, "Ambitur");
const fonteEmFalha = buscar(url => {
  if (url.includes("ambitur")) throw new Error("Fonte em baixo");
  return Response.json([post()]);
});
assert.equal((await carregarNoticiaTurismo(agora, fonteEmFalha)).fonte, "Turisver");
const jsonInvalido = buscar(url => url.includes("ambitur") ? new Response("<html>Erro</html>") : Response.json([post()]));
assert.equal((await carregarNoticiaTurismo(agora, jsonInvalido)).fonte, "Turisver");
const ontem = await carregarNoticiaTurismo(agora, buscar(() => Response.json([post({ date_gmt: "2026-10-21T13:00:00" })])));
assert.equal(ontem.publicadaEm, "2026-10-21T13:00:00.000Z");
await assert.rejects(carregarNoticiaTurismo(agora, buscar(() => new Response("", { status: 503 }))));
await assert.rejects(carregarNoticiaTurismo(agora, buscar(() => Response.json([]))));
console.log("OK: títulos, entidades HTML, datas de Lisboa, notícias futuras/antigas, links válidos, ordenação e recuperação com falha de uma ou ambas as fontes.");
