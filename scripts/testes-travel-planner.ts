/**
 * Travel planner: validação, confirmações obrigatórias e PDF nos três estilos,
 * com um consultor fictício cujos registos são apagados no fim.
 * Com COM_IA=1 também gera um roteiro real (gasta um pedido à API).
 * Com PASTA_PDF=<pasta> grava os PDFs para os ver.
 */
import "./_env";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { db, fecharDb } from "../src/lib/db";
import { diasDaViagem, diaVazio, pendentesPlanner, plannerVazio, validarPlanner, type TravelPlanner } from "../src/lib/travel-planner";
import { abrirPlanner, apagarPlanner, gerarRoteiroPlanner, guardarPlanner, listarPlanners, pdfPlanner, procurarFotos } from "../src/lib/travel-planner-servidor";


const email = "planner-teste@example.test";
const id = "00000000-0000-4000-8000-0000000000aa";

assert.equal(diasDaViagem("2026-11-10", "2026-11-14"), 5);
assert.equal(diasDaViagem("2026-11-14", "2026-11-10"), null);
assert.throws(() => validarPlanner({id: "x"}));
const limpo = validarPlanner({...plannerVazio(id), estilo: "outro", viagem: {destino: " Lisboa ", ida: "ontem", viajantes: -2},
  foto: {url: "https://exemplo.test/x.jpg"}, dicas: [{tema: "documentos", texto: "Cartão de cidadão", confirmado: true}, {tema: "clima", texto: "Ameno"}]});
assert.equal(limpo.estilo, "classico"); assert.equal(limpo.viagem.destino, "Lisboa"); assert.equal(limpo.viagem.ida, "");
assert.equal(limpo.viagem.viajantes, null); assert.equal(limpo.foto, null, "Só aceita fotografias do Wikimedia");
assert.equal(limpo.dicas[0]!.sensivel, true); assert.equal(limpo.dicas[1]!.confirmado, true, "Dicas não sensíveis não precisam de confirmação");

const base: TravelPlanner = {
  ...plannerVazio(id), nome: "Teste Funchal",
  viagem: {destino: "Funchal, Madeira", partida: "Lisboa", ida: "2026-11-10", regresso: "2026-11-13", voo: "TP1687 Lisboa 08:05 -> Funchal 09:50\nTP1688 Funchal 18:40 -> Lisboa 20:20",
    viajantes: 2, bagagem: "1 mala de 23 kg por pessoa", transfer: "Aeroporto - hotel - aeroporto", hotel: "Hotel Exemplo", quarto: "Duplo vista mar", regime: "Pequeno-almoço"},
  perfil: {tipo: "Casal", interesses: ["Natureza", "Gastronomia"], ritmo: "equilibrado", notas: "Aniversário de casamento no dia 2"},
  dias: [{...diaVazio(), titulo: "Chegada", manha: "Voo e transfer.", tarde: "Passeio pela Zona Velha — ruas com portas pintadas, “arte” e café.", noite: "Jantar de espetada."},
    {...diaVazio(), titulo: "Levadas", manha: "Levada dos Balcões.", tarde: "Ribeiro Frio.", noite: "Livre."}],
  dicas: [{tema: "documentos", titulo: "Documentos", texto: "Cartão de cidadão válido.", sensivel: true, confirmado: false},
    {tema: "clima", titulo: "Clima", texto: "Ameno, levem um casaco leve. Ação, ç, ã, õ, € 20 → ok ✈", sensivel: false, confirmado: true}],
  emergencia: {texto: "112", confirmado: false}, foto: null,
};

try {
  await guardarPlanner(email, base);
  assert.equal((await listarPlanners(email))[0]?.destino, "Funchal, Madeira");
  assert.deepEqual(pendentesPlanner(await abrirPlanner(email, id)), ["Documentos", "Contactos de emergência"]);
  await assert.rejects(pdfPlanner(email, id), /confirma/, "Não sai PDF com secções por confirmar");

  let planner: TravelPlanner = {...base, dicas: base.dicas.map(d => ({...d, confirmado: true})), emergencia: {texto: "112", confirmado: true}};
  if (process.env.COM_IA === "1") {
    const gerado = await gerarRoteiroPlanner(email, planner);
    assert.equal(gerado.dias.length, 4, "Um dia por cada dia da viagem");
    assert(gerado.dicas.some(d => d.tema === "documentos" && d.sensivel && !d.confirmado), "Documentos vêm por confirmar");
    console.log("Roteiro IA:", JSON.stringify(gerado.dias.map(d => d.titulo)), `· ${gerado.dicas.length} dicas`);
    assert(gerado.voos.length >= 2, "Voos estruturados para os cartões de embarque"); assert.equal(gerado.extras.clima.length, 12);
    console.log("Voos:", gerado.voos.map(v => `${v.origem}-${v.destino} ${v.partida}`).join(", "), "· locais:", gerado.dias.map(d => d.local).join(", "), "· fotos:", gerado.dias.filter(d => d.foto).length);
    planner = {...planner, ...gerado, dicas: gerado.dicas.map(d => ({...d, confirmado: true})), emergencia: {texto: gerado.emergencia, confirmado: true}};
  }
  const fotos = await procurarFotos("Funchal").catch(() => []);
  for (const estilo of ["classico", "moderno", "natural"] as const) {
    await guardarPlanner(email, {...planner, estilo, foto: planner.foto ?? (fotos[0] ? {url: fotos[0].url, credito: fotos[0].credito} : null)});
    const {bytes, nome} = await pdfPlanner(email, id);
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
    assert.equal(nome, "funchal-madeira-travel-planner.pdf");
    if (process.env.PASTA_PDF) writeFileSync(join(process.env.PASTA_PDF, `${estilo}.pdf`), bytes);
  }
  console.log(`Travel planner: validação, confirmações obrigatórias e PDF nos 3 estilos verificados${fotos[0] ? " (com fotografia)" : " (sem fotografia)"}.`);
} finally {
  await apagarPlanner(email, id);
  await db().query("delete from dashboard_config where chave = $1", [`reservas:v1:${email}:ia`]);
  await fecharDb();
}
