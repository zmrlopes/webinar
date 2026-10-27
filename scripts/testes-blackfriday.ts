import assert from "node:assert/strict";
import {CASAS_BF, CONFIG_BF, hojeBF, periodoBF, referenciaBF, resumirBF, validarReservaBF, type InscricaoBF} from "../src/lib/blackfriday";
import {criarReservaSimuladaBF} from "../src/lib/blackfriday-simulacao";

const config = {...CONFIG_BF};
const reserva = {casa: "0", referencia: "AB-123", valor: "2500.50", dataReserva: "2026-11-13", curinga: false};
assert.equal(CASAS_BF.length, 25);
assert.equal(hojeBF(new Date("2026-11-12T23:59:59Z")), "2026-11-12");
assert.throws(() => validarReservaBF(reserva, config, "2026-11-12"), /início e o fim/);
assert.equal(validarReservaBF(reserva, config, "2026-11-13").valorCentimos, 250050);
assert.equal(validarReservaBF({...reserva, valor: "5000", curinga: "true"}, config, "2026-12-13").curinga, true);
assert.throws(() => validarReservaBF(reserva, config, "2026-12-14"), /início e o fim/);
assert.throws(() => validarReservaBF({...reserva, dataReserva: "2026-11-12"}, config, "2026-11-13"), /data da reserva/);
assert.throws(() => validarReservaBF({...reserva, dataReserva: "2026-11-14"}, config, "2026-11-13"), /data da reserva/);
assert.throws(() => validarReservaBF({...reserva, curinga: true, valor: "4999.99"}, config, "2026-11-13"), /5.000/);
assert.throws(() => validarReservaBF({...reserva, casa: "12", valor: "5000"}, config, "2026-11-13"), /casa disponível/);
assert.throws(() => validarReservaBF({...reserva, casa: "12", valor: "4999"}, {...config, centro: "reserva5k"}, "2026-11-13"), /5.000/);
assert.equal(validarReservaBF({...reserva, casa: "12", valor: "5000"}, {...config, centro: "reserva5k"}, "2026-11-13").curinga, true);
assert.equal(referenciaBF(" ab-12.3 _ "), "AB123");
const claim = (casa: number, estado: InscricaoBF["estado"] = "pendente"): InscricaoBF => ({
  id: String(casa), casa, estado, email: "tp@example.com", nome: "TP", referencia: String(casa), valorCentimos: 10000,
  dataReserva: "2026-11-13", curinga: false, enviadoEm: `2026-11-13T12:${String(casa).padStart(2, "0")}:00Z`,
  ficheiroNome: "reserva.png", ficheiroTipo: "image/png", hash: String(casa), revisoes: [],
});
assert.equal(resumirBF([], config).casas, 1);
assert.deepEqual(resumirBF([0, 5, 10, 15, 20].map(c => claim(c)), config).linhas, []);
assert.deepEqual(resumirBF([0, 6, 18, 24].map(c => claim(c)), config).linhas, []);
assert.deepEqual(resumirBF([0, 1, 2, 3, 4].map(c => claim(c)), config).linhas, [0]);
assert.deepEqual(resumirBF([0, 1, 2, 3, 4].map(c => claim(c)), config, true).linhas, []);
const completo = CASAS_BF.flatMap((_, c) => c === 12 ? [] : [claim(c)]);
assert.equal(resumirBF(completo, config).bingo, true);
assert.equal(resumirBF(completo, config, true).bingo, false);
assert.equal(resumirBF(completo.map(i => ({...i, estado: "aprovada" as const, revistoEm: "2026-12-13T23:00:00Z"})), config, true).bingoEm, "2026-11-13T12:24:00Z");
assert.equal(resumirBF(completo.map(i => i.casa === 24 ? {...i, estado: "recusada" as const} : i), config).bingo, false);
assert.equal(resumirBF(completo, {...config, centro: "reserva5k"}).bingo, false);
assert.deepEqual(periodoBF(config, "2026-11-20"), {inicio: "2026-11-13", fim: "2026-11-20"});
assert.deepEqual(periodoBF(config, "2026-12-14"), {inicio: "2026-11-13", fim: "2026-12-13"});
assert.deepEqual(periodoBF({...config, periodoFaturacao: "anual"}, "2026-11-20"), {inicio: "2026-01-01", fim: "2026-11-20"});
console.log("OK: datas de Lisboa, início/fim inclusivos, avião configurável, curinga de reserva única ≥5K, referências normalizadas, linhas só horizontais, progresso pendente, recusa, bingo e ordem pelo envio.");

