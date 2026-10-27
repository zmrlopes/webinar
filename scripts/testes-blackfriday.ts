import assert from "node:assert/strict";
import {CASAS_BF, CONFIG_BF, hojeBF, periodoBF, referenciaBF, resumirBF, validarReservaBF, type InscricaoBF} from "../src/lib/blackfriday";
import {dataSimulacaoBF} from "../src/lib/blackfriday-simulacao";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {detetarNovasLinhasBF} from "../src/lib/blackfriday-celebracao";

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
console.log("OK: datas de Lisboa, início/fim inclusivos, avião configurável, joker de reserva única ≥5K, referências normalizadas, linhas só horizontais, progresso pendente, recusa, bingo e ordem pelo envio.");

assert.equal(dataSimulacaoBF(config, "2026-10-27"), config.inicio);
assert.equal(dataSimulacaoBF(config, "2026-11-20"), "2026-11-20");
assert.equal(dataSimulacaoBF(config, "2026-12-20"), config.fim);

const carregamentoLinhas = detetarNovasLinhasBF(null, "real", [0]);
assert.deepEqual(carregamentoLinhas.novas, [], "Não festeja linhas que já existiam ao entrar.");
const novaLinha = detetarNovasLinhasBF(carregamentoLinhas.memoria, "real", [0, 2]);
assert.deepEqual(novaLinha.novas, [2]);
assert.deepEqual(detetarNovasLinhasBF(novaLinha.memoria, "real", [0, 2]).novas, [], "Atualizar ou aprovar a mesma linha não repete a animação.");
const linhaRecusada = detetarNovasLinhasBF(novaLinha.memoria, "real", [0]);
assert.deepEqual(detetarNovasLinhasBF(linhaRecusada.memoria, "real", [0, 2]).novas, [], "Reenviar a mesma linha não repete a conquista nesta visita.");
const inicioSimulacao = detetarNovasLinhasBF(novaLinha.memoria, "simulacao", []);
assert.deepEqual(detetarNovasLinhasBF(inicioSimulacao.memoria, "simulacao", [0]).novas, [0]);
assert.deepEqual(detetarNovasLinhasBF(inicioSimulacao.memoria, "real", [0, 2]).novas, [], "Sair da simulação recupera a base real sem festejos falsos.");
console.log("OK: animação só para novas linhas, sem repetir na leitura inicial, aprovação, atualização ou passagem entre cartões real e simulado.");

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
      await db().query("create table equipa_afiliados (email text primary key, nome text not null)");
      await db().query("insert into equipa_afiliados (email,nome) values ($1,'Conta de teste')", [EMAIL_PAINEL_DEMONSTRACAO]);
      const consultor = await import("../app/api/consultor/nova-area/blackfriday/route");
      const admin = await import("../app/api/admin/blackfriday/route");
      const provaAdmin = await import("../app/api/admin/blackfriday/comprovativo/[id]/route");
      const json = (url: string, corpo: unknown) => new Request("http://localhost" + url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo)});
      const consultaSim = () => consultor.POST(json("/api/consultor/nova-area/blackfriday", {email: EMAIL_PAINEL_DEMONSTRACAO, acao: "consultar", simulacao: true}));
      const imagemSim = await sharp({create: {width: 20, height: 20, channels: 3, background: "red"}}).png().toBuffer();
      const enviarSim = (simulacao = "true") => {
        const form = new FormData();
        for (const [k,v] of Object.entries({email: EMAIL_PAINEL_DEMONSTRACAO, acao: "enviar", simulacao, casa: "0", referencia: "TESTE-ADMIN-001", valor: "5000", dataReserva: dataSimulacaoBF(CONFIG_BF, hoje), curinga: "true"})) form.set(k, v);
        form.set("ficheiro", new File([new Uint8Array(imagemSim)], "print-teste.png", {type: "image/png"}));
        return consultor.POST(new Request("http://localhost/api/consultor/nova-area/blackfriday", {method: "POST", body: form}));
      };
      assert.equal((await consultor.POST(json("/api/consultor/nova-area/blackfriday", {email: "outra@example.com", acao: "consultar", simulacao: true}))).status, 403);
      assert.equal((await consultor.POST(json("/api/consultor/nova-area/blackfriday", {email: EMAIL_PAINEL_DEMONSTRACAO, acao: "consultar", simulacao: "qualquer"}))).status, 400);
      const envioSim = await enviarSim(); assert.equal(envioSim.status, 200);
      const corpoSim = await envioSim.json();
      const registoSim = corpoSim.inscricoes[0] as InscricaoBF;
      assert.equal(corpoSim.simulacao, true); assert.equal(registoSim.simulacao, true); assert.equal(registoSim.estado, "pendente");
      assert.equal((await api.listarReservasBF()).length, 0);
      assert.equal((await admin.GET(new Request("http://localhost/api/admin/blackfriday?modo=simulacao"))).status, 200);
      const listadoSim = await (await admin.GET(new Request("http://localhost/api/admin/blackfriday?modo=simulacao"))).json();
      assert.equal(listadoSim.inscricoes[0].id, registoSim.id);
      assert.equal((await enviarSim()).status, 409, "A simulação também impede usar duas vezes a mesma casa/reserva.");
      const contextoProva = {params: Promise.resolve({id: registoSim.id})};
      const ficheiroAdmin = await provaAdmin.GET(new Request("http://localhost/api/admin/blackfriday/comprovativo/" + registoSim.id + "?modo=simulacao"), contextoProva);
      assert.equal(ficheiroAdmin.status, 200); assert.equal(ficheiroAdmin.headers.get("Content-Type"), "image/png");
      assert.deepEqual(Buffer.from(await ficheiroAdmin.arrayBuffer()), imagemSim);
      assert.equal((await provaAdmin.GET(new Request("http://localhost/api/admin/blackfriday/comprovativo/" + registoSim.id), contextoProva)).status, 404);
      assert.equal((await consultor.POST(json("/api/consultor/nova-area/blackfriday", {email: EMAIL_PAINEL_DEMONSTRACAO, acao: "comprovativo", id: registoSim.id, simulacao: false}))).status, 404);
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "rever", id: registoSim.id, estado: "aprovada", motivo: "", simulacao: false}))).status, 404);
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "rever", id: registoSim.id, estado: "aprovada", motivo: "Conferido no admin", simulacao: true}))).status, 200);
      const aprovadoSim = await (await consultaSim()).json();
      assert.equal(aprovadoSim.inscricoes[0].estado, "aprovada"); assert.equal(aprovadoSim.inscricoes[0].enviadoEm, registoSim.enviadoEm);
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "rever", id: registoSim.id, estado: "recusada", motivo: "", simulacao: true}))).status, 400);
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "rever", id: registoSim.id, estado: "recusada", motivo: "Falta referência visível", simulacao: true}))).status, 200);
      const recusadoSim = await (await consultaSim()).json();
      assert.equal(recusadoSim.inscricoes[0].motivo, "Falta referência visível"); assert.equal(resumirBF(recusadoSim.inscricoes, CONFIG_BF).casas, 1);
      assert.equal((await enviarSim()).status, 200, "Pode reenviar depois de uma recusa.");
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "configurar", config: {...CONFIG_BF, centro: "reserva5k"}, simulacao: true}))).status, 400);
      assert.deepEqual(await api.configuracaoBF(), CONFIG_BF);
      assert.equal((await consultor.POST(json("/api/consultor/nova-area/blackfriday", {email: EMAIL_PAINEL_DEMONSTRACAO, acao: "limpar-simulacao", simulacao: false}))).status, 400);
      if (hoje < CONFIG_BF.inicio || hoje > CONFIG_BF.fim) assert.equal((await enviarSim("false")).status, 400, "As datas reais não são contornadas pela simulação.");
      assert.equal((await admin.POST(json("/api/admin/blackfriday", {acao: "limpar-simulacao", simulacao: true}))).status, 200);
      assert.equal((await api.listarReservasBF(undefined, true)).length, 0);
      await assert.rejects(() => api.comprovativoBF(registoSim.id, EMAIL_PAINEL_DEMONSTRACAO, true), /não encontrado/);
      await assert.rejects(() => api.dadosBF("outra@example.com", true), /apenas na conta de teste/);
      console.log("OK: percurso pelas APIs — envio multipart, admin abre o ficheiro, aprova/recusa, TP recebe o estado e motivo, reenvio e limpeza exclusiva dos testes; modos e datas reais protegidos.");
      await api.guardarConfigBF({...CONFIG_BF, inicio: hoje, fim: "2026-12-31"});
      const imagem = (cor: string) => sharp({create: {width: 20, height: 20, channels: 3, background: cor}}).png().toBuffer();
      const ficheiro = async (cor: string) => new File([new Uint8Array(await imagem(cor))], "reserva.png", {type: "image/png"});
      const corpo = {...reserva, dataReserva: hoje, valor: "5000", curinga: true};
      const email = "tp@example.com";
      const primeira = await api.enviarReservaBF(email, "TP", corpo, await ficheiro("red"));
      const reaisAntes = await api.listarReservasBF();
      const configAntes = await api.configuracaoBF();
      await api.enviarReservaBF(EMAIL_PAINEL_DEMONSTRACAO, "Teste", corpo, await ficheiro("red"), true);
      assert.equal((await api.listarReservasBF()).length, reaisAntes.length);
      await assert.rejects(() => api.reverReservaBF(primeira.id, "aprovada", "", true), /não encontrada/);
      await api.limparSimulacaoBF();
      assert.deepEqual(await api.listarReservasBF(), reaisAntes);
      assert.deepEqual(await api.configuracaoBF(), configAntes);
      assert.equal((await api.comprovativoBF(primeira.id, email)).status, 200);
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
