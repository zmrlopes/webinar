/** Executa as consultas reais em tabelas temporárias. Não altera contas nem envia mensagens. */
import "./_env";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { db, fecharDb } from "../src/lib/db";
import { limparPrimeirosPassos } from "../src/lib/primeiros-passos";
import { obterProgressoConsultor, importarProgressoConsultor, atualizarPassoConsultor } from "../src/lib/progresso-consultor";
import { obterAvisosConsultor } from "../src/lib/avisos-consultor";
import { precisaResponderTeambuilding } from "../src/lib/teambuilding";
import { precisaResponderTrofeus } from "../src/lib/trofeus";
import { precisaResponderHotel } from "../src/lib/hotel";
import { questionariosPendentes } from "../src/lib/questionarios";
import { PATCH, POST } from "../app/api/consultor/nova-area/progresso/route";
import { EMAIL_PAINEL_DEMONSTRACAO } from "../src/lib/demo";

assert.deepEqual(limparPrimeirosPassos([5, 3, 3, 0, 6, 2, "1", null]), [2, 3, 5]);
assert.deepEqual(limparPrimeirosPassos(null), []);
const pool = db(), original = pool.query, sql = neon(process.env.DATABASE_URL!);
const planos: { nome: string; consulta: string; valores: unknown[] }[] = [];
let nome = "", demo = false;
pool.query = (async (consulta: string, valores: unknown[] = []) => {
  if (demo) return { rows: consulta.includes("select e.slug") ? [{ slug: "equipa-outubro-2026" }] : [] };
  planos.push({ nome, consulta, valores });
  return { rows: [] };
}) as typeof pool.query;
async function capturar(rotulo: string, fn: () => Promise<unknown>) { nome = rotulo; return fn(); }
function pedido(corpo: unknown) { return new Request("https://exemplo.test/api/consultor/nova-area/progresso", { method: "POST", body: JSON.stringify(corpo) }); }
try {
  const antes = planos.length;
  assert.equal((await PATCH(pedido({ email: "outra@example.test", passo: 1, concluido: true }))).status, 403);
  for (const passo of [0, 6, "2", 1.5, null]) {
    assert.equal((await PATCH(pedido({ email: EMAIL_PAINEL_DEMONSTRACAO, passo, concluido: true }))).status, 400);
  }
  assert.equal((await POST(pedido({ email: EMAIL_PAINEL_DEMONSTRACAO, feitos: [1, 6] }))).status, 400);
  assert.equal(planos.length, antes, "Rejeita pedidos inválidos antes de consultar ou gravar dados");
  demo = true;
  const avisos = await obterAvisosConsultor(EMAIL_PAINEL_DEMONSTRACAO);
  assert.deepEqual(avisos.map(a => a.id), ["teambuilding", "trofeus", "hotel", "equipa-outubro-2026"]);
  assert(avisos[3]!.anonimo);
  assert(avisos.every(a => a.href.startsWith("/consultor/")));
  demo = false;

  const ana = "ana@example.test", bruno = "bruno@example.test";
  await capturar("vazio", () => obterProgressoConsultor(ana));
  await capturar("importar", () => importarProgressoConsultor(ana, [3, 1, 3]));
  await capturar("recuperar", () => obterProgressoConsultor(ana));
  await capturar("nao-substituir", () => importarProgressoConsultor(ana, [5]));
  await capturar("novo-passo", () => atualizarPassoConsultor(ana, 2, true));
  await capturar("desmarcar", () => atualizarPassoConsultor(ana, 1, false));
  await capturar("idempotente", () => atualizarPassoConsultor(ana, 2, true));
  await capturar("outra-conta", () => obterProgressoConsultor(bruno));
  await capturar("outro-dispositivo", () => atualizarPassoConsultor(ana, 4, true));
  await capturar("quinto", () => atualizarPassoConsultor(ana, 5, true));
  await capturar("terminar", () => atualizarPassoConsultor(ana, 1, true));
  await capturar("concluido-persiste", () => obterProgressoConsultor(ana));
  for (const [email, rotulo] of [[ana, "inscrita"], [bruno, "nao-inscrito"]]) {
    await capturar(`${rotulo}-evento`, () => precisaResponderTeambuilding(email!));
    await capturar(`${rotulo}-trofeus`, () => precisaResponderTrofeus(email!));
    await capturar(`${rotulo}-hotel`, () => precisaResponderHotel(email!));
    await capturar(`${rotulo}-questionarios`, () => questionariosPendentes(email!));
  }

  const setup = [
    sql.query(`create temp table dashboard_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz default now()) on commit drop`),
    ...["evento_inscricoes", "respostas_teambuilding", "respostas_trofeus", "respostas_hotel"].map(t => sql.query(`create temp table ${t} (email text) on commit drop`)),
    sql.query(`create temp table questionarios_estado (slug text, aberto boolean) on commit drop`),
    sql.query(`create temp table questionario_participacoes (slug text, email text) on commit drop`),
    sql.query(`insert into evento_inscricoes values ($1)`, [ana]),
    sql.query(`insert into respostas_hotel values ($1)`, [ana]),
    sql.query(`insert into questionarios_estado values ('equipa-outubro-2026',true),('fechado',false)`),
    sql.query(`insert into questionario_participacoes values ('equipa-outubro-2026',$1)`, [ana]),
  ];
  const resultados = await sql.transaction([...setup, ...planos.map(p => sql.query(p.consulta, p.valores))]);
  const porNome = new Map(planos.map((p, i) => [p.nome, resultados[setup.length + i]!]));
  const valor = (nome: string) => porNome.get(nome)![0]!.valor;
  assert.equal(porNome.get("vazio")!.length, 0);
  assert.deepEqual(valor("importar"), [1, 3]);
  assert.deepEqual(valor("recuperar"), [1, 3]);
  assert.deepEqual(valor("nao-substituir"), [1, 3]);
  assert.deepEqual(valor("novo-passo"), [1, 2, 3]);
  assert.deepEqual(valor("desmarcar"), [2, 3]);
  assert.deepEqual(valor("idempotente"), [2, 3]);
  assert.equal(porNome.get("outra-conta")!.length, 0);
  assert.deepEqual(valor("outro-dispositivo"), [2, 3, 4]);
  assert.deepEqual(valor("concluido-persiste"), [1, 2, 3, 4, 5]);
  assert.equal(porNome.get("inscrita-evento")![0]!.precisa, true);
  assert.equal(porNome.get("inscrita-trofeus")![0]!.precisa, true);
  assert.equal(porNome.get("inscrita-hotel")![0]!.precisa, false);
  for (const tipo of ["evento", "trofeus", "hotel"]) assert.equal(porNome.get(`nao-inscrito-${tipo}`)![0]!.precisa, false);
  assert.equal(porNome.get("inscrita-questionarios")!.length, 0);
  assert.deepEqual(porNome.get("nao-inscrito-questionarios")!.map(q => q.slug), ["equipa-outubro-2026"]);
  console.log("OK: progresso persistente por conta, importação sem substituir, vários dispositivos, desmarcar, cinco passos, permissões e avisos apenas para quem deve responder. Dados reais intactos; nenhum envio.");
} finally { pool.query = original; await fecharDb(); }
