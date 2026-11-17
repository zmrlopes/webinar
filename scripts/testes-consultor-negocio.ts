import assert from "node:assert/strict";
import vm from "node:vm";
import {anosNegocio, fatorMedioNegocio, periodosNegocio, projecoesNegocio, resumoNegocio, totalAnoNegocio, validarTotaisNegocio, VERSAO_DADOS_NEGOCIO, type DadosNegocio, type TotaisNegocio} from "../src/lib/consultor-negocio";
import {CANAL_NEGOCIO, contarOrganizacaoNegocio, favoritoNegocio, recolherOrganizacaoNegocio, recolherPeriodoNegocio as recolherPeriodoBase} from "../src/lib/consultor-negocio-ponte";
import {db, fecharDb} from "../src/lib/db";
import {atualizarNegocio, iniciarNegocio} from "../src/lib/consultor-negocio-servidor";
import {podeVerNovaArea} from "../src/lib/consultor-nova-area";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {POST} from "../app/api/consultor/nova-area/negocio/route";

const totais = (n: number): TotaisNegocio => ({faturacao: n, comissoes: n, pontos: n, consultores: n});
const organizacao = {inicio: "2018-01-01", datasEntrada: ["2018-01-01", "2019-01-02", "2019-01-31", "2019-02-01"]};
const recolherPeriodoNegocio = (periodo: Parameters<typeof recolherPeriodoBase>[0], pedir: Parameters<typeof recolherPeriodoBase>[1]) => recolherPeriodoBase(periodo, pedir, organizacao);
const periodos = periodosNegocio("2028-02-29");
assert.equal(periodos.length, 111);
assert.equal(periodos[0]?.inicio, "2019-01-01");
assert.deepEqual(periodos.at(-1), {chave: "homologo", inicio: "2027-02-01", fim: "2027-02-28"});
assert.equal(periodos.find(p => p.chave === "2028-02")?.fim, "2028-02-29");
assert.equal(periodosNegocio("2029-01-01").length, 122);
assert.equal(periodosNegocio("2026-11-01", "2022-05-04")[0]?.inicio, "2022-01-01");
assert.equal(periodosNegocio("2026-11-01", "2015-03-01")[0]?.inicio, "2019-01-01");
assert.equal(periodosNegocio("2026-11-01", "invalida")[0]?.inicio, "2019-01-01");
assert.equal(periodosNegocio("2026-11-01", "2030-01-01")[0]?.inicio, "2019-01-01");
assert.equal(periodosNegocio("2026-11-01", "2026-10-01").length, 11);
assert(!periodosNegocio("2026-11-01", "2026-10-01").some(p => p.chave === "homologo"));
const dados: DadosNegocio = {ate: "2026-02-10", atualizadoEm: "2026-02-10T13:00:00Z", origemEmail: EMAIL_PAINEL_DEMONSTRACAO,
  meses: {"2025-01": totais(100), "2025-02": totais(500), "2026-01": totais(200), "2026-02": totais(100)}, homologo: totais(50)};
assert.deepEqual(resumoNegocio(dados, "faturacao"), {atual: 300, anterior: 150, variacao: 100});
assert.equal(fatorMedioNegocio(dados), 2);
assert.deepEqual(projecoesNegocio(300, 2), [300, 600, 1200, 2400, 4800, 9600]);
assert.equal(fatorMedioNegocio({...dados, meses: {}, homologo: totais(0)}), 1);
assert.equal(resumoNegocio({...dados, meses: {}, homologo: totais(0)}, "pontos").variacao, null);
const totaisOrganizacao: DadosNegocio = {...dados, versao: VERSAO_DADOS_NEGOCIO};
assert.deepEqual(resumoNegocio(totaisOrganizacao, "consultores"), {atual: 100, anterior: 50, variacao: 100}, "O cartão compara os totais na mesma data, sem somar meses");
assert.equal(totalAnoNegocio(totaisOrganizacao, "consultores", 2026), 100);
assert.equal(totalAnoNegocio(totaisOrganizacao, "consultores", 2025), 500);
assert.equal(totalAnoNegocio(totaisOrganizacao, "consultores", 2024), 0);
assert.equal(totalAnoNegocio(totaisOrganizacao, "faturacao", 2026), 300, "Mantém o acumulado dos outros indicadores");
assert.equal(totalAnoNegocio({...dados, versao: 5}, "consultores", 2026), 300, "Não transforma dados antigos em totais da organização");
assert.equal(resumoNegocio({...dados, versao: 5}, "consultores").atual, 300);
assert.equal(contarOrganizacaoNegocio(organizacao, "2017-12-31"), 0);
assert.equal(contarOrganizacaoNegocio(organizacao, "2018-01-01"), 1, "Inclui o próprio TP a partir da entrada");
assert.equal(contarOrganizacaoNegocio(organizacao, "2019-01-31"), 3);
assert.equal(contarOrganizacaoNegocio(organizacao, "2019-02-01"), 4);
assert.equal(contarOrganizacaoNegocio({inicio: "2020-01-01", datasEntrada: ["2018-01-01", "2020-01-01"]}, "2019-12-31"), 0, "A organização não existe antes da entrada do próprio, mesmo com descendentes anteriores");
assert.deepEqual(anosNegocio({...dados, meses: {...dados.meses, "2019-01": totais(1), "2021-01": totais(2), "2018-01": totais(1)}}), [2019, 2021, 2025, 2026]);
assert.throws(() => validarTotaisNegocio({...totais(1), faturacao: NaN}));
assert.throws(() => validarTotaisNegocio({...totais(1), consultores: 1.5}));
assert.throws(() => validarTotaisNegocio({faturacao: 0}));
assert.equal(validarTotaisNegocio({...totais(1), faturacao: -1.256}).faturacao, -1.26);

