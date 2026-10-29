import assert from "node:assert/strict";
import { construirCoreGrupo } from "../src/lib/core-rank-grupo";
import type { MembroCoreDiretos } from "../src/lib/core-rank-diretos";

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
assert.throws(() => construirCoreGrupo(membros, dados.grupo!, "2026-10-29", "2026-10-01", "teste"));
assert.throws(() => construirCoreGrupo(membros, { ...dados.grupo!, membros: [{ nome: "Conta confirmada", username: "ausente" }] }, "2026-10-01", "2026-10-29", "parcial.xlsx"), "Uma exportação parcial não pode apagar as correspondências confirmadas");
console.log("Core Rank do grupo: todos os níveis, identidades, duplicados e participantes por identificar verificados.");
