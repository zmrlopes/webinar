import { describe, expect, it } from "vitest";
import { dadosEmpresaOmissao } from "@/config/empresa";
import {
  diasNoMes,
  ehFimDeSemana,
  gerarLinhasMes,
  linhaEhCinzenta,
  totalDias,
  totalValor,
  ultimoDiaUtil,
  type LinhaMapa,
} from "./calculos";
import { feriadosLocais } from "./feriados";

describe("diasNoMes", () => {
  it("fevereiro de 2026 tem 28 dias", () => {
    expect(diasNoMes(2026, 2)).toBe(28);
  });

  it("maio de 2026 tem 31 dias", () => {
    expect(diasNoMes(2026, 5)).toBe(31);
  });
});

describe("linhas cinzentas — maio de 2026", () => {
  const feriados = feriadosLocais(2026);
  const cinzentosEsperados = [1, 2, 3, 9, 10, 16, 17, 23, 24, 30, 31];

  it("marca exatamente os dias esperados como cinzentos", () => {
    const cinzentos = Array.from({ length: 31 }, (_, i) => i + 1).filter((dia) =>
      linhaEhCinzenta(2026, 5, dia, feriados),
    );
    expect(cinzentos).toEqual(cinzentosEsperados);
  });

  it("o dia 1 de maio é feriado (Dia do Trabalhador)", () => {
    expect(ehFimDeSemana(2026, 5, 1)).toBe(false);
    expect(linhaEhCinzenta(2026, 5, 1, feriados)).toBe(true);
  });
});

describe("linhas cinzentas — fevereiro e abril de 2026", () => {
  it("17 de fevereiro (Carnaval) fica cinzento", () => {
    const feriados = feriadosLocais(2026);
    expect(linhaEhCinzenta(2026, 2, 17, feriados)).toBe(true);
  });

  it("3 e 25 de abril ficam cinzentos", () => {
    const feriados = feriadosLocais(2026);
    expect(linhaEhCinzenta(2026, 4, 3, feriados)).toBe(true);
    expect(linhaEhCinzenta(2026, 4, 25, feriados)).toBe(true);
  });
});

describe("cenário de aceitação — maio de 2026", () => {
  function preencher(linhas: LinhaMapa[], dias: number[], servico: string, local: string[], tipo: LinhaMapa["tipo"]) {
    dias.forEach((dia, indice) => {
      const linha = linhas.find((l) => l.dia === dia)!;
      linha.servico = servico;
      linha.local = local[indice] ?? local[0]!;
      linha.tipo = tipo;
    });
  }

  it("dá 24 dias e 2 310,12 € no total", () => {
    const linhas = gerarLinhasMes(2026, 5);

    preencher(linhas, [1, 4, 5], "Reunião com Consultor", ["Aveiro", "Barcelos", "Silveiros"], "N-Nacional");
    preencher(linhas, [6], "Reunião com Consultor", ["Famalicão"], "E-Estrangeiro");
    preencher(linhas, [7, 8, 9, 10, 11], "Congresso", ["Madrid"], "E-Estrangeiro");
    preencher(
      linhas,
      [12, 13, 14, 15],
      "Reunião com Consultor",
      ["Porto", "Gaia", "Espinho", "São João de Ver"],
      "N-Nacional",
    );
    preencher(
      linhas,
      [18, 19, 20, 21, 22],
      "Reunião com Consultor",
      ["Aveiro", "Vagos", "Costa Nova", "Mira", "Oiã"],
      "N-Nacional",
    );
    preencher(
      linhas,
      [25, 26, 27, 28, 29],
      "Reunião com Cliente",
      ["Lisboa", "Montijo", "Almada", "Barreiro", "Pinhal Novo"],
      "N-Nacional",
    );
    preencher(linhas, [30], "Bootcamp Equipa", ["Lisboa"], "N-Nacional");

    expect(totalDias(linhas)).toBe(24);
    expect(totalValor(linhas, dadosEmpresaOmissao)).toBeCloseTo(2310.12, 2);
  });
});

describe("ultimoDiaUtil", () => {
  it("maio de 2026 termina a 31, que é fim de semana — último dia útil é 29", () => {
    const feriados = feriadosLocais(2026);
    expect(ultimoDiaUtil(2026, 5, feriados)).toBe(29);
  });
});
