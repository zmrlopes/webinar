import assert from "node:assert/strict";
import { CATALOGO_BASE, pesquisarOperadores } from "../src/lib/operadores-destinos";
import { validarCatalogo, validarPaginas, diferencasCatalogo } from "../src/lib/operadores-atualizacao";
import { favoritoFAQs } from "../src/lib/operadores-favorito";

const base = structuredClone(CATALOGO_BASE);
assert.equal(validarCatalogo(base).operadores.length, 12);
assert.throws(()=>validarCatalogo({...base, operadores: base.operadores.slice(1)}), /completa/);
const url = structuredClone(base); url.operadores[0]!.faq="https://evil.example/faq";
assert.throws(()=>validarCatalogo(url), /fonte/);
const linha = structuredClone(base); linha.operadores[0]!.linhas[0]!.destino="inexistente";
assert.throws(()=>validarCatalogo(linha), /inexistente/);
const duplicado = structuredClone(base); duplicado.destinos.push(duplicado.destinos[0]!);
assert.throws(()=>validarCatalogo(duplicado), /repetidos/);
const alterado = structuredClone(base);
alterado.operadores[0]!.linhas=[];
assert.throws(()=>validarCatalogo(alterado), /utilizáveis/);
alterado.operadores[0]!.linhas=[{destino:"japao", detalhe:"Novo destino confirmado"}];
const validado = validarCatalogo(alterado);
assert.ok(pesquisarOperadores("Japão", undefined, validado).operadores.some(o=>o.id==="newblue-pt"));
assert.ok(!pesquisarOperadores("Japão").operadores.some(o=>o.id==="newblue-pt"), "A pesquisa dinâmica não altera a base");
assert.ok(diferencasCatalogo(base,validado).some(d=>d.nome.includes("linhas")));
const paginas=base.operadores.map(o=>({url:o.faq,texto:("Que destinos posso reservar com este operador? Destinos autorizados e regras. ").repeat(4),imagens:[]}));
assert.equal(validarPaginas(paginas).length,12);
assert.throws(()=>validarPaginas(paginas.slice(1)), /Faltam/);
assert.throws(()=>validarPaginas([...paginas,paginas[0]]), /Faltam/);
assert.throws(()=>validarPaginas(paginas.map(p=>({...p,url:p.url.replace("help.icligo.com","evil.example")}))), /autorizada/);
assert.throws(()=>validarPaginas(paginas.map(p=>({...p,texto:"login"}))), /sessão/);
assert.throws(()=>validarPaginas(paginas.map(p=>({...p,imagens:["https://help.icligo.com/token"]}))), /Imagem/);
const favorito=favoritoFAQs("https://webinar.viajareviver.net");
new Function(favorito.slice("javascript:".length));
assert.ok(!favorito.includes("accessToken") && !favorito.includes("Authorization"));
assert.ok(favorito.includes("e.source!==w") && favorito.includes("e.origin!==S"));
// Executa o favorito com duas janelas simuladas, incluindo mensagens de origem falsa.
type Evento = {origin: string; source: object; data: {tipo: string; nonce: string; urls: string[]}};
let listener: ((e: Evento)=>Promise<void>) | undefined;
const mensagens: {tipo: string; paginas?: unknown[]}[] = [], pedidos: {url: string; credentials: string}[] = [];
const destino = {postMessage(m: {tipo: string}, origin: string) {assert.equal(origin,"https://webinar.viajareviver.net"); mensagens.push(m);}, closed: false};
const main = {textContent: paginas[0]!.texto, querySelectorAll() {return [];}};
class ParserSimulado {parseFromString() {return {querySelector(s: string) {return s.includes("password") ? null : main;}, querySelectorAll() {return [];}};}}
new Function("window","location","alert","fetch","DOMParser","setInterval","clearInterval",favorito.slice(11))(
  {open:()=>destino, addEventListener(_: string, fn: typeof listener) {listener=fn;}, removeEventListener(){}},
  {origin:"https://help.icligo.com"}, ()=>assert.fail("Alerta inesperado"),
  async (url: string, op: {credentials: string})=>{pedidos.push({url,credentials:op.credentials}); return {ok:true,url,text:async()=>"FAQ"};},
  ParserSimulado, ()=>0, ()=>{},
);
assert.ok(listener);
const evento: Evento = {origin:"https://evil.example",source:destino,data:{tipo:"faq-recolher",nonce:"teste",urls:paginas.map(p=>p.url)}};
await listener(evento);
assert.equal(pedidos.length,0,"Ignora mensagens de outros sites");
await listener({...evento,origin:"https://webinar.viajareviver.net",source:{}});
assert.equal(pedidos.length,0,"Ignora outras janelas");
await listener({...evento,origin:"https://webinar.viajareviver.net"});
assert.equal(pedidos.length,12);
assert.ok(pedidos.every(p=>p.credentials==="include" && p.url.startsWith("https://help.icligo.com/")));
assert.equal(mensagens.at(-1)?.tipo,"faq-paginas");
console.log("Atualização FAQs: validação, recolha completa, diferenças, pesquisa isolada e sintaxe do favorito OK.");
