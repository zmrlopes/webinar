import assert from "node:assert/strict";
import { db, fecharDb } from "../src/lib/db";
import { guardarGravacaoAdmin, apagarGravacaoAdmin } from "../src/lib/formacoes-gravadas-servidor";
import { processarNotificacoesGravadas } from "../src/lib/formacoes-gravadas-notificacoes";
import { GET as cron } from "../app/api/cron/formacoes-gravadas/route";
import type { AvisoPush } from "../src/lib/push";

async function main() {
  assert(process.env.DATABASE_URL, "Define DATABASE_URL para testar com tabelas temporárias.");
  const pool = db(), cliente = await pool.connect(), original = pool.query;
  const enviados: {email: string; aviso: AvisoPush}[] = [];
  const enviar = async (email: string, aviso: AvisoPush) => {enviados.push({email, aviso}); return {configurado: true, enviadas: 1, falhas: 0};};
  const base = {titulo: "Formação de teste", link: "https://youtu.be/abcDEF_12-3", categoria: "essenciais", origem: "tropa-elite", curso: "Sessões ao Vivo da Equipa", modulo: "Novas formações", data: "2026-10-14", visivel: true};
  try {
    await cliente.query(`create temporary table dashboard_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz not null default now());
      create temporary table equipa_afiliados (email text primary key, estado text);
      create temporary table links_consultor (referencia_email text);
      create temporary table push_subscriptions (email text);
      insert into equipa_afiliados values ('a@example.com','ACTIVE'),('b@example.com','ACTIVE'),('sem-painel@example.com','ACTIVE'),('inativo@example.com','INACTIVE'),('sem-push@example.com','ACTIVE');
      insert into links_consultor values ('a@example.com'),('b@example.com'),('inativo@example.com'),('sem-push@example.com');
      insert into push_subscriptions values ('a@example.com'),('a@example.com'),('b@example.com'),('sem-painel@example.com'),('inativo@example.com'),('lead@example.com');`);
    pool.query = cliente.query.bind(cliente) as typeof pool.query;
    const contar = async (prefixo: string) => Number((await cliente.query("select count(*) as n from dashboard_config where starts_with(chave,$1)", [prefixo])).rows[0].n);
    const pronta = async (id: string) => cliente.query("update dashboard_config set valor=jsonb_set(valor,'{disponivelEm}',to_jsonb(now()-interval '1 second')) where starts_with(chave,$1)", ["gravacao-push:v1:" + id + ":"]);

    const gravacao = await guardarGravacaoAdmin(base);
    assert.equal(await contar("gravacao-aviso:v1:"), 1);
    assert.equal(await contar("gravacao-push:v1:"), 2, "Um aviso por consultor elegível, mesmo com vários dispositivos");
    await guardarGravacaoAdmin({...gravacao, titulo: "Título editado"});
    await guardarGravacaoAdmin({...gravacao, visivel: false});
    await guardarGravacaoAdmin(gravacao);
    assert.equal(await contar("gravacao-push:v1:"), 2, "Editar ou republicar não duplica avisos");

    const primeiro = await processarNotificacoesGravadas({gravacaoId: gravacao.id, enviar: async (email, aviso) => {
      if (email === "b@example.com") return {configurado: true, enviadas: 0, falhas: 1};
      return enviar(email, aviso);
    }});
    assert.equal(primeiro.enviados, 1); assert.equal(primeiro.falhas, 1);
    assert.equal(enviados[0]!.aviso.titulo, "Nova formação gravada");
    assert.equal(enviados[0]!.aviso.url, "/consultor/formacoes/essenciais");
    assert.equal(enviados[0]!.aviso.tag, "gravacao-" + gravacao.id);
    await pronta(gravacao.id);
    await processarNotificacoesGravadas({gravacaoId: gravacao.id, enviar});
    assert.equal(enviados.length, 2); assert.equal(new Set(enviados.map(e => e.email)).size, 2, "A nova tentativa não repete destinatários concluídos");

    const oculta = await guardarGravacaoAdmin({...base, visivel: false});
    assert.equal(await contar("gravacao-aviso:v1:"), 1, "Uma gravação oculta não cria avisos");
    await guardarGravacaoAdmin({...oculta, visivel: true});
    assert.equal(await contar("gravacao-aviso:v1:"), 2, "A primeira publicação de uma gravação oculta cria o aviso");
    await guardarGravacaoAdmin(oculta);
    await processarNotificacoesGravadas({gravacaoId: oculta.id, enviar});
    assert.equal(enviados.length, 2, "Não envia avisos enquanto a formação está oculta");
    await guardarGravacaoAdmin({...oculta, visivel: true}); await pronta(oculta.id);
    await Promise.all([processarNotificacoesGravadas({gravacaoId: oculta.id, enviar}), processarNotificacoesGravadas({gravacaoId: oculta.id, enviar})]);
    assert.equal(enviados.length, 4, "Processadores concorrentes não duplicam as entregas");

    const apagada = await guardarGravacaoAdmin(base); await apagarGravacaoAdmin(apagada.id);
    await processarNotificacoesGravadas({gravacaoId: apagada.id, enviar}); assert.equal(enviados.length, 4, "Não avisa sobre formações removidas");
    const antiga = {...gravacao, id: "00000000-0000-0000-0000-000000000001"};
    await cliente.query("insert into dashboard_config(chave,valor) values($1,$2)", ["formacoes-gravadas:v1:" + antiga.id, JSON.stringify(antiga)]);
    const eventosAntes = await contar("gravacao-aviso:v1:");
    await guardarGravacaoAdmin(antiga); assert.equal(await contar("gravacao-aviso:v1:"), eventosAntes, "Editar uma gravação publicada antes desta funcionalidade não dispara um aviso retroativo");

    await cliente.query("alter table dashboard_config add constraint falha_teste check (not (starts_with(chave, 'gravacao-push:v1:') and valor->>'email' = 'falha@example.com')); insert into equipa_afiliados values('falha@example.com','ACTIVE'); insert into links_consultor values('falha@example.com'); insert into push_subscriptions values('falha@example.com');");
    const antes = await contar("");
    await assert.rejects(() => guardarGravacaoAdmin(base), /falha_teste/);
    assert.equal(await contar(""), antes, "Uma falha ao agendar reverte a publicação inteira");
    const segredo = process.env.CRON_SECRET; process.env.CRON_SECRET = "teste-cron-local";
    try {assert.equal((await cron(new Request("https://exemplo.test/api/cron/formacoes-gravadas"))).status, 401);} finally {if (segredo === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = segredo;}
    console.log("OK: publicação atómica, ocultas sem avisos, primeira disponibilização, destinatários elegíveis, repetição de falhas, concorrência, sem avisos em edições, sem avisos de gravações removidas e cron protegido. Só tabelas temporárias; nenhum push real enviado.");
  } finally {pool.query = original; cliente.release(); await fecharDb();}
}
main().catch(e => {console.error(e); process.exitCode = 1;});