const periodo = periodos[0]!;
// Respostas seroval simuladas: raiz do Analisador (nome de utilizador) e «O meu negócio».
const seroval = (valor: unknown): unknown => {
  if (typeof valor === "number") return {t: 0, s: valor};
  if (typeof valor === "string") return {t: 1, s: valor};
  const o = valor as Record<string, unknown>;
  return {t: 10, p: {k: Object.keys(o), v: Object.values(o).map(seroval)}};
};
const raiz = () => seroval({result: {parent: {username: "Eu"}}});
const negocio = (fat: number, ativas: number, passivas: number, currency = "EUR") =>
  seroval({result: {currency, totalBillings: {value: fat, personal: 1, team: fat - 1}, activeCommission: {value: ativas}, passiveCommission: {value: passivas}}});
const topo = (pontos?: number) => ({content: pontos === undefined ? [{username: "outra", value: 3}] : [{username: "eu", value: pontos}, {username: "outra", value: 3}]});
const eNegocio = (url: string) => url.includes("/_serverFn/b08e83ed"), eAnalisador = (url: string) => url.includes("/_serverFn/4b457b9f");
type Fontes = {neg?: unknown; ana?: unknown; top?: unknown; equipa?: unknown};
const fontes = (f: Fontes = {}) => async (url: string) => {
  if (eNegocio(url)) return f.neg ?? negocio(1250, 12.25, 30.5);
  if (eAnalisador(url)) return f.ana ?? raiz();
  if (url.includes("topPoints")) return f.top ?? topo(25.5);
  if (url.includes("affiliates")) return f.equipa ?? {stats: {sales: 1000, points: 25, subscriptions: 2}};
  throw new Error("Fonte inesperada: " + url);
};
const pedidos: string[] = [];
const base = fontes();
const resultado = await recolherPeriodoNegocio(periodo, async url => {pedidos.push(url); return base(url);});
assert.deepEqual(resultado, {faturacao: 1250, pontos: 25.5, consultores: 3, comissoes: 42.75});
assert.equal(pedidos.length, 4);
assert(!pedidos.some(url => /activeIncome|passiveIncome|movements/.test(url)));
assert(pedidos.some(url => url.includes("topPoints") && url.includes("team=true") && url.includes("user=Eu")));
assert(pedidos.filter(url => url.startsWith("https://api.icligo.com")).every(url => url.includes("startDate=2019-01-01&endDate=2019-01-31")));
const pedidoNegocio = decodeURIComponent(pedidos.find(eNegocio)!);
assert(pedidoNegocio.includes('"custom"') && pedidoNegocio.includes('"2019-01-01"') && pedidoNegocio.includes('"2019-01-31"'));
assert.equal((await recolherPeriodoNegocio(periodo, fontes({top: topo(), equipa: {stats: {points: 7, subscriptions: 0}}}))).pontos, 7);
await assert.rejects(() => recolherPeriodoNegocio(periodo, fontes({top: {}})), /Top Pontos/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, fontes({neg: seroval({result: {currency: "EUR"}})})), /Faturação Total/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, fontes({neg: negocio(1, 1, 1, "USD")})), /euros/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, fontes({neg: seroval({result: {currency: "EUR", totalBillings: {value: 1}, activeCommission: {value: 1}}})})), /comissões ativas e passivas/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, fontes({ana: seroval({result: {}})})), /identificou a tua conta/);
await assert.rejects(() => recolherPeriodoNegocio(periodo, async () => ({})), /totais da equipa/);
assert.equal((await recolherPeriodoNegocio(periodo, fontes({neg: negocio(0, 0, 0)}))).comissoes, 0);
assert.equal((await recolherPeriodoNegocio(periodo, fontes({neg: negocio(10, -5, 30)}))).comissoes, 25);
assert.equal((await recolherPeriodoNegocio(periodo, fontes({equipa: {stats: {points: 25, subscriptions: 999}}}))).consultores, 3, "Nunca usa as novas subscrições como tamanho da organização");

