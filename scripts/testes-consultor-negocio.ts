import assert from "node:assert/strict";
import vm from "node:vm";
import {fatorMedioNegocio, periodosNegocio, projecoesNegocio, resumoNegocio, validarTotaisNegocio, type DadosNegocio, type TotaisNegocio} from "../src/lib/consultor-negocio";
import {CANAL_NEGOCIO, favoritoNegocio, recolherPeriodoNegocio} from "../src/lib/consultor-negocio-ponte";
import {podeVerNovaArea} from "../src/lib/consultor-nova-area";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {POST} from "../app/api/consultor/nova-area/negocio/route";

const totais = (n: number): TotaisNegocio => ({faturacao: n, comissoes: n, pontos: n, consultores: n});
const periodos = periodosNegocio("2028-02-29");
assert.equal(periodos.length, 15);
assert.deepEqual(periodos.at(-1), {chave: "homologo", inicio: "2027-02-01", fim: "2027-02-28"});
assert.equal(periodos.find(p => p.chave === "2028-02")?.fim, "2028-02-29");
assert.equal(periodosNegocio("2029-01-01").length, 14);
const dados: DadosNegocio = {ate: "2026-02-10", atualizadoEm: "2026-02-10T13:00:00Z", origemEmail: EMAIL_PAINEL_DEMONSTRACAO,
  meses: {"2025-01": totais(100), "2025-02": totais(500), "2026-01": totais(200), "2026-02": totais(100)}, homologo: totais(50)};
assert.deepEqual(resumoNegocio(dados, "faturacao"), {atual: 300, anterior: 150, variacao: 100});
assert.equal(fatorMedioNegocio(dados), 2);
assert.deepEqual(projecoesNegocio(300, 2), [300, 600, 1200, 2400, 4800, 9600]);
assert.equal(fatorMedioNegocio({...dados, meses: {}, homologo: totais(0)}), 1);
assert.equal(resumoNegocio({...dados, meses: {}, homologo: totais(0)}, "pontos").variacao, null);
assert.throws(() => validarTotaisNegocio({...totais(1), faturacao: NaN}));
assert.throws(() => validarTotaisNegocio({...totais(1), consultores: 1.5}));
assert.throws(() => validarTotaisNegocio({faturacao: 0}));
assert.equal(validarTotaisNegocio({...totais(1), faturacao: -1.256}).faturacao, -1.26);

const periodo = periodos[0]!;
const resultado = await recolherPeriodoNegocio(periodo, async url => url.includes("affiliates") ? {stats: {sales: 1000, points: 25, subscriptions: 2}} : {
  content: [{state: "confirmed", commissions: 12.25}, {state: "confirmed", commissions: -3}, {state: "pending", commissions: 20}], totalPages: 1, totalElements: 3,
});
assert.deepEqual(resultado, {faturacao: 1000, pontos: 25, consultores: 2, comissoes: 12.25});
await assert.rejects(() => recolherPeriodoNegocio(periodo, async () => ({})), /totais da equipa/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, async url => url.includes("affiliates") ? {stats: {sales: 0, points: 0, subscriptions: 0}} : {content: [], totalElements: 2, totalPages: 1}), /Faltam movimentos/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, async url => url.includes("affiliates") ? {stats: {sales: 0, points: 0, subscriptions: 0}} : {content: [{state: "confirmed", commissions: 1}], totalPages: 2}), /repetiu uma página/);
let pedidosMovimentos = 0;
assert.equal((await recolherPeriodoNegocio(periodo, async url => {
  if (url.includes("affiliates")) return {stats: {sales: 10, points: 5, subscriptions: 1}};
  pedidosMovimentos++;
  return {content: [{state: "confirmed", commissions: pedidosMovimentos}], totalPages: 2, totalElements: 2};
})).comissoes, 3);
assert.equal(pedidosMovimentos, 2);

