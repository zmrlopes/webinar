import assert from "node:assert/strict";
import { analisarJornadaEquipa, type PessoaJornada } from "../src/lib/consultor-jornada-equipa";
import { db, fecharDb } from "../src/lib/db";
import { POST } from "../app/api/consultor/nova-area/jornada/route";

const data = "2026-11-17T10:00:00Z";
const pessoa = (id: string, pai: string | null, nivel = "JUNIOR", pontos: number | null = 0): PessoaJornada => ({id, pai, nome: id, nivel, pontos, estado: "ACTIVE", atualizadoEm: data});
const raiz = pessoa("raiz", null, "COORDENADOR", 1004);
const equipa = [raiz, pessoa("A", "raiz"), pessoa("A1", "A", "MASTER", 90), pessoa("A2", "A", "MASTER", 100),
  pessoa("B", "raiz", "SENIOR", 74), pessoa("C", "raiz", "SENIOR", 72), pessoa("D", "raiz", "JUNIOR", 5),
  pessoa("fora", "outra-equipa", "OURO", 99000)];
const detalhe = analisarJornadaEquipa(raiz, equipa);
assert.equal(detalhe.jornada.estrutura?.requisitos[0]?.cumpridos, 1, "Dois Masters na mesma linha só contam uma vez");
assert.equal(detalhe.jornada.estrutura?.requisitos[0]?.faltam, 2);
assert.equal(detalhe.jornada.patamarAtual, "Coordenador", "Os pontos não promovem sem cumprir a estrutura");
assert.deepEqual(detalhe.plano.map(c => c.nome), ["B", "C"]);
assert.deepEqual(detalhe.plano.map(c => c.faltamPontos), [1, 3]);
assert.equal(new Set(detalhe.plano.map(c => c.linhaId)).size, 2);
assert(!JSON.stringify(detalhe).includes("fora"), "Ignora ramos fora da própria organização");
const tres = analisarJornadaEquipa(raiz, [...equipa, pessoa("BM", "B", "MASTER", 75), pessoa("CM", "C", "DIRETOR", 1100)]);
assert.equal(tres.jornada.estrutura?.faltamLinhas, 0, "Conta patamares superiores e descendentes de cada linha");
assert.equal(tres.plano.length, 0);

const diretor = pessoa("diretor", null, "DIRETOR", 4000);
const cinco = [diretor, ...["a", "b", "c", "d"].map(id => pessoa(id, "diretor", "COORDENADOR", 300)), pessoa("e", "diretor", "MASTER", 80)];
const bronze = analisarJornadaEquipa(diretor, cinco);
assert.deepEqual(bronze.jornada.estrutura?.requisitos.map(r => [r.cumpridos, r.faltam]), [[3, 0], [2, 0]], "O Coordenador extra pode ocupar uma vaga de Master");
assert.equal(bronze.linhas.filter(l => l.contaPara).length, 5);
const quatro = analisarJornadaEquipa(diretor, cinco.slice(0, 5));
assert.equal(quatro.jornada.estrutura?.linhasCumpridas, 4);
assert.equal(quatro.jornada.estrutura?.faltamLinhas, 1);
assert.equal(quatro.linhasPorCriar, 1, "Não conta a mesma linha como Coordenador e Master");

const prata = pessoa("prata", null, "PRATA", 31000);
const ouro = analisarJornadaEquipa(prata, [prata, pessoa("dir1", "prata", "DIRETOR", 2000), pessoa("dir2", "prata", "DIRETOR", 2500),
  pessoa("coor1", "prata", "COORDENADOR", 300), pessoa("coor2", "prata", "COORDENADOR", 400), pessoa("quase-diretor", "prata", "COORDENADOR", 1100),
  pessoa("master1", "quase-diretor", "MASTER", 80), pessoa("master2", "quase-diretor", "MASTER", 90)]);
