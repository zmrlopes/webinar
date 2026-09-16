import { describe, expect, it } from "vitest";
import { domingoDePascoa, feriadosLocais } from "./feriados";

describe("feriados 2026", () => {
  it("calcula a Páscoa em 5 de abril", () => {
    const pascoa = domingoDePascoa(2026);
    expect(pascoa.getMonth()).toBe(3); // abril = índice 3
    expect(pascoa.getDate()).toBe(5);
  });

  it("calcula o Carnaval em 17 de fevereiro", () => {
    const feriados = feriadosLocais(2026);
    expect(feriados.find((f) => f.nome === "Carnaval")?.data).toBe("2026-02-17");
  });

  it("calcula a Sexta-feira Santa em 3 de abril", () => {
    const feriados = feriadosLocais(2026);
    expect(feriados.find((f) => f.nome === "Sexta-feira Santa")?.data).toBe("2026-04-03");
  });

  it("calcula o Corpo de Deus em 4 de junho", () => {
    const feriados = feriadosLocais(2026);
    expect(feriados.find((f) => f.nome === "Corpo de Deus")?.data).toBe("2026-06-04");
  });

  it("inclui todos os feriados obrigatórios fixos", () => {
    const datas = feriadosLocais(2026).map((f) => f.data);
    expect(datas).toEqual(
      expect.arrayContaining([
        "2026-01-01",
        "2026-04-25",
        "2026-05-01",
        "2026-06-10",
        "2026-08-15",
        "2026-10-05",
        "2026-11-01",
        "2026-12-01",
        "2026-12-08",
        "2026-12-25",
      ]),
    );
  });

  it("devolve 14 feriados (10 fixos + Carnaval + Sexta-feira Santa + Páscoa + Corpo de Deus)", () => {
    expect(feriadosLocais(2026)).toHaveLength(14);
  });
});
