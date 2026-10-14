import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { GET, POST, DELETE } from "../app/api/admin/formacoes-gravadas/route";
import { POST as consultar } from "../app/api/consultor/formacoes/route";
import { POST as marcarVista } from "../app/api/consultor/formacoes/vista/route";
import { db, fecharDb } from "../src/lib/db";
import { CATEGORIAS_FORMACOES, contarAulas } from "../src/lib/formacoes-gravadas";
import { juntarGravacoes, type GravacaoAdmin } from "../src/lib/formacoes-gravadas-servidor";
import { aulaTemVideo, normalizarLinkGravacao, urlDaAula } from "../src/lib/formacoes-links";

async function main() {
  for (const link of ["https://youtu.be/abcDEF_12-3?t=30", "https://www.youtube.com/watch?v=abcDEF_12-3&list=outro", "https://youtube.com/shorts/abcDEF_12-3", "https://m.youtube.com/live/abcDEF_12-3", "https://www.youtube-nocookie.com/embed/abcDEF_12-3"]) {
    assert.deepEqual(normalizarLinkGravacao(link), {url: "https://www.youtube.com/watch?v=abcDEF_12-3", youtube: "abcDEF_12-3"});
  }
  for (const link of ["javascript:alert(1)", "data:text/html,video", "file:///video.mp4", "https://user:senha@example.com/video", "https://youtube.com/playlist?list=1", "https://youtu.be/invalid", "https://youtube.com/@canal", "", null]) assert.throws(() => normalizarLinkGravacao(link));
  assert.equal(normalizarLinkGravacao("https://vimeo.com/123456").youtube, null);
  const senha = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "teste-formacoes-local";
  try {
    for (const path of ["/admin/formacoes-gravadas", "/api/admin/formacoes-gravadas"]) {
      assert.equal(proxy(new NextRequest("https://exemplo.test" + path)).status, 401);
      assert.equal(proxy(new NextRequest("https://exemplo.test" + path, {headers: {Authorization: "Basic " + btoa(`${process.env.ADMIN_USER || "admin"}:teste-formacoes-local`)}})).headers.get("x-middleware-next"), "1");
    }
  } finally {if (senha === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = senha;}

  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), original = pool.query, registos = new Map<string, GravacaoAdmin>(), vistas = new Map<string, Set<string>>();
  pool.query = (async (sql: string, valores: unknown[] = []) => {
    const chave = String(valores[0]);
    if (sql.includes("from equipa_afiliados")) return {rows: chave === "consultor@example.com" ? [{nome: "Consultor"}] : [], rowCount: 0};
    if (sql.includes("select aula_id")) return {rows: [...vistas.get(chave) ?? []].map(aula_id => ({aula_id})), rowCount: 0};
    if (sql.includes("insert into formacoes_vistas")) {const set = vistas.get(chave) ?? new Set<string>(); set.add(String(valores[1])); vistas.set(chave, set); return {rows: [], rowCount: 1};}
    if (sql.includes("delete from formacoes_vistas")) {vistas.get(chave)?.delete(String(valores[1])); return {rows: [], rowCount: 1};}
    if (sql.includes("starts_with(chave")) return {rows: [...registos.entries()].filter(([k]) => k.startsWith(chave)).map(([, valor]) => ({valor})), rowCount: registos.size};
    if (sql.startsWith("insert into dashboard_config")) {registos.set(chave, JSON.parse(String(valores[1]))); return {rows: [], rowCount: 1};}
    if (sql.startsWith("update dashboard_config")) {if (!registos.has(chave)) return {rows: [], rowCount: 0}; registos.set(chave, JSON.parse(String(valores[1]))); return {rows: [], rowCount: 1};}
    if (sql.startsWith("delete from dashboard_config")) return {rows: [], rowCount: Number(registos.delete(chave))};
    throw new Error("Consulta inesperada: " + sql);
  }) as typeof pool.query;
  const req = (dados: unknown) => new Request("https://exemplo.test/api", {method: "POST", body: JSON.stringify(dados)});
  const base = {titulo: "Nova formação de teste", link: "https://youtu.be/abcDEF_12-3", categoria: "essenciais", origem: "tropa-elite", curso: "Sessões ao Vivo da Equipa", modulo: "Novas formações", data: "2026-10-14", min: 45, formador: "Formador", visivel: true};
  const antes = structuredClone(CATEGORIAS_FORMACOES);
  try {
    for (const dados of [{...base, titulo: ""}, {...base, categoria: "inventada"}, {...base, origem: "outra"}, {...base, data: "2026-02-30"}, {...base, min: -1}, {...base, min: 1.5}, {...base, link: "javascript:alert(1)"}, {...base, id: "../registo"}, {...base, visivel: "sim"}, null]) assert.equal((await POST(req(dados))).status, 400);
    assert.equal(registos.size, 0, "Dados inválidos não são gravados");
    const criado = await POST(req(base)); assert.equal(criado.status, 200);
    const {gravacao} = await criado.json() as {gravacao: GravacaoAdmin};
    const aulaId = "gravada-" + gravacao.id;
    assert.equal(gravacao.link, "https://www.youtube.com/watch?v=abcDEF_12-3");
    assert.equal((await (await GET()).json()).gravacoes.length, 1);
    const lista = await consultar(req({email: "consultor@example.com", completo: true})); assert.equal(lista.status, 200);
    const catalogo = (await lista.json()).completas;
    const essenciais = catalogo.find((c: {id: string}) => c.id === "essenciais");
    const aula = essenciais.cursos.flatMap((c: {modulos: {aulas: unknown[]}[]}) => c.modulos.flatMap(m => m.aulas)).find((a: {id: string}) => a.id === aulaId);
    assert.equal(aula.titulo, base.titulo); assert.equal(aula.youtube, "abcDEF_12-3"); assert(aulaTemVideo(aula)); assert.equal(urlDaAula(aula), gravacao.link);
    assert.equal(contarAulas(essenciais), contarAulas(antes[0]!) + 1);
    assert.deepEqual(CATEGORIAS_FORMACOES, antes, "O catálogo original mantém-se intacto");
    assert.equal((await consultar(req({email: "desconhecido@example.com", completo: true}))).status, 404);
    assert.equal((await marcarVista(req({email: "consultor@example.com", aulaId, vista: true}))).status, 200);
    assert.equal((await marcarVista(req({email: "consultor@example.com", aulaId: "inventada", vista: true}))).status, 404);
    const editada = {...gravacao, titulo: "Título corrigido", link: "https://vimeo.com/123456"};
    assert.equal((await POST(req(editada))).status, 200);
    const detalhes = await (await consultar(req({email: "consultor@example.com", categoria: "essenciais"}))).json();
    assert(detalhes.vistas.includes(aulaId), "Editar o título ou link mantém o progresso da aula");
    assert(!(await (await consultar(req({email: "zmrlopes@gmail.com", categoria: "essenciais"}))).json()).vistas.includes(aulaId), "O progresso continua privado por consultor");
    const externa = juntarGravacoes(antes, [editada])[0]!.cursos.flatMap(c => c.modulos.flatMap(m => m.aulas)).find(a => a.id === aulaId)!;
    assert.equal(externa.youtube, null); assert(aulaTemVideo(externa)); assert.equal(urlDaAula(externa), editada.link);
    const idExistente = antes[0]!.cursos[0]!.modulos[0]!.aulas[0]!.id;
    assert.equal((await marcarVista(req({email: "consultor@example.com", aulaId: idExistente, vista: true}))).status, 200);
    assert.equal((await POST(req({...editada, visivel: false}))).status, 200);
    const oculta = await (await consultar(req({email: "consultor@example.com", categoria: "essenciais"}))).json();
    assert.equal(contarAulas(oculta.categoria), contarAulas(antes[0]!));
    assert.equal((await marcarVista(req({email: "consultor@example.com", aulaId, vista: false}))).status, 404);
    assert.equal((await POST(req(editada))).status, 200);
    assert.equal((await marcarVista(req({email: "consultor@example.com", aulaId, vista: false}))).status, 200);
    assert(!vistas.get("consultor@example.com")!.has(aulaId));
    const outro = {...gravacao, id: "00000000-0000-0000-0000-000000000099", origem: "icligo" as const, curso: "Curso novo", modulo: "Módulo novo"};
    const novoCatalogo = juntarGravacoes(antes, [outro]);
    assert(novoCatalogo[0]!.icligo.cursos.some(c => c.titulo === outro.curso));
    assert(!novoCatalogo[0]!.cursos.some(c => c.titulo === outro.curso));
    assert.equal((await DELETE(req({id: gravacao.id}))).status, 200);
    assert.equal(registos.size, 0);
    assert.equal((await POST(req(editada))).status, 404, "Editar uma gravação removida não a recria");
    assert.equal((await DELETE(req({id: gravacao.id}))).status, 404);
  } finally {pool.query = original; await fecharDb();}
  console.log("OK: criação, edição, ocultação, remoção, links YouTube e externos, categorias/cursos/módulos, pesquisa pelo catálogo completo, aulas vistas privadas, preservação da biblioteca e proteção do admin. Sem alterações a dados reais.");
}
main().catch(e => {console.error(e); process.exitCode = 1;});