// A lista completa do MyOffice (mais de uma página) inclui diretos e indiretos.
const membros = Array.from({length: 101}, (_, i) => ({user: {username: `tp-${i}`, creationDate: i < 100 ? "2025-12-31T10:00:00Z" : "2026-01-15T10:00:00Z"}}));
const lerOrganizacao = (linhas = membros, alterar?: (lista: Record<string, unknown>, pagina: number) => unknown) => async (url: string) => {
  if (eAnalisador(url)) return raiz();
  const u = new URL(url), pagina = Number(u.searchParams.get("page"));
  assert.equal(u.searchParams.get("size"), "100");
  const lista = {content: linhas.slice(pagina * 100, (pagina + 1) * 100), totalElements: linhas.length, totalPages: Math.ceil(linhas.length / 100)};
  return {list: alterar ? alterar(lista, pagina) : lista};
};
const completa = await recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao());
assert.equal(completa.datasEntrada.length, 102, "Recolhe todas as páginas e soma a própria conta");
assert.equal(contarOrganizacaoNegocio(completa, "2024-05-31"), 0);
assert.equal(contarOrganizacaoNegocio(completa, "2024-06-01"), 1);
assert.equal(contarOrganizacaoNegocio(completa, "2025-12-31"), 101);
assert.equal(contarOrganizacaoNegocio(completa, "2026-01-14"), 101);
assert.equal(contarOrganizacaoNegocio(completa, "2026-01-15"), 102);
assert.deepEqual(await recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao([])), {inicio: "2024-06-01", datasEntrada: ["2024-06-01"]}, "Sem equipa, o TP conta-se a si próprio");
assert.equal((await recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao([{user: {username: "EU", creationDate: "2024-06-01"}}]))).datasEntrada.length, 1, "Não duplica a própria conta se já estiver na lista");
await assert.rejects(() => recolherOrganizacaoNegocio("2026-02-10", null, lerOrganizacao()), /tua data de entrada/);
await assert.rejects(() => recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao([{user: {username: "a", creationDate: "invalida"}}])), /datas de entrada/);
await assert.rejects(() => recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao(membros, (lista, pagina) => pagina === 1 ? {...lista, content: []} : lista)), /faltam TPs/);
await assert.rejects(() => recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao(membros, (lista, pagina) => pagina === 1 ? {...lista, totalElements: 102} : lista)), /organização mudou/);
await assert.rejects(() => recolherOrganizacaoNegocio("2026-02-10", "2024-06-01", lerOrganizacao(membros, (lista, pagina) => pagina === 1 ? {...lista, content: [membros[0]]} : lista)), /páginas repetidas/);

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
await receber(evento("https://api.icligo.com/legacy-system/v1/stats/activeIncome?startDate=2019-01-01"));
await receber(evento("https://api.icligo.com/legacy-system/v1/stats/passiveIncome?startDate=2019-01-01"));
await receber(evento("https://api.icligo.com/legacy-system/v1/ranking/topPoints?team=true"));
await receber(evento("https://api.icligo.com/legacy-system/v1/account/movements"));
await receber(evento("https://outro.example/roubar"));
await receber(evento("https://api.icligo.com/legacy-system/v1/account/qualquer-coisa"));
await receber(evento("https://myoffice.icligo.com/_serverFn/4b457b9f58baf866962a4eb026255982ff0e9deb00bd1b341b16408098b7584a?payload=x"));
await receber(evento("https://myoffice.icligo.com/_serverFn/b08e83ed56f14e68ed29ed2ec93d6132d46035fac5637de359d8e293aa37dfde?payload=x"));
await receber(evento("https://myoffice.icligo.com/_serverFn/outra-funcao"));
assert.equal(chamadas.length, 7);
assert.equal(JSON.parse(mensagens[0]!.corpo.corpo as string).versao, 5);
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