const ficheiroSim = {nome: "reserva.png", tipo: "image/png", tamanho: 1024, hash: "hash-do-print"};
const identidadeSim = {id: "simulacao", email: "teste@example.com", enviadoEm: "2026-10-27T12:00:00Z"};
const anterioresSim: InscricaoBF[] = [];
const envioSim = criarReservaSimuladaBF(reserva, config, config.inicio, anterioresSim, ficheiroSim, identidadeSim);
assert.equal(anterioresSim.length, 0, "A simulação não altera os registos existentes.");
assert.equal(envioSim.estado, "pendente");
assert.equal(resumirBF([envioSim], config).casas, 2);
assert.throws(() => criarReservaSimuladaBF({...reserva, casa: 1, referencia: "OUTRA"}, config, config.inicio, [envioSim], ficheiroSim, identidadeSim), /só pode ser usada/);
assert.throws(() => criarReservaSimuladaBF(reserva, config, config.inicio, [], {...ficheiroSim, tamanho: 4 * 1024 * 1024}, identidadeSim), /3 MB/);
assert.throws(() => criarReservaSimuladaBF(reserva, config, config.inicio, [], {...ficheiroSim, tipo: "text/html"}, identidadeSim), /PNG/);
assert.equal(criarReservaSimuladaBF(reserva, config, config.inicio, [], {...ficheiroSim, tipo: "application/pdf"}, identidadeSim).ficheiroTipo, "application/pdf");
assert.equal(resumirBF([{...envioSim, estado: "recusada"}], config).casas, 1);
assert.equal(resumirBF([{...envioSim, estado: "aprovada"}], config, true).casas, 2);
console.log("OK: simulação isolada, ficheiros PNG/PDF, limite de tamanho, duplicação, progresso pendente, aprovação e recusa sem alterar registos reais.");