assert.equal(ouro.jornada.estrutura?.requisitos[0]?.faltam, 1);
assert.equal(ouro.plano[0]?.nome, "quase-diretor", "Reserva a linha mais próxima de Diretor");
assert.equal(ouro.plano[0]?.faltamPontos, 0);
assert.deepEqual(ouro.plano[0]?.criteriosEmFalta, [{patamar: "Master", quantidade: 1}], "Mostra a estrutura que falta ao candidato, mesmo quando os pontos já chegam");
assert.equal(ouro.jornada.estrutura?.requisitos[1]?.faltam, 0);

const semDados = analisarJornadaEquipa(raiz, [raiz, pessoa("sem-pontos", "raiz", "SENIOR", null), {...pessoa("sem-nivel", "raiz", "DESCONHECIDO", 500)}]);
assert.equal(semDados.plano.length, 0); assert.equal(semDados.semPontos, 1); assert.equal(semDados.semPatamar, 1);
assert.equal(semDados.jornada.estrutura?.faltamLinhas, 3);
const semEquipa = analisarJornadaEquipa(raiz, [raiz]); assert.equal(semEquipa.linhasPorCriar, 3);
const semPontosRaiz = pessoa("raiz", null, "COORDENADOR", null);
assert.equal(analisarJornadaEquipa(semPontosRaiz, [semPontosRaiz]).jornada.estrutura?.faltamLinhas, 3, "Pode analisar linhas quando faltam pontos da própria conta");
const rumoPrata = analisarJornadaEquipa(pessoa("bronze", null, "BRONZE", 4000), []);
assert.equal(rumoPrata.jornada.metaPontos, 12500);
assert.deepEqual(rumoPrata.jornada.estrutura?.requisitos.map(r => [r.patamar, r.necessarios, r.faltam]), [["Diretor", 2, 2], ["Coordenador", 3, 3]]);
assert.equal(rumoPrata.linhasPorCriar, 5); assert.equal(rumoPrata.plano.length, 0);
const raizBronze = pessoa("bronze", null, "BRONZE", 12500);
const equipaPrata = [raizBronze, pessoa("dir1", "bronze", "DIRECTOR", 1000), pessoa("dir2", "bronze", "DIRETOR", 1100),
  pessoa("coord1", "bronze", "COORDINATOR", 250), pessoa("coord2", "bronze", "COORDENADOR", 260), pessoa("quase-coord", "bronze", "MASTER", 240)];
const faltaCoordenador = analisarJornadaEquipa(raizBronze, equipaPrata);
assert.equal(faltaCoordenador.jornada.estrutura?.faltamLinhas, 1, "Prata exige estrutura mesmo com 12.500 pontos");
assert.deepEqual(faltaCoordenador.plano.map(c => [c.nome, c.objetivo, c.faltamPontos]), [["quase-coord", "Coordenador", 10]]);
const prataCompleta = analisarJornadaEquipa(raizBronze, [...equipaPrata, pessoa("coord3", "quase-coord", "COORDENADOR", 250)]);
assert.equal(prataCompleta.jornada.estrutura?.faltamLinhas, 0, "Os cinco canais de Prata podem qualificar em profundidade");
assert.equal(prataCompleta.linhas.filter(l => l.contaPara).length, 5);
for (const [atual, objetivo, pontos, requisitos] of [
  ["OURO", "Platina", 225000, [["BRONZE", 5], ["DIRETOR", 5], ["COORDENADOR", 5]]],
  ["PLATINUM", "Safira", 1125000, [["SILVER", 7], ["BRONZE", 7], ["DIRECTOR", 6]]],
  ["SAFIRE", "Esmeralda", 6500000, [["GOLD", 8], ["SILVER", 7], ["BRONZE", 10]]],
] as const) {
  const lider = pessoa("lider", null, atual, pontos);
  const canais = requisitos.flatMap(([nivel, quantidade]) => Array.from({length: quantidade}, (_, i) => pessoa(`${nivel}-${i}`, "lider", nivel, pontos)));
  const completa = analisarJornadaEquipa(lider, [lider, ...canais]);
  assert.equal(completa.jornada.proximoPatamar, objetivo); assert.equal(completa.jornada.metaPontos, pontos);
  assert.equal(completa.jornada.estrutura?.faltamLinhas, 0);
  assert.equal(completa.linhas.filter(l => l.contaPara).length, canais.length);
  const incompleta = analisarJornadaEquipa(lider, [lider, ...canais.slice(0, -1)]);
  assert.equal(incompleta.jornada.estrutura?.faltamLinhas, 1, `${objetivo}: não duplica canais entre requisitos`);
}
const ciclo = analisarJornadaEquipa(raiz, [...equipa, {...raiz, pai: "A1"}]);
assert.equal(ciclo.jornada.estrutura?.linhasCumpridas, 1, "Ciclos não duplicam a raiz nem qualificações");
const invertida = analisarJornadaEquipa(diretor, [...cinco].reverse());
assert.deepEqual(invertida.jornada.estrutura, bronze.jornada.estrutura, "A contagem não depende da ordem das linhas");

