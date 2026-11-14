import assert from "node:assert/strict";
import { enviarComprovativoBF } from "../src/lib/blackfriday-envio";
import { CONFIG_BF, type DadosBF, type InscricaoBF } from "../src/lib/blackfriday";

const reserva: InscricaoBF = { id: "reserva-teste", email: "tp@example.test", nome: "TP", casa: 1, referencia: "ABC123", valorCentimos: 500000, dataReserva: "2026-11-14", curinga: true, estado: "pendente", enviadoEm: "2026-11-14T12:00:00Z", ficheiroNome: "prova.pdf", ficheiroTipo: "application/pdf", hash: "teste", revisoes: [] };
const dados = (inscricoes: InscricaoBF[] = []): DadosBF => ({ config: CONFIG_BF, hoje: "2026-11-14", inscricoes, faturacao: null, simulacao: false });
const json = (valor: unknown, status = 200) => new Response(JSON.stringify(valor), { status, headers: { "Content-Type": "application/json" } });
function formulario() {
  const f = new FormData();
  for (const [chave, valor] of Object.entries({ email: reserva.email, acao: "enviar", casa: "1", referencia: "abc-123", valor: "5000", dataReserva: reserva.dataReserva, curinga: "true", simulacao: "false" })) f.set(chave, valor);
  f.set("ficheiro", new File(["%PDF-teste"], "prova.pdf", { type: "application/pdf" }));
  return f;
}

const f = formulario(), original = f.get("ficheiro");
await enviarComprovativoBF(f, (async (_url, init) => {
  const copia = (init?.body as FormData).get("ficheiro") as File;
  assert.notEqual(copia, original);
  assert.equal(await copia.text(), "%PDF-teste");
  assert.equal(copia.name, "prova.pdf");
  return json(dados([reserva]));
}) as typeof fetch);

let chamadas = 0;
const confirmada = await enviarComprovativoBF(formulario(), (async (_url, init) => {
  chamadas++;
  if (init?.body instanceof FormData) throw new TypeError("Failed to fetch");
  return json(dados([reserva]));
}) as typeof fetch);
assert.equal(chamadas, 2, "Se o servidor já guardou, consulta o cartão sem repetir o envio");
assert.equal(confirmada.inscricoes[0]!.enviadoEm, reserva.enviadoEm, "Preservar a hora original para a ordem dos prémios");

let envios = 0;
await enviarComprovativoBF(formulario(), (async (_url, init) => {
  if (init?.body instanceof FormData) {
    if (++envios === 1) throw new TypeError("Load failed");
    return json(dados([reserva]));
  }
  return json(dados());
}) as typeof fetch);
assert.equal(envios, 2, "Uma falha temporária pode repetir uma vez, após confirmar o cartão");

await enviarComprovativoBF(formulario(), (async (_url, init) => init?.body instanceof FormData
  ? json({ erro: "Esta casa já tem uma reserva enviada." }, 409) : json(dados([reserva]))) as typeof fetch);
await enviarComprovativoBF(formulario(), (async (_url, init) => init?.body instanceof FormData
  ? new Response("resposta interrompida", { status: 200 }) : json(dados([reserva]))) as typeof fetch);
await assert.rejects(() => enviarComprovativoBF(formulario(), (async (_url, init) => init?.body instanceof FormData
  ? json({ erro: "Reserva duplicada." }, 409) : json(dados([{ ...reserva, referencia: "OUTRA" }]))) as typeof fetch), /Reserva duplicada/);

chamadas = 0;
await assert.rejects(() => enviarComprovativoBF(formulario(), (async () => { chamadas++; throw new TypeError("Failed to fetch"); }) as typeof fetch), /Os campos e o comprovativo continuam/);
assert.equal(chamadas, 2, "Sem ligação para confirmar o cartão, não repete a escrita");
envios = 0;
await assert.rejects(() => enviarComprovativoBF(formulario(), (async (_url, init) => {
  if (init?.body instanceof FormData) { envios++; throw new TypeError("Failed to fetch"); }
  return json(dados());
}) as typeof fetch), /A ligação falhou/);
assert.equal(envios, 2, "Não há repetição sem limite");

envios = 0;
await assert.rejects(() => enviarComprovativoBF(formulario(), (async (_url, init) => {
  if (init?.body instanceof FormData) { envios++; throw new TypeError("Failed to fetch"); }
  return json({ ...dados([reserva]), simulacao: true });
}) as typeof fetch), /A ligação falhou/);
assert.equal(envios, 1, "Um cartão de outro modo nunca confirma nem autoriza repetição no desafio real");

chamadas = 0;
await assert.rejects(() => enviarComprovativoBF(formulario(), (async () => { chamadas++; return json({ erro: "O joker exige uma única reserva de pelo menos 5.000 €." }, 400); }) as typeof fetch), /joker/);
assert.equal(chamadas, 1, "Erros das regras não são repetidos nem ocultados");
await assert.rejects(() => enviarComprovativoBF(formulario(), (async () => new Response("Request Entity Too Large", { status: 413 })) as typeof fetch), /demasiado grande/);

const ilegivel = formulario();
Object.defineProperty(ilegivel.get("ficheiro"), "arrayBuffer", { value: async () => { throw new Error("file unavailable"); } });
await assert.rejects(() => enviarComprovativoBF(ilegivel, (async () => { throw new Error("Não deve enviar um ficheiro ilegível"); }) as typeof fetch), /volta a selecioná-lo/);
console.log("OK: comprovativo lido antes do envio, recuperação após falhas de ligação, repetição limitada, conflitos, regras e hora original preservados.");