if (process.argv.includes("--db")) {
  const {loadEnvConfig} = await import("@next/env");
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) {
    // A instalação local deste projeto mantém a configuração partilhada
    // na pasta acima; o Bloco de Notas pode tê-la gravado como UTF-16.
    const {readFileSync} = await import("node:fs");
    const {resolve} = await import("node:path");
    try {
      const bytes = readFileSync(resolve(process.cwd(), "../.env"));
      const texto = bytes.toString(bytes[0] === 255 && bytes[1] === 254 ? "utf16le" : "utf8").replace(/^\uFEFF/, "");
      const valor = texto.match(/^DATABASE_URL\s*=\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (valor) process.env.DATABASE_URL = valor;
    } catch { /* A asserção abaixo explica a configuração em falta. */ }
  }
  const {Pool} = await import("pg");
  const {randomUUID} = await import("node:crypto");
  const sharp = (await import("sharp")).default;
  const original = process.env.DATABASE_URL;
  assert(original, "Falta DATABASE_URL para os testes de integração.");
  const schema = "bf_test_" + randomUUID().replaceAll("-", "");
  const raiz = new Pool({connectionString: original, connectionTimeoutMillis: 15000});
  try {
    await raiz.query(`create schema ${schema}`);
    await raiz.query(`create table ${schema}.dashboard_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz not null default now())`);
    const url = new URL(original);
    // O pooler Neon não aceita search_path no arranque; a ligação direta
    // permite isolar todos os clientes deste teste no schema temporário.
    url.hostname = url.hostname.replace("-pooler.", ".");
    url.searchParams.set("options", `-c search_path=${schema}`); process.env.DATABASE_URL = url.toString();
    const {db, fecharDb} = await import("../src/lib/db");
    const api = await import("../src/lib/blackfriday-servidor");
    try {
      const hoje = hojeBF();
      assert(hoje.startsWith("2026-"), "Atualiza as datas dos testes de integração para o ano da campanha.");
      await api.guardarConfigBF({...CONFIG_BF, inicio: hoje, fim: "2026-12-31"});
      const imagem = (cor: string) => sharp({create: {width: 20, height: 20, channels: 3, background: cor}}).png().toBuffer();
      const ficheiro = async (cor: string) => new File([new Uint8Array(await imagem(cor))], "reserva.png", {type: "image/png"});
      const corpo = {...reserva, dataReserva: hoje, valor: "5000", curinga: true};
      const email = "tp@example.com";
      const primeira = await api.enviarReservaBF(email, "TP", corpo, await ficheiro("red"));
      assert.equal((await api.dadosBF(email)).inscricoes[0]?.estado, "pendente");
      await assert.rejects(() => api.enviarReservaBF(email, "TP", {...corpo, casa: 1}, new File([new Uint8Array([1])], "falsa.png", {type: "image/png"})), /PNG/);
      await assert.rejects(async () => api.enviarReservaBF(email, "TP", {...corpo, casa: 1}, await ficheiro("blue")), /só pode ser usada/);
      await assert.rejects(async () => api.enviarReservaBF(email, "TP", {...corpo, casa: 1, referencia: "ZZ999"}, await ficheiro("red")), /só pode ser usada/);
      await assert.rejects(() => api.comprovativoBF(primeira.id, "outra@example.com"), /não encontrado/);
      const proof = await api.comprovativoBF(primeira.id, email);
      assert.equal(proof.headers.get("Content-Type"), "image/png");
      assert.equal(proof.headers.get("Cache-Control"), "private, no-store");
      await assert.rejects(() => api.reverReservaBF(primeira.id, "recusada", ""), /motivo/);
      await api.reverReservaBF(primeira.id, "aprovada", "Confirmada");
      assert.equal((await api.dadosBF(email)).inscricoes[0]?.enviadoEm, primeira.enviadoEm);
      await api.reverReservaBF(primeira.id, "recusada", "Reserva não elegível");
      assert.equal(resumirBF((await api.dadosBF(email)).inscricoes, (await api.configuracaoBF())).casas, 1);
      const segunda = await api.enviarReservaBF(email, "TP", {...corpo, casa: 1}, await ficheiro("red"));
      await assert.rejects(() => api.reverReservaBF(primeira.id, "aprovada", ""), /outra participação/);
      const concorrentes = await Promise.allSettled(["green", "yellow"].map(async cor => api.enviarReservaBF(email, "TP", {...corpo, casa: 2, referencia: "CONCORRENTE"}, await ficheiro(cor))));
      assert.equal(concorrentes.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(concorrentes.filter(r => r.status === "rejected").length, 1);
      await assert.rejects(() => api.guardarConfigBF({...CONFIG_BF, centro: "reserva5k"}), /participações/);
      await db().query("insert into dashboard_config (chave, valor) values ($1, $2::jsonb)", [api.CHAVE_FATURACAO_BF, JSON.stringify({valor: 1_500_000, atualizadoEm: new Date().toISOString(), inicio: hoje, fim: hoje, periodo: "desafio"})]);
      assert.equal((await api.dadosBF(email)).faturacao?.valor, 1_500_000);
      const c = await api.configuracaoBF();
      await api.guardarConfigBF({...c, periodoFaturacao: "anual"});
      assert.equal((await api.dadosBF(email)).faturacao, null);
      assert.equal((await api.listarReservasBF("outra@example.com")).length, 0);
      assert.equal((await api.listarReservasBF()).find(i => i.id === segunda.id)?.revisoes.length, 0);
      console.log("OK: integração numa estrutura isolada — ficheiros reais, duplicação por referência/hash, privacidade, revisão, histórico, reenvio, concorrência, bloqueio das regras e faturação sem misturar períodos.");
      await api.guardarConfigBF({...c, periodoFaturacao: "desafio"});
      await db().query("create table dashboard_bruto (chave text primary key, corpo jsonb not null, recebido_em timestamptz not null default now())");
      const {guardarBruto} = await import("../src/lib/dashboard-sincronizar");
      const {calcularDashboard} = await import("../src/lib/dashboard-calcular");
      await guardarBruto("plano", {hoje, periodos: [{chave: "blackfriday-2026", inicio: hoje, fim: hoje}]});
      await guardarBruto("equipa-blackfriday-2026:p0", {stats: {sales: 2_300_000, points: 0, subscriptions: 0}});
      await calcularDashboard(true);
      assert.equal((await api.dadosBF(email)).faturacao?.valor, 2_300_000);
      await guardarBruto("equipa-blackfriday-2026:p0", {stats: {sales: 3_000_000, points: 0, subscriptions: 0}});
      await guardarBruto("falhas", ["Equipa blackfriday-2026: pedido falhou"]);
      await calcularDashboard(true);
      assert.equal((await api.dadosBF(email)).faturacao?.valor, 2_300_000);
      await guardarBruto("falhas", []);
      await calcularDashboard(false);
      assert.equal((await api.dadosBF(email)).faturacao?.valor, 2_300_000);
      await guardarBruto("equipa-blackfriday-2026:p0", {stats: {sales: 0, points: 0, subscriptions: 0}});
      await calcularDashboard(true);
      assert.equal((await api.dadosBF(email)).faturacao?.valor, 0);
      console.log("OK: atualização real do dashboard alimenta a barra; falhas e simulações preservam o snapshot anterior; total zero é válido.");
    } finally {await fecharDb();}
  } finally {
    process.env.DATABASE_URL = original;
    // Nome gerado localmente com prefixo fixo e caracteres [a-z0-9_].
    await raiz.query(`drop schema if exists ${schema} cascade`);
    await raiz.end();
  }
}
