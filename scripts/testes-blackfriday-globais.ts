import assert from "node:assert/strict";
import {resumirVendasGlobaisBF, type PaginaVendasGlobalBF} from "../src/lib/blackfriday-globais";
const linha = (id: string, salesVolume: number, bookingsCount = salesVolume > 0 ? 1 : 0) => ({userId: id, salesVolume, bookingsCount, currency: "EUR"});
const paginas: PaginaVendasGlobalBF[] = [
  {page: 0, size: 2, totalElements: 3, totalPages: 2, items: [linha("a", 100.01), linha("b", 0)]},
  {page: 1, size: 2, totalElements: 3, totalPages: 2, items: [linha("c", 50)]},
];
assert.deepEqual(resumirVendasGlobaisBF(paginas), {totalVendas: 150.01, vendasConsultoresComVendas: 150.01, consultoresComVendas: 2, mediaPorConsultor: 75.01, contasLidas: 3, paginasLidas: 2});
assert.throws(() => resumirVendasGlobaisBF(paginas.slice(0, 1)), /incompleta/);
assert.throws(() => resumirVendasGlobaisBF([...paginas].reverse()), /incompleta/);
assert.throws(() => resumirVendasGlobaisBF([paginas[0]!, {...paginas[1]!, totalElements: 4}]), /incompleta/);
assert.throws(() => resumirVendasGlobaisBF([paginas[0]!, {...paginas[1]!, items: [linha("A", 10)]}]), /incompleta/);
for (const invalida of [{...linha("c", 50), currency: "USD"}, linha("c", NaN), linha("c", 50, 0), {...linha("c", 50), bookingsCount: undefined}]) {
  assert.throws(() => resumirVendasGlobaisBF([paginas[0]!, {...paginas[1]!, items: [invalida as ReturnType<typeof linha>]}]), /incompleta/);
}
const zeros = resumirVendasGlobaisBF([{page: 0, size: 100, totalElements: 1, totalPages: 1, items: [linha("z", 0)]}]);
assert.equal(zeros.mediaPorConsultor, null);
assert.equal(zeros.consultoresComVendas, 0);
assert.equal(resumirVendasGlobaisBF([{page: 0, size: 100, totalElements: 0, totalPages: 0, items: []}]).totalVendas, 0);
const ajustes = resumirVendasGlobaisBF([{page: 0, size: 100, totalElements: 2, totalPages: 1, items: [linha("a", 100), linha("b", -10)]}]);
assert.equal(ajustes.totalVendas, 90);
assert.equal(ajustes.mediaPorConsultor, 100, "A média usa apenas os consultores com reservas e faturação positiva.");
console.log("OK: métricas globais, apenas vendedores na média, euros exatos e rejeição de listas incompletas, repetidas ou inconsistentes.");