process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
const pool = db(), original = pool.query;
const emails = ["raiz@example.com", "outra@example.com"];
pool.query = (async (sql: string, args: unknown[] = []) => {
  const email = String(args[0]);
  if (sql.startsWith("select nome from equipa_afiliados")) return {rows: emails.includes(email) ? [{nome: email}] : []};
  if (sql.startsWith("select nivel, pontos, atualizado_em")) return {rows: emails.includes(email) ? [{nivel: "COORDENADOR", pontos: "1004", atualizado_em: data}] : []};
  if (sql.includes("with recursive jornada_equipa")) {
    assert(sql.includes("where email = $1")); assert(sql.includes("not (e.email = any(j.caminho))"));
    const membros = email === emails[0] ? equipa.filter(p => p.id !== "fora") : [pessoa("raiz", null, "COORDENADOR", 1004), pessoa("pessoa-exterior", "raiz", "MASTER", 80)];
    return {rows: membros.map(p => ({email: p.id === "raiz" ? email : `${p.id}@example.com`, upline_email: p.pai === "raiz" ? email : p.pai ? `${p.pai}@example.com` : null,
      nome: p.nome, nivel: p.nivel, pontos: p.pontos === null ? null : String(p.pontos), estado: p.estado, atualizado_em: data, profundidade: p.id === "raiz" ? 0 : 1}))};
  }
  throw Error("Consulta inesperada: " + sql);
}) as typeof pool.query;
try {
  const pedido = (email: string, detalhe = false) => new Request("http://localhost/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, detalhe, alvoEmail: "outra@example.com"})});
  const resumo = await POST(pedido(emails[0]!)); assert.equal(resumo.status, 200); assert.equal(resumo.headers.get("cache-control"), "private, no-store");
  const corpo = await resumo.json(); assert.equal(corpo.detalhe, undefined); assert.equal(corpo.jornada.estrutura.requisitos[0].faltam, 2);
  const proprio = await (await POST(pedido(emails[0]!, true))).json();
  assert(proprio.detalhe.plano.some((c: {nome: string}) => c.nome === "B"));
  assert(!JSON.stringify(proprio).includes("pessoa-exterior")); assert(!JSON.stringify(proprio).includes("@example.com"), "Não expõe emails nem o contacto das pessoas");
  const outro = await (await POST(pedido(emails[1]!, true))).json();
  assert.equal(outro.jornada.estrutura.requisitos[0].cumpridos, 1); assert(!JSON.stringify(outro).includes('"nome":"B"'));
  assert.equal((await POST(pedido("fora@example.com", true))).status, 403);
  console.log("Jornada da organização: linhas distintas, requisitos mistos, patamares superiores, candidatos, estrutura dos candidatos, dados ausentes, ciclos e privacidade verificados.");
} finally {pool.query = original; await fecharDb();}