// Executa o favorito num MyOffice simulado: só a identidade e as respostas autorizadas saem da ponte.
const mensagens: {corpo: Record<string, unknown>; origem: string}[] = [];
const chamadas: string[] = [];
let receber: ((e: Record<string, unknown>) => Promise<void>) | undefined;
const popup = {postMessage: (corpo: Record<string, unknown>, origem: string) => mensagens.push({corpo, origem})};
const contexto = vm.createContext({
  location: {origin: "https://myoffice.icligo.com"}, URL, AbortSignal,
  window: {open: () => popup, addEventListener: (_: string, fn: typeof receber) => {receber = fn;}, removeEventListener: () => {}},
  fetch: async (url: string) => {chamadas.push(url); return url === "/api/auth/session" ? {ok: true, json: async () => ({user: {email: EMAIL_PAINEL_DEMONSTRACAO}, token: {accessToken: "token-privado"}})} : {status: 200, text: async () => '{"stats":{}}'};},
  alert: (texto: string) => {throw new Error(texto);},
});
await vm.runInContext(decodeURIComponent(favoritoNegocio("https://painel.example").slice("javascript:".length)), contexto);
assert(receber);
const evento = (url: string, origem = "https://painel.example", source: unknown = popup) => ({origin: origem, source, data: {canal: CANAL_NEGOCIO, id: 1, url}});
await receber(evento("identidade", "https://outro.example"));
await receber(evento("identidade", "https://painel.example", {}));
assert.equal(mensagens.length, 0);
await receber(evento("identidade"));
assert.equal(JSON.parse(mensagens[0]!.corpo.corpo as string).email, EMAIL_PAINEL_DEMONSTRACAO);
assert.equal(mensagens[0]!.origem, "https://painel.example");
await receber(evento("https://api.icligo.com/legacy-system/v1/team/affiliates?page=0&size=1"));
await receber(evento("https://outro.example/roubar"));
await receber(evento("https://api.icligo.com/legacy-system/v1/account/qualquer-coisa"));
assert.equal(chamadas.length, 2);
assert(!JSON.stringify(mensagens).includes("token-privado"));

// O MyOffice atual usa sessão por cookie e getMe em vez de /api/auth/session.
contexto.fetch = async (url: string) => {
  chamadas.push(url);
  return url === "/api/auth/session" ? {ok: false} : {ok: true, json: async () => ({t: 10, i: 0, p: {k: ["result"], v: [{t: 10, i: 1, p: {k: ["email"], v: [{t: 1, s: EMAIL_PAINEL_DEMONSTRACAO}]}}]}})};
};
await vm.runInContext(decodeURIComponent(favoritoNegocio("https://painel.example").slice("javascript:".length)), contexto);
await receber(evento("identidade"));
assert.equal(JSON.parse(mensagens.at(-1)!.corpo.corpo as string).email, EMAIL_PAINEL_DEMONSTRACAO);
assert(chamadas.some(url => url.startsWith("/_serverFn/")));

// O bloqueio da conta de teste acontece antes de qualquer acesso à base de dados.
assert(podeVerNovaArea(EMAIL_PAINEL_DEMONSTRACAO));
assert(!podeVerNovaArea("outro@example.com"));
const pedido = (body: unknown, origin?: string) => new Request("https://painel.example/api/consultor/nova-area/negocio", {method: "POST", headers: {"Content-Type": "application/json", ...(origin ? {origin} : {})}, body: JSON.stringify(body)});
for (const acao of ["ler", "iniciar", "periodo", "concluir"]) assert.equal((await POST(pedido({acao, email: "outro@example.com"}))).status, 403);
assert.equal((await POST(pedido({acao: "ler", email: EMAIL_PAINEL_DEMONSTRACAO}, "https://outro.example"))).status, 403);
assert.equal((await POST(pedido({acao: "apagar", email: EMAIL_PAINEL_DEMONSTRACAO}))).status, 400);
assert.equal((await POST(pedido({email: EMAIL_PAINEL_DEMONSTRACAO, texto: "a".repeat(17000)}))).status, 413);
console.log("Dashboard individual: períodos e ano bissexto, homólogo, projeções, validação, paginação, ponte sem token e acesso exclusivo OK.");
