import assert from "node:assert/strict";
import { dataEvento, resumirEventos, type DadosEventos, type EventoDashboard, type MembroEventos } from "../src/lib/eventos-dashboard";

const inscrito = (email: string) => ({ id: email, nome: "Consultor de teste", email, checkin: false });
const evento = (id: string, extra: Partial<EventoDashboard> = {}): EventoDashboard => ({
  id, nome: "Congresso de teste", inicio: "2025-10-01", fim: "2025-10-03", local: "",
  tipo: "Congresso", pessoas: [], clientes: 0, reservas: 0, evidenciaPessoal: null, ...extra,
});
const dados: DadosEventos = { atualizadoEm: "2026-10-06", contasProprias: ["proprio@example.test"], eventos: [
  evento("a", { pessoas: [inscrito("um@example.test"), inscrito("UM@example.test"), inscrito("proprio@example.test"), inscrito("recente@example.test")] }),
  evento("b", { pessoas: [inscrito("um@example.test")] }),
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
assert.equal(r.eventos.length, 2, "Não contar extras, eventos futuros ou listas indisponíveis");
assert.equal(r.pessoas, 2, "Deduplicar pessoas e excluir contas próprias");
assert.equal(r.inscricoes, 3, "Deduplicar a inscrição por pessoa e evento");
assert.equal(r.comparaveis, 2, "Usar a mesma população com data conhecida em todos os escalões");
assert.equal(r.linhas[0]!.pessoas, 1);
assert.equal(r.linhas[0]!.faturacaoMedia, 500, "Calcular a média a partir das pessoas, sem subtrair agregados");
assert.equal(r.linhas[2]!.faturacaoMedia, 300);
assert.equal(r.linhas[2]!.diretosMedia, 2, "Incluir recrutas recentes e inativos na contagem de diretos");
assert.equal(dataEvento({ inicio: "2020-07-10T23:00:00", fim: "2020-07-12T00:00:00" }), "10/07/2020 – 12/07/2020");
console.log("Eventos: deduplicação, âmbito, população comparável, médias e datas verificados.");
