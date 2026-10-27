import assert from "node:assert/strict";
import {neon} from "@neondatabase/serverless";
import {db, fecharDb} from "../src/lib/db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {ETAPAS_MENTOR, TAREFAS_MENTOR, TOTAL_TAREFAS_MENTOR, limparTarefasMentor} from "../src/lib/mentor-checklist";
import {listarTPsMentorados, marcarTarefaMentor} from "../src/lib/mentor-checklist-servidor";
import {POST} from "../app/api/consultor/nova-area/mentor-checklist/route";

async function main() {
  const real = process.argv.includes("--postgres"), conexao = process.env.DATABASE_URL;
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool = db(), consulta = pool.query;
  const mentor = EMAIL_PAINEL_DEMONSTRACAO, outro = "mentor2@example.com";
  const a = "tp-a@example.com", b = "tp-b@example.com", neto = "neto@example.com", novo = "novo@example.com";
  const t1 = TAREFAS_MENTOR[0]!.id, t2 = TAREFAS_MENTOR[1]!.id;
  const comandos: {texto: string; args: unknown[]}[] = [];
  try {
    assert.equal(ETAPAS_MENTOR.length, 10); assert.equal(TOTAL_TAREFAS_MENTOR, 42);
    assert.equal(new Set(TAREFAS_MENTOR.map(t => t.id)).size, TOTAL_TAREFAS_MENTOR);
    assert.deepEqual(limparTarefasMentor([t1, t1, "inventada", 12, t2]), [t1, t2]);
    for (const acao of ["listar", "marcar"]) {
      const r = await POST(new Request("http://localhost/api", {method: "POST", body: JSON.stringify({email: outro, acao})}));
      assert.equal(r.status, 403); assert.equal(r.headers.get("Cache-Control"), "private, no-store");
    }
    pool.query = (async () => ({rows: []})) as unknown as typeof pool.query;
    assert.equal((await POST(new Request("http://localhost/api", {method: "POST", body: JSON.stringify({email: mentor, acao: "listar"})}))).status, 403);
    for (const tarefa of ["inventada", null, {}, "__proto__"]) await assert.rejects(() => marcarTarefaMentor(mentor, a, tarefa, true), /válidos/);
    await assert.rejects(() => marcarTarefaMentor(mentor, a, t1, "true"), /válidos/);
    await assert.rejects(() => marcarTarefaMentor(mentor, "email inválido", t1, true), /válidos/);
    await assert.rejects(() => marcarTarefaMentor(mentor, a, t1, true), /mentor direto/);
    // Captura as consultas da implementação; o ensaio PostgreSQL abaixo executa-as
    // contra tabelas temporárias, sem escrever nos registos reais da plataforma.
    pool.query = (async (texto: string, args: unknown[] = []) => {
      comandos.push({texto, args}); return {rows: texto.startsWith("insert") ? [{valor: []}] : []};
    }) as typeof pool.query;
    const listar = async (email = mentor) => {await listarTPsMentorados(email); return comandos.length - 1;};
    const marcar = async (email: string, tp: string, tarefa: string, feito: boolean) => {await marcarTarefaMentor(email, tp, tarefa, feito); return comandos.length - 1;};
    const inicial = await listar(), primeira = await marcar(mentor, a, t1, true), segunda = await marcar(mentor, a, t2, true);
    const repetida = await marcar(mentor, a, t1, true), desmarcada = await marcar(mentor, a, t1, false);
    const proibida = await marcar(outro, a, t1, true), propria = await marcar(mentor, mentor, t1, true);
    const indireta = await marcar(mentor, neto, t1, true), semLigacao = await marcar(mentor, novo, t1, true);
    if (real) {
      assert(conexao, "Define DATABASE_URL para executar o teste PostgreSQL.");
      const sql = neon(conexao);
      const q = (i: number) => sql.query(comandos[i]!.texto, comandos[i]!.args);
      const reabertura = await listar(), novos = await listar(), antigaMentoria = await listar();
      const antigaEscrita = await marcar(mentor, a, t1, true), novaMentoria = await listar(outro);
      const novoProgresso = await marcar(outro, a, t1, true), restaurada = await listar();
      const r = await sql.transaction([
        sql.query("create temp table equipa_afiliados (email text primary key, nome text, upline_email text, data_registo date, estado text) on commit drop"),
        sql.query("create temp table dashboard_config (chave text primary key, valor jsonb, atualizado_em timestamptz default now()) on commit drop"),
        sql.query("insert into equipa_afiliados values ($1,'Mentor',null,null,'ACTIVE'),($2,'Outro',null,null,'ACTIVE'),($3,'TP A',$1,'2026-10-26','ACTIVE'),($4,'TP B',$1,null,'ACTIVE'),($5,'Neto',$3,'2026-10-27','ACTIVE'),($6,'Novo',null,'2026-10-27','ACTIVE')", [mentor, outro, a, b, neto, novo]),
        q(inicial), q(primeira), q(segunda), q(repetida), q(desmarcada), q(proibida), q(propria), q(indireta), q(semLigacao), q(reabertura),
        sql.query("update equipa_afiliados set upline_email=$1 where email=$2", [mentor, novo]), q(novos),
        sql.query("update equipa_afiliados set upline_email=$1 where email=$2", [outro, a]), q(antigaMentoria), q(antigaEscrita), q(novaMentoria), q(novoProgresso),
        sql.query("update equipa_afiliados set upline_email=$1 where email=$2", [mentor, a]), q(restaurada),
      ]);
      assert.deepEqual(r[3]!.map(x => x.email), [a, b]);
      assert.deepEqual(limparTarefasMentor(r[4]![0]!.valor), [t1]);
      assert.deepEqual(limparTarefasMentor(r[5]![0]!.valor), [t1, t2]);
      assert.deepEqual(limparTarefasMentor(r[6]![0]!.valor), [t1, t2]);
      assert.deepEqual(limparTarefasMentor(r[7]![0]!.valor), [t2]);
      for (const i of [8, 9, 10, 11, 17]) assert.equal(r[i]!.length, 0, "Sem escrita fora da mentoria direta atual");
      assert.deepEqual(limparTarefasMentor(r[12]!.find(x => x.email === a)!.valor), [t2]);
      assert(r[14]!.some(x => x.email === novo), "Associar na árvore basta para aparecer, sem outra inscrição");
      assert(!r[16]!.some(x => x.email === a), "Reatribuição remove o acesso da antiga mentora");
      assert.deepEqual(limparTarefasMentor(r[18]!.find(x => x.email === a)!.valor), [], "O progresso de uma mentora não é exposto a outra");
      assert.deepEqual(limparTarefasMentor(r[19]![0]!.valor), [t1]);
      assert.deepEqual(limparTarefasMentor(r[21]!.find(x => x.email === a)!.valor), [t2], "Cada acompanhamento mantém o seu histórico privado");
    }
    console.log(`OK: 42 tarefas/10 etapas, validação, acesso só de teste${real ? ", SQL real: mentoria atual, associação automática, persistência, idempotência, isolamento, desmarcar e mudança de mentor. Só tabelas temporárias." : ". Para testar persistência e permissões no PostgreSQL: --postgres."}`);
  } finally {pool.query = consulta; await fecharDb();}
}
main().catch(e => {console.error(e); process.exitCode = 1;});
