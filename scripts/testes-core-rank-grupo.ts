import assert from "node:assert/strict";
import { associarMembroCoreEmail, construirCoreGrupo } from "../src/lib/core-rank-grupo";
import type { MembroCoreDiretos } from "../src/lib/core-rank-diretos";
import { identificarContaCoreBruto, prepararAtualizacaoCoreGrupo, recuperarArvoreCoreGrupo } from "../src/lib/core-rank-grupo-atualizar";

const m = (username: string, upline = "", entrada = "2020-01-01"): MembroCoreDiretos => ({ username, upline, entrada, nome: username, email: `${username}@example.com`, estado: "Ativo", reservas: 0, subscricoes: 0 });
const membros = [m("raiz"), m("direto", "raiz"), m("neto", "direto"), m("recruta", "neto", "2026-10-01"), m("outro", "raiz")];
const dados = construirCoreGrupo(membros, { nome: "Grupo de teste", consultadoEm: "2026-10-29T12:00:00Z", membros: [
  { nome: "Contacto um", username: "neto" }, { nome: "Outro telefone do mesmo TP", username: "NETO" },
  { nome: "Ainda desconhecido", username: null }, { nome: "Outro membro por identificar", username: null },
] }, "2026-10-01", "2026-10-29", "teste.xlsx");
assert.equal(dados.grupo!.membros.length, 4, "Preservar todos os contactos do grupo");
assert.equal(dados.consultores.length, 1, "Não duplicar contas com dois contactos");
assert.equal(dados.consultores[0]!.username, "neto", "Incluir membros de qualquer nível, mesmo sem serem diretos das contas agregadas");
assert.equal(dados.consultores[0]!.nomesWhatsapp!.length, 2);
assert.equal(dados.consultores[0]!.novos[0]!.username, "recruta", "As angariações do membro contam mesmo fora do grupo");
assert.equal(dados.grupo!.membros.filter(p => !p.username).length, 2, "Sem identificação, manter pendente e não criar números a zero");
assert(!dados.consultores.some(c => c.username === "outro"), "Não incluir quem não pertence ao grupo");
const associado = associarMembroCoreEmail(dados, membros, 2, "Ainda desconhecido", " OUTRO@example.com ");
assert.equal(associado.grupo!.membros[2]!.username, "outro");
assert.equal(associado.consultores.length, 2);
const duplicado = associarMembroCoreEmail(dados, membros, 2, "Ainda desconhecido", "neto@example.com");
assert.equal(duplicado.consultores.length, 1);
assert.equal(duplicado.consultores[0]!.nomesWhatsapp!.length, 3);
assert.deepEqual(associarMembroCoreEmail(associado, membros, 2, "Ainda desconhecido", "outro@example.com"), associado, "Repetir o envio não duplica o cartão");
const protegido = structuredClone(dados);
protegido.consultores[0]!.reservas = 1234;
protegido.consultores[0]!.verificacaoCore = {mes: "2026-10", reservas: 2222, subscricoes: 2, metaReservas: 3000, metaNovos: 3, consultadoEm: "2026-10-29"};
protegido.grupo!.membros.push({nome: "Conta própria omitida na recolha", username: "propria"});
const preservado = associarMembroCoreEmail(protegido, membros, 2, "Ainda desconhecido", "outro@example.com");
assert.deepEqual(preservado.consultores[0], protegido.consultores[0], "Associar não recalcula números ou verificações de quem já estava associado");
assert.deepEqual(protegido.grupo!.membros[2]!.username, null, "A fonte não é alterada antes da gravação");
assert.throws(() => associarMembroCoreEmail(dados, membros, 2, "Nome desatualizado", "outro@example.com"));
assert.throws(() => associarMembroCoreEmail(dados, membros, 2, "Ainda desconhecido", "ausente@example.com"));
assert.throws(() => associarMembroCoreEmail(dados, membros, 0, "Contacto um", "outro@example.com"));
const bruto = {
  plano: { corpo: { periodos: [{ chave: "core-rank-grupo", inicio: dados.desde, fim: dados.ate }] } },
  "equipa-core-rank-grupo:p0": { corpo: { list: { totalElements: membros.length, content: membros.map(m => ({
    user: { username: m.username, name: m.nome, email: m.email, creationDate: m.entrada },
    upline: { username: m.upline }, stats: { sales: m.username === "neto" ? 3500 : m.reservas },
  })) } } },
};
const atualizado = prepararAtualizacaoCoreGrupo(bruto, dados)!;
assert.equal(atualizado.dados.consultores[0]!.reservas, 3500);
assert.equal(atualizado.dados.consultores[0]!.novos.length, 1);
assert.equal(atualizado.dados.grupo!.membros.filter(m => !m.username).length, 2);
const pagina = bruto["equipa-core-rank-grupo:p0"].corpo.list;
const alternativas = {
  plano: {corpo: {periodos: [{chave: "mes-2026-10", inicio: dados.desde, fim: dados.ate}]}},
  "equipa:p0": {corpo: {list: {totalElements: membros.length, content: pagina.content.slice(0, 1)}}},
  "equipa-mes-2026-10:p0": {corpo: {list: {...pagina, content: pagina.content.slice(0, 2)}}},
  "equipa-mes-2026-10:p1": {corpo: {list: {...pagina, content: pagina.content.slice(2)}}},
};
const recuperada = recuperarArvoreCoreGrupo(alternativas, dados)!;
assert.equal(recuperada.length, membros.length, "Recuperar a árvore de todas as páginas do período, mesmo sem a chave específica do grupo");
assert.equal(identificarContaCoreBruto(alternativas, " OUTRO@example.com "), "outro", "A identidade nas páginas seguintes não depende da primeira página nem de ficheiros locais");
assert.equal(recuperarArvoreCoreGrupo({...alternativas, plano: {corpo: {periodos: [{chave: "mes-2026-10", inicio: "2026-09-01", fim: dados.ate}]}}}, dados), null, "Não usar valores de outro período");
assert.equal(recuperarArvoreCoreGrupo({...alternativas, "equipa-mes-2026-10:p1": {corpo: {list: {...pagina, content: []}}}}, dados), null, "Uma recolha incompleta não é tratada como completa");
assert.equal(recuperarArvoreCoreGrupo({...alternativas, "equipa-mes-2026-10:p2": alternativas["equipa-mes-2026-10:p1"]}, dados), null, "Páginas repetidas não contam duas vezes");
assert.throws(() => identificarContaCoreBruto({...alternativas, "equipa-ano-2026:p0": {corpo: {content: [{user: {username: "outra-conta", email: "outro@example.com"}}]}}}, "outro@example.com"), /única conta/, "Emails ambíguos não são associados");
assert.equal(prepararAtualizacaoCoreGrupo({ plano: bruto.plano }, dados), null);
bruto["equipa-core-rank-grupo:p0"].corpo.list.totalElements++;
assert.equal(prepararAtualizacaoCoreGrupo(bruto, dados), null);
assert.throws(() => construirCoreGrupo(membros, dados.grupo!, "2026-10-29", "2026-10-01", "teste"));
assert.throws(() => construirCoreGrupo(membros, { ...dados.grupo!, membros: [{ nome: "Conta confirmada", username: "ausente" }] }, "2026-10-01", "2026-10-29", "parcial.xlsx"), "Uma exportação parcial não pode apagar as correspondências confirmadas");
console.log("Core Rank do grupo: todos os níveis, identidades, duplicados e participantes por identificar verificados.");
