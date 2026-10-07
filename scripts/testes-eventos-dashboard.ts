import assert from "node:assert/strict";
import { dataEvento, multiplicadorEventos, resumirEventos, type DadosEventos, type EventoDashboard, type MembroEventos } from "../src/lib/eventos-dashboard";

const inscrito = (email: string) => ({ id: email, nome: "Consultor de teste", email, checkin: false });
const evento = (id: string, extra: Partial<EventoDashboard> = {}): EventoDashboard => ({
  id, nome: "Congresso de teste", inicio: "2025-10-01", fim: "2025-10-03", local: "",
  tipo: "Congresso", pessoas: [], clientes: 0, reservas: 0, evidenciaPessoal: null, ...extra,
});
const dados: DadosEventos = { atualizadoEm: "2026-10-06", contasProprias: ["proprio@example.test"], eventos: [
  evento("a", { pessoas: [inscrito("um@example.test"), { ...inscrito(" UM@example.test "), checkin: true }, inscrito("proprio@example.test"), inscrito("recente@example.test")] }),
  evento("b", { tipo: "Convenção", pessoas: [inscrito("um@example.test")] }),
  evento("bootcamp", { tipo: "Bootcamp", pessoas: [inscrito("dois@example.test")] }),
  evento("seminario", { tipo: "Seminário", pessoas: [inscrito("dois@example.test")] }),
  evento("takeoff", { tipo: "Take Off", pessoas: [inscrito("dois@example.test")] }),
  evento("extra", { tipo: "Complemento", pessoas: [inscrito("dois@example.test")] }),
  evento("futuro", { inicio: "2027-01-01", pessoas: [inscrito("dois@example.test")] }),
  evento("antigo", { inicio: "2020-07-10", pessoas: null }),
] };
const membro = (email: string, extra: Partial<MembroEventos> = {}): MembroEventos => ({
  email, upline_email: null, vendas: 100, estado: "ACTIVE", data_registo: "2020-01-01", ...extra,
});
const equipa = [membro("um@example.test", { vendas: 300 }), membro("dois@example.test", { vendas: 500 }),
  membro("proprio@example.test", { vendas: 999999 }), membro("recente@example.test", { data_registo: "2026-01-01", upline_email: "UM@example.test" }),
  membro("semdata@example.test", { data_registo: null }), membro("inativo@example.test", { estado: "CANCELLED", upline_email: "um@example.test" })];
const r = resumirEventos(dados, equipa, new Date("2026-10-06T12:00:00Z"));
assert.equal(r.eventos.length, 2, "Contar só congressos e convenções iniciados com lista disponível");
assert.equal(r.eventos[0]!.pessoas!.length, 2, "As listas visíveis também excluem contas próprias e duplicados");
assert(r.eventos[0]!.pessoas!.find(p => p.email.trim().toLowerCase() === "um@example.test")!.checkin, "Preservar check-in na deduplicação");
assert.equal(r.pessoas, 2, "Deduplicar pessoas e excluir contas próprias");
assert.equal(r.inscricoes, 3, "Deduplicar a inscrição por pessoa e evento");
assert.equal(r.comparaveis, 2, "Usar a mesma população com data conhecida em todos os escalões");
assert.equal(r.linhas[0]!.pessoas, 1);
assert.equal(r.linhas[0]!.faturacaoMedia, 500, "Calcular a média a partir das pessoas, sem subtrair agregados");
assert.equal(r.linhas[2]!.faturacaoMedia, 300);
assert.equal(r.linhas[2]!.diretosMedia, 2, "Incluir recrutas recentes e inativos na contagem de diretos");
assert.equal(r.grupos[0]!.pessoas, 1);
assert.equal(r.grupos[0]!.faturacaoMedia, 500);
assert.equal(r.grupos[1]!.pessoas, 1);
assert.equal(r.grupos[1]!.faturacaoMedia, 300);
assert.equal(r.grupos[1]!.diretosMedia, 2);
assert.equal(r.consultores.find(p => p.email === "um@example.test")!.eventos, 2);
assert.equal(r.consultores.find(p => p.email === "um@example.test")!.faturacao, 300);
assert.equal(r.consultores.find(p => p.email === "um@example.test")!.diretos, 2);
const ponderado = resumirEventos({
  ...dados, eventos: [...dados.eventos, evento("novos", { pessoas: [inscrito("tres@example.test"), inscrito("quatro@example.test")] })],
}, [...equipa, membro("tres@example.test", { vendas: 0 }), membro("quatro@example.test", { vendas: 0 })], new Date("2026-10-06T12:00:00Z"));
assert.equal(ponderado.grupos[1]!.faturacaoMedia, 100, "A comparação global pondera cada consultor, não a média dos escalões");
assert.equal(ponderado.grupos[1]!.diretosMedia, 2 / 3);
assert.equal(multiplicadorEventos(r.grupos[0]!, r.grupos[1]!, "faturacaoMedia"), 0.6, "Mostrar também quando quem vai fatura menos");
assert.equal(multiplicadorEventos(r.grupos[1]!, { ...r.grupos[1]!, faturacaoMedia: 900 }, "faturacaoMedia"), 3, "Triplo da média é 3×, equivalente a +200%");
assert.equal(multiplicadorEventos(r.grupos[1]!, r.grupos[1]!, "faturacaoMedia"), 1);
assert.equal(multiplicadorEventos(r.grupos[1]!, { ...r.grupos[1]!, faturacaoMedia: 0 }, "faturacaoMedia"), 0);
assert.equal(multiplicadorEventos(r.grupos[0]!, r.grupos[1]!, "diretosMedia"), null, "Não dividir pela média zero de TPs");
assert.equal(multiplicadorEventos({ ...r.grupos[0]!, diretosMedia: 0.5 }, r.grupos[1]!, "diretosMedia"), 4);
assert.equal(multiplicadorEventos({ ...r.grupos[0]!, pessoas: 0 }, r.grupos[1]!, "faturacaoMedia"), null);
assert.equal(multiplicadorEventos(r.grupos[0]!, { ...r.grupos[1]!, pessoas: 0 }, "faturacaoMedia"), null);
assert.equal(multiplicadorEventos({ ...r.grupos[0]!, faturacaoMedia: 0 }, { ...r.grupos[1]!, faturacaoMedia: 0 }, "faturacaoMedia"), null);
const vazio = resumirEventos({ ...dados, eventos: [] }, [], new Date("2026-10-06T12:00:00Z"));
assert.equal(vazio.comparaveis, 0);
assert(vazio.grupos.every(g => g.pessoas === 0 && g.faturacaoMedia === 0 && g.diretosMedia === 0));
assert.equal(dataEvento({ inicio: "2020-07-10T23:00:00", fim: "2020-07-12T00:00:00" }), "10/07/2020 – 12/07/2020");
console.log("Eventos: deduplicação, âmbito, população comparável, médias e datas verificados.");
