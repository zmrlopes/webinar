/**
 * Proposta de orçamento: junção dos PDFs, validação, confirmações e PDF final,
 * com um consultor fictício cujos registos são apagados no fim.
 * Com COM_IA=1 lê um PDF real (PDF_PROPOSTA) e gera o conteúdo (gasta pedidos à API).
 * Com PASTA_PDF=<pasta> grava o resultado para o ver.
 */
import "./_env";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db, fecharDb } from "../src/lib/db";
import { juntarLeituras, listasIncluido, opcaoVazia, pendentesProposta, precosDaOpcao, propostaVazia, telemovelWhatsApp, validarProposta, type LeituraPDF, type Proposta } from "../src/lib/proposta";
import { apagarProposta, criarPlannerDaProposta, gerarConteudoProposta, guardarPerfil, guardarProposta, lerPDFProposta, pdfProposta } from "../src/lib/proposta-servidor";
import { abrirPlanner, apagarPlanner } from "../src/lib/travel-planner-servidor";

const email = "proposta-teste@example.test";
const id = "00000000-0000-4000-8000-0000000000ee";

assert.equal(telemovelWhatsApp("912 345 678"), "351912345678");
assert.equal(telemovelWhatsApp("+44 7700 900123"), "447700900123");
assert.equal(telemovelWhatsApp("abc"), "");

const leitura = (ficheiro: string, hotel: string, total: number, transfer = "Aeroporto–hotel–aeroporto"): LeituraPDF => ({
  ficheiro, hoteis: [{nome: hotel, quarto: "Duplo", regime: "Pequeno-almoço", total, precoPessoa: hotel === "Hotel B" ? null : total / 2}], incluido: ["Voos", "Taxas"], naoIncluido: ["Seguro"],
  condicoes: "", validade: "2026-11-30",
  viagem: {destino: "Funchal, Madeira", partida: "Lisboa", ida: "2026-11-10", regresso: "2026-11-14", viajantes: 2, voo: "TP1687 08:05", bagagem: "23 kg", transfer, transferIncluido: transfer !== "Sem transfer"},
});
const junta = juntarLeituras([leitura("a.pdf", "Hotel A", 900), leitura("b.pdf", "Hotel B", 1100), leitura("c.pdf", "Hotel C", 1300, "Sem transfer")]);
assert.equal(junta.opcoes.length, 3);
assert.equal(junta.opcoes[1]!.precoPessoa, 550, "Sem preço por pessoa no PDF, calcula-se com os viajantes");
assert.deepEqual(precosDaOpcao({total: null, precoPessoa: 400}, 3), {total: 1200, porPessoa: 400});
assert.deepEqual(listasIncluido({incluido: ["Voos", "Transfer privado"], naoIncluido: [], viagem: {...junta.viagem, transferIncluido: false}}), {sim: ["Voos"], nao: ["Transfers não incluídos"]}, "Transfers ditos de forma clara");
assert.equal(junta.opcoes[1]!.diferencas, "", "PDF igual ao primeiro, salvo o hotel, não tem diferenças");
assert.match(junta.opcoes[2]!.diferencas, /Transfer: Sem transfer/, "O que muda fica na opção");
assert.match(junta.opcoes[2]!.diferencas, /Transfers não incluídos/, "Opção sem transfers diz isso claramente");
assert.equal(junta.avisos.length, 1);
assert.deepEqual(junta.incluido, ["Voos", "Taxas"], "Itens repetidos aparecem uma vez");
assert.equal(validarProposta({...propostaVazia(id), opcoes: [opcaoVazia()], recomendada: 3}).recomendada, null, "Recomendada fora das opções é ignorada");

let planner = "";
try {
  let p: Proposta = {...propostaVazia(id), viagem: junta.viagem, opcoes: junta.opcoes, incluido: junta.incluido, naoIncluido: junta.naoIncluido, validade: junta.validade, recomendada: 1};
  if (process.env.COM_IA === "1") {
    const ficheiro = process.env.PDF_PROPOSTA!;
    const real = await lerPDFProposta(email, new File([readFileSync(ficheiro)], "proposta.pdf", {type: "application/pdf"}));
    console.log("Lido:", real.viagem.destino, real.viagem.ida, "·", real.hoteis.map(h => `${h.nome} ${h.total}€`).join(" | "), "· incluído:", real.incluido.join(", "));
    // Simula os outros dois PDFs: o mesmo, com outro hotel.
    const outros = [["Savoy Palace", 1.35], ["The Cliff Bay", 1.6]].map(([nome, f]) => ({...real, ficheiro: `${nome}.pdf`, hoteis: real.hoteis.slice(0, 1).map(h => ({...h, nome: String(nome), total: h.total && Math.round(h.total * Number(f)), precoPessoa: h.precoPessoa && Math.round(h.precoPessoa * Number(f))}))}));
    const j = juntarLeituras([{...real, hoteis: real.hoteis.slice(0, 1)}, ...outros]);
    p = {...propostaVazia(id), viagem: j.viagem, opcoes: j.opcoes, incluido: j.incluido, naoIncluido: j.naoIncluido, condicoes: j.condicoes || p.condicoes, validade: j.validade || "2026-11-30", recomendada: 1};
    const t0 = Date.now();
    p = await gerarConteudoProposta(email, p);
    console.log(`Conteúdo em ${Math.round((Date.now() - t0) / 1000)}s:`, p.opcoes.map(o => `${o.hotel} [${o.estrelas ?? "?"}★, ${o.zona}, ${o.lat?.toFixed(3)}, foto: ${o.foto?.credito ?? "sem"}]`).join(" | "));
    console.log("Destaques:", p.destaques.map(d => `${d.titulo}${d.foto ? "" : " (sem foto)"}`).join(", "), "· voos:", p.voos.length, "· dicas:", p.dicas.length);
  }
  await guardarPerfil(email, {telemovel: "912345678"});
  await guardarProposta(email, p);
  if (p.dicas.some(d => d.sensivel)) await assert.rejects(pdfProposta(email, id), /confirma/, "Não sai PDF com documentos/saúde por confirmar");
  p = {...p, dicas: p.dicas.map(d => ({...d, confirmado: true})), emergencia: {...p.emergencia, confirmado: true}};
  assert.deepEqual(pendentesProposta(p), []);
  for (const estilo of (process.env.COM_IA === "1" ? ["classico", "moderno"] : ["natural"]) as Proposta["estilo"][]) {
    await guardarProposta(email, {...p, estilo});
    const {bytes, nome} = await pdfProposta(email, id);
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
    if (process.env.PASTA_PDF) writeFileSync(join(process.env.PASTA_PDF, `proposta-${estilo}.pdf`), bytes);
    console.log("PDF", estilo, Math.round(bytes.length / 1024), "KB", nome);
  }
  planner = await criarPlannerDaProposta(email, id, 1);
  const criado = await abrirPlanner(email, planner);
  assert.equal(criado.viagem.hotel, p.opcoes[1]!.hotel, "O travel planner nasce com o hotel escolhido");
  console.log("Proposta: junção, diferenças, confirmações, PDF e travel planner a partir da opção verificados.");
} finally {
  await apagarProposta(email, id);
  if (planner) await apagarPlanner(email, planner);
  await db().query("delete from dashboard_config where chave = any($1)", [[`travel-planner:v1:${email}:perfil`, `reservas:v1:${email}:ia`]]);
  await fecharDb();
}
