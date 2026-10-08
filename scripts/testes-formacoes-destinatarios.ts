/** Testes com dados fictícios em tabelas temporárias, numa única transação.
 * Requer DATABASE_URL. Não altera dados reais nem envia emails ou notificações.
 */
import "./_env";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { db, fecharDb } from "../src/lib/db";
import { validarDestinatariosFormacao, pesquisarDestinatariosFormacao, DestinatariosInvalidos } from "../src/lib/formacoes-destinatarios";
import { criarFormacao, atualizarFormacao, buscarFormacaoParaEditar, listarFormacoesEquipa, listarWebinarsParaPainel, buscarWebinar, buscarWebinarRelevante, listarWebinarsFuturos } from "../src/lib/webinars";
import { registarCliqueEntrada } from "../src/lib/entrada";
import { notificarEquipaNovaSessao, type EmailSender } from "../src/lib/email";
import { processarLembretes } from "../src/lib/lembretes";
import { POST as entrarFormacao } from "../app/api/consultor/backoffice/formacao/route";

const selecionado = "ana@example.test", excluido = "bruno@example.test";
const id = "00000000-0000-4000-8000-000000000003";
const regSelecionado = "00000000-0000-4000-8000-000000000011";
const regExcluido = "00000000-0000-4000-8000-000000000012";
const sql = neon(process.env.DATABASE_URL!);
const pool = db(), original = pool.query;
const planos: { nome: string; consulta: string; valores: unknown[] }[] = [];
const sender: EmailSender = { enviar: async () => { throw new Error("O teste não pode enviar emails."); } };
let nome = "", validar = false;
pool.query = (async (consulta: string, valores: unknown[] = []) => {
  if (validar) return { rows: (valores[0] as string[]).includes(selecionado) ? [{ email: selecionado, nome: "Ana", telemovel: "912345678" }] : [] };
  if (consulta.startsWith("select nome from equipa_afiliados")) return { rows: [{ nome: "Bruno" }] };
  planos.push({ nome, consulta, valores });
  return { rows: consulta.startsWith("insert into webinars") ? [{ id }] : [], rowCount: 0 };
}) as typeof pool.query;
async function capturar(rotulo: string, fn: () => Promise<unknown>) { nome = rotulo; return fn(); }
try {
  validar = true;
  assert.equal(await validarDestinatariosFormacao(null, false), null);
  assert.equal(await validarDestinatariosFormacao(undefined, false), undefined);
  assert.deepEqual(await validarDestinatariosFormacao([" ANA@example.test ", selecionado], false), [selecionado]);
  for (const valor of [[], "todos", [excluido], [null], ["inválido"]]) {
    await assert.rejects(validarDestinatariosFormacao(valor, false), DestinatariosInvalidos);
  }
  await assert.rejects(validarDestinatariosFormacao([selecionado], true), DestinatariosInvalidos);
  validar = false;
  await capturar("lista-ana", () => listarFormacoesEquipa(" ANA@example.test "));
  await capturar("lista-bruno", () => listarFormacoesEquipa(excluido));
  await capturar("estatisticas-bruno", () => listarWebinarsParaPainel(excluido));
  await capturar("sessao-bruno", () => buscarWebinar(id, excluido));
  await capturar("sessao-admin", () => buscarWebinar(id));
  await capturar("sessao-publica", () => buscarWebinar(id, ""));
  await capturar("relevante-bruno", () => buscarWebinarRelevante(excluido));
  await capturar("publicas", () => listarWebinarsFuturos());
  await capturar("pesquisa-nome", () => pesquisarDestinatariosFormacao("Ana", 1));
  await capturar("pesquisa-sem-acento", () => pesquisarDestinatariosFormacao("joao", 1));
  await capturar("pesquisa-telefone", () => pesquisarDestinatariosFormacao("912 345", 1));
  await capturar("pesquisa-sem-painel", () => pesquisarDestinatariosFormacao("Sem Painel", 1));
  await capturar("entrada-ana", () => registarCliqueEntrada(regSelecionado));
  await capturar("entrada-bruno", () => registarCliqueEntrada(regExcluido));
  await capturar("avisos", () => notificarEquipaNovaSessao(sender, { webinarId: id, titulo: "Restrita", tipo: "formacao", sessaoExternaEm: new Date() }));
  await capturar("lembretes", () => processarLembretes({ sender, janelaHoras: 48 }));
  const negada = await capturar("pedido-bruno", () => entrarFormacao(new Request("https://exemplo.test", {
    method: "POST", body: JSON.stringify({ email: excluido, webinarId: id }),
  })));
  assert.equal((negada as Response).status, 404, "Não concede um link quando a seleção exclui a pessoa");
  const dados = { titulo: "Nova restrita", comecaEm: new Date(Date.now() + 86400000), duracaoMinutos: 60,
    linkZoom: "https://example.test/zoom", publicoParaLeads: false, destinatariosEmails: [selecionado] };
  await capturar("criar", () => criarFormacao(dados));
  await capturar("editar-bruno", () => atualizarFormacao(id, { ...dados, titulo: "Restrita", destinatariosEmails: [excluido] }));
  await capturar("editar-sem-mudar-pessoas", () => atualizarFormacao(id, { ...dados, titulo: "Restrita", destinatariosEmails: undefined }));
  await capturar("editar-leitura", () => buscarFormacaoParaEditar(id));
  await capturar("lista-depois-ana", () => listarFormacoesEquipa(selecionado));
  await capturar("lista-depois-bruno", () => listarFormacoesEquipa(excluido));
  await capturar("entrada-revogada", () => registarCliqueEntrada(regSelecionado));
  await capturar("abrir-equipa", () => atualizarFormacao(id, { ...dados, titulo: "Restrita", destinatariosEmails: null }));
  await capturar("lista-toda-equipa", () => listarFormacoesEquipa(selecionado));

  const criarTemporarias = ["webinars", "registrations", "equipa_afiliados", "links_consultor", "evento_inscricoes", "notificacoes_equipa", "emails"].map(t =>
    sql.query(`create temp table ${t} (like public.${t} including defaults including constraints) on commit drop`));
  const fixtures = [
    sql.query(`insert into equipa_afiliados (email,nome) values ($1,'Ana João Teste'),($2,'Bruno Teste'),('sem@example.test','Sem Painel')`, [selecionado, excluido]),
    sql.query(`insert into links_consultor (referencia,referencia_email) values ('ana',$1),('ana-2',$1),('bruno',$2)`, [selecionado, excluido]),
    sql.query(`insert into webinars (id,titulo,tipo,sessao_externa_id,sessao_externa_em,duracao_minutos,publico_para_leads,destinatarios_emails)
      values ('00000000-0000-4000-8000-000000000001','Aberta','formacao','1',now()+interval '1 day',60,false,null),
             ('00000000-0000-4000-8000-000000000002','Pública','formacao','2',now()+interval '1 day',60,true,null),
             ($1,'Restrita','formacao','3',now()+interval '1 hour',60,false,array[$2])`, [id, selecionado]),
    sql.query(`insert into registrations (id,webinar_id,nome,email,telemovel,link_pessoal)
      values ($1,$3,'Ana',$4,'+351 912 345 678','https://example.test/ana'),
             ($2,$3,'Bruno',$5,'913456789','https://example.test/bruno')`, [regSelecionado, regExcluido, id, selecionado, excluido]),
  ];
  const resultados = await sql.transaction([...criarTemporarias, ...fixtures,
    ...planos.map(p => sql.query(p.consulta, p.valores)),
  ]);
  const grupos = new Map<string, Record<string, unknown>[][]>();
  planos.forEach((p, i) => grupos.set(p.nome, [...(grupos.get(p.nome) ?? []), resultados[criarTemporarias.length + fixtures.length + i]!]));
  const linhas = (nome: string) => grupos.get(nome)![0]!;
  const titulos = (nome: string) => linhas(nome).map(r => r.titulo);
  assert.deepEqual(titulos("lista-ana"), ["Restrita", "Aberta"]);
  assert.deepEqual(titulos("lista-bruno"), ["Aberta"]);
  assert(!titulos("estatisticas-bruno").includes("Restrita"));
  assert.equal(linhas("sessao-bruno").length, 0);
  assert.equal(linhas("sessao-admin").length, 1);
  assert.equal(linhas("sessao-publica").length, 0);
  assert.equal(linhas("relevante-bruno")[0]!.titulo, "Aberta");
  assert.deepEqual(titulos("publicas"), ["Pública"]);
  assert.equal(linhas("pesquisa-nome").length, 1, "Deduplica os vários links de uma pessoa");
  assert.equal(linhas("pesquisa-sem-acento")[0]!.email, selecionado, "Permite pesquisar nomes sem escrever os acentos");
  assert.equal(linhas("pesquisa-telefone")[0]!.email, selecionado);
  assert.equal(linhas("pesquisa-sem-painel").length, 0);
  assert.equal(linhas("entrada-ana").length, 1);
  assert.equal(linhas("entrada-bruno").length, 0);
  assert.deepEqual(linhas("avisos").map(r => r.email), [selecionado]);
  assert.equal(Number(grupos.get("avisos")![1]![0]!.restantes), 1);
  assert.deepEqual(linhas("lembretes").map(r => r.id), [regSelecionado]);
  assert.equal(linhas("pedido-bruno").length, 0);
  assert.deepEqual(linhas("editar-leitura")[0]!.destinatarios_emails, [excluido]);
  assert(!titulos("lista-depois-ana").includes("Restrita"));
  assert(titulos("lista-depois-ana").includes("Nova restrita"), "A nova formação mantém os destinatários escolhidos");
  assert(!titulos("lista-depois-bruno").includes("Nova restrita"));
  assert(titulos("lista-depois-bruno").includes("Restrita"));
  assert.equal(linhas("entrada-revogada").length, 0);
  assert(titulos("lista-toda-equipa").includes("Restrita"));
  console.log("OK: pesquisa por nome/telefone, deduplicação, criação/edição, painel, acesso direto, avisos, lembretes e revogação. Dados reais intactos; nenhum envio.");
} finally { pool.query = original; await fecharDb(); }
