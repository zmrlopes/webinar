"use client";

import { useState } from "react";
import type { DadosEmpresa } from "@/config/empresa";
import { linhaEhCinzenta, valorLinha, type LinhaMapa, type TipoAjuda } from "@/lib/calculos";
import { formatarMoedaTabela } from "@/lib/formatacao";
import type { Feriado } from "@/lib/feriados";

interface Props {
  ano: number;
  mes: number;
  linhas: LinhaMapa[];
  feriados: Feriado[];
  empresa: DadosEmpresa;
  onMudar: (linhas: LinhaMapa[]) => void;
}

const classeInput =
  "w-full min-w-0 border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-[#4b5320]";

export default function TabelaMapa({ ano, mes, linhas, feriados, empresa, onMudar }: Props) {
  // Lembra, só nesta sessão (não é guardado em disco nem localStorage), tudo
  // o que já foi escrito em SERVIÇO/LOCAL, para as sugestões sobreviverem à
  // troca de mês mesmo depois de a tabela ser regenerada em branco.
  const [servicosConhecidos, setServicosConhecidos] = useState<Set<string>>(new Set());
  const [locaisConhecidos, setLocaisConhecidos] = useState<Set<string>>(new Set());

  function lembrar(conjunto: Set<string>, definir: (novo: Set<string>) => void, valor: string) {
    const limpo = valor.trim();
    if (limpo && !conjunto.has(limpo)) definir(new Set(conjunto).add(limpo));
  }

  const sugestoesServico = Array.from(
    new Set([...servicosConhecidos, ...linhas.map((l) => l.servico.trim()).filter(Boolean)]),
  );
  const sugestoesLocal = Array.from(
    new Set([...locaisConhecidos, ...linhas.map((l) => l.local.trim()).filter(Boolean)]),
  );

  function atualizarLinha(indice: number, alteracoes: Partial<LinhaMapa>) {
    const linhaAtual = linhas[indice]!;
    const linhaNova = { ...linhaAtual, ...alteracoes };

    if (alteracoes.servico !== undefined) {
      const tinhaServico = linhaAtual.servico.trim() !== "";
      const temServicoAgora = alteracoes.servico.trim() !== "";
      if (!temServicoAgora) {
        // Serviço apagado: Total Dias, TIPO e VALOR ficam limpos (repõe o tipo por defeito).
        linhaNova.tipo = "N-Nacional";
      } else if (!tinhaServico && alteracoes.tipo === undefined) {
        // Serviço preenchido pela primeira vez (e sem tipo explícito nesta
        // alteração, p.ex. ao copiar a linha anterior): assume N-Nacional por defeito.
        linhaNova.tipo = "N-Nacional";
      }
    }

    const novasLinhas = linhas.slice();
    novasLinhas[indice] = linhaNova;
    onMudar(novasLinhas);
  }

  function copiarLinhaAnterior(indice: number) {
    if (indice === 0) return;
    const anterior = linhas[indice - 1]!;
    atualizarLinha(indice, { servico: anterior.servico, local: anterior.local, tipo: anterior.tipo });
    lembrar(servicosConhecidos, setServicosConhecidos, anterior.servico);
    lembrar(locaisConhecidos, setLocaisConhecidos, anterior.local);
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-300">
      <datalist id="sugestoes-servico">
        {sugestoesServico.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sugestoes-local">
        {sugestoesLocal.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <table className="w-full min-w-[1240px] border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-xs font-semibold text-gray-700">
            <th className="border border-gray-300 px-2 py-2">DIA</th>
            <th className="min-w-[200px] border border-gray-300 px-2 py-2">SERVIÇO</th>
            <th className="min-w-[140px] border border-gray-300 px-2 py-2">LOCAL</th>
            <th className="min-w-[80px] border border-gray-300 px-2 py-2">Início — dia</th>
            <th className="min-w-[80px] border border-gray-300 px-2 py-2">Início — hora</th>
            <th className="min-w-[80px] border border-gray-300 px-2 py-2">Termo — dia</th>
            <th className="min-w-[80px] border border-gray-300 px-2 py-2">Termo — hora</th>
            <th className="min-w-[70px] border border-gray-300 px-2 py-2">Total Dias</th>
            <th className="min-w-[130px] border border-gray-300 px-2 py-2">TIPO*</th>
            <th className="min-w-[90px] border border-gray-300 px-2 py-2">VALOR</th>
            <th className="border border-gray-300 px-1 py-2" title="Copiar linha anterior" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => {
            const cinzenta = linhaEhCinzenta(ano, mes, linha.dia, feriados);
            const feriado = feriados.find((f) => f.data === linha.data);
            const temServico = linha.servico.trim() !== "";
            const valorDia = valorLinha(linha, empresa);

            return (
              <tr key={linha.data} className={cinzenta ? "bg-[#D9D9D9]" : "bg-white"}>
                <td
                  className="border border-gray-300 px-2 py-1 text-center font-bold"
                  title={feriado ? feriado.nome : undefined}
                >
                  {linha.dia}
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    list="sugestoes-servico"
                    value={linha.servico}
                    onChange={(e) => atualizarLinha(indice, { servico: e.target.value })}
                    onBlur={(e) => lembrar(servicosConhecidos, setServicosConhecidos, e.target.value)}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    list="sugestoes-local"
                    value={linha.local}
                    onChange={(e) => atualizarLinha(indice, { local: e.target.value })}
                    onBlur={(e) => lembrar(locaisConhecidos, setLocaisConhecidos, e.target.value)}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    value={linha.inicioDia}
                    onChange={(e) => atualizarLinha(indice, { inicioDia: e.target.value })}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    value={linha.inicioHora}
                    onChange={(e) => atualizarLinha(indice, { inicioHora: e.target.value })}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    value={linha.termoDia}
                    onChange={(e) => atualizarLinha(indice, { termoDia: e.target.value })}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    value={linha.termoHora}
                    onChange={(e) => atualizarLinha(indice, { termoHora: e.target.value })}
                    className={classeInput}
                  />
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{temServico ? 1 : ""}</td>
                <td className="border border-gray-300 p-0">
                  <select
                    disabled={!temServico}
                    value={linha.tipo}
                    onChange={(e) => atualizarLinha(indice, { tipo: e.target.value as TipoAjuda })}
                    className={`${classeInput} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <option value="N-Nacional">N-Nacional</option>
                    <option value="E-Estrangeiro">E-Estrangeiro</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {temServico ? formatarMoedaTabela(valorDia) : ""}
                </td>
                <td className="border border-gray-300 px-1 text-center">
                  <button
                    type="button"
                    onClick={() => copiarLinhaAnterior(indice)}
                    disabled={indice === 0}
                    title="Copiar serviço, local e tipo da linha anterior"
                    className="text-gray-500 hover:text-[#4b5320] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