// Emails inválidos são recusados antes de qualquer acesso à base de dados; a equipa é confirmada no servidor.
assert(podeVerNovaArea(EMAIL_PAINEL_DEMONSTRACAO));
assert(podeVerNovaArea("outro@example.com"));
const pedido = (body: unknown, origin?: string) => new Request("https://painel.example/api/consultor/nova-area/negocio", {method: "POST", headers: {"Content-Type": "application/json", ...(origin ? {origin} : {})}, body: JSON.stringify(body)});
for (const acao of ["ler", "iniciar", "periodo", "concluir"]) assert.equal((await POST(pedido({acao, email: "sem-arroba.example.com"}))).status, 403);
assert.equal((await POST(pedido({acao: "ler", email: EMAIL_PAINEL_DEMONSTRACAO}, "https://outro.example"))).status, 403);
assert.equal((await POST(pedido({acao: "apagar", email: EMAIL_PAINEL_DEMONSTRACAO}))).status, 400);
assert.equal((await POST(pedido({email: EMAIL_PAINEL_DEMONSTRACAO, texto: "a".repeat(17000)}))).status, 413);
// Publica apenas recolhas completas da nova versão, preservando o dashboard anterior.
process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
const pool = db(), originalQuery = pool.query, originalConnect = pool.connect;
const guardados = new Map<string, unknown>();
pool.query = (async (sql: string, args: unknown[] = []) => {
  if (/^(begin|commit|rollback)/.test(sql)) return {rows: []};
  if (sql.startsWith("select nome from equipa_afiliados")) return {rows: [{nome: "Consultor"}]};
  if (sql.startsWith("select to_char")) return {rows: [{data_registo: `${new Date().getUTCFullYear()}-01-01`}]};
  if (sql.startsWith("select valor")) return {rows: guardados.has(String(args[0])) ? [{valor: structuredClone(guardados.get(String(args[0])))}] : []};
  if (sql.startsWith("insert into dashboard_config") || sql.startsWith("update dashboard_config")) {guardados.set(String(args[0]), JSON.parse(String(args[1]))); return {rows: []};}
  if (sql.startsWith("delete from dashboard_config")) {guardados.delete(String(args[0])); return {rows: []};}
  throw Error("Consulta inesperada: " + sql);
}) as typeof pool.query;
pool.connect = (async () => ({query: pool.query, release: () => {}})) as unknown as typeof pool.connect;
try {
  const email = EMAIL_PAINEL_DEMONSTRACAO, chave = `consultor:negocio:${email}:v1`, recolha = `consultor:negocio:${email}:recolha:v1`;
  guardados.set(chave, dados);
  for (const acao of ["iniciar", "periodo", "concluir"]) {
    assert.equal((await POST(pedido({email, acao, origemEmail: email}))).status, 409, "Abas antigas não podem gravar contagens antigas como versão nova");
  }
  assert.equal((await POST(pedido({email, acao: "iniciar", origemEmail: email, versao: VERSAO_DADOS_NEGOCIO}))).status, 200);
  const plano = await iniciarNegocio(email, email);
  assert(plano.dataRegisto);
  await assert.rejects(() => atualizarNegocio(email, plano.id, null, null, true), /Faltam períodos/);
  assert.deepEqual(guardados.get(chave), dados);
  const emCurso = structuredClone(guardados.get(recolha)) as Record<string, unknown>;
  guardados.set(recolha, {...emCurso, versao: 5});
  await assert.rejects(() => atualizarNegocio(email, plano.id, plano.periodos[0]!.chave, totais(1), false), /terminou ou foi substituída/);
  guardados.set(recolha, emCurso);
  for (const p of plano.periodos) await atualizarNegocio(email, plano.id, p.chave, totais(42), false);
  assert.deepEqual(guardados.get(chave), dados, "Períodos isolados não substituem os dados completos");
  const novos = await atualizarNegocio(email, plano.id, null, null, true);
  assert.equal(novos?.versao, VERSAO_DADOS_NEGOCIO);
  assert.equal(resumoNegocio(novos!, "consultores").atual, 42);
  assert.equal(guardados.has(recolha), false);
} finally {pool.query = originalQuery; pool.connect = originalConnect; await fecharDb();}
console.log("Dashboard individual: TPs totais incluindo o próprio, todas as páginas, datas mensais e homólogas, sem somar efetivos; restantes métricas, privacidade, falhas e versão de recolha verificadas.");
