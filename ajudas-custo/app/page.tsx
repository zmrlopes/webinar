"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BotaoGerarPdf from "@/components/BotaoGerarPdf";
import CabecalhoEmpresa from "@/components/CabecalhoEmpresa";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import TabelaMapa from "@/components/TabelaMapa";
import { dadosEmpresaOmissao, type DadosEmpresa } from "@/config/empresa";
import {
  diasNoMes,
  formatarDataPorExtenso,
  gerarLinhasMes,
  totalDias,
  totalValor,
  ultimoDiaUtil,
  type LinhaMapa,
} from "@/lib/calculos";
import { feriadosLocais, obterFeriados, type Feriado } from "@/lib/feriados";
import { formatarMoedaTabela } from "@/lib/formatacao";

const hoje = new Date();

export default function Pagina() {
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [empresa, setEmpresa] = useState<DadosEmpresa>(dadosEmpresaOmissao);
  const [feriados, setFeriados] = useState<Feriado[]>(() => feriadosLocais(ano));
  const [linhas, setLinhas] = useState<LinhaMapa[]>(() => gerarLinhasMes(ano, mes));
  const [diaRecibo, setDiaRecibo] = useState<number>(() => ultimoDiaUtil(ano, mes, feriadosLocais(ano)));

  useEffect(() => {
    let cancelado = false;
    obterFeriados(ano).then((carregados) => {
      if (!cancelado) setFeriados(carregados);
    });
    return () => {
      cancelado = true;
    };
  }, [ano]);

  const dadosPreenchidos = useMemo(() => linhas.some((l) => l.servico.trim() !== ""), [linhas]);

  const regenerarTabela = useCallback((novoAno: number, novoMes: number) => {
    setLinhas(gerarLinhasMes(novoAno, novoMes));
    setDiaRecibo(ultimoDiaUtil(novoAno, novoMes, feriadosLocais(novoAno)));
  }, []);

  function mudarPeriodo(novoAno: number, novoMes: number) {
    if (!Number.isFinite(novoAno) || novoAno < 1900 || novoMes < 1 || novoMes > 12) return;
    if (novoAno === ano && novoMes === mes) return;

    if (dadosPreenchidos) {
      const confirmar = window.confirm(
        "Já preencheu dados neste mapa. Mudar o mês ou o ano vai apagá-los. Quer continuar?",
      );
      if (!confirmar) return;
    }

    setAno(novoAno);
    setMes(novoMes);
    regenerarTabela(novoAno, novoMes);
  }

  useEffect(() => {
    function aoTentarSair(evento: BeforeUnloadEvent) {
      if (!dadosPreenchidos) return;
      evento.preventDefault();
      evento.returnValue = "";
    }
    window.addEventListener("beforeunload", aoTentarSair);
    return () => window.removeEventListener("beforeunload", aoTentarSair);
  }, [dadosPreenchidos]);

  const dias = totalDias(linhas);
  const valor = totalValor(linhas, empresa);
  const maximoDiaRecibo = diasNoMes(ano, mes);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mapa de Ajudas de Custo</h1>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <SeletorPeriodo ano={ano} mes={mes} onMudar={mudarPeriodo} />
      </div>

      <div className="mb-6">
        <CabecalhoEmpresa empresa={empresa} onMudar={setEmpresa} />
      </div>

      <TabelaMapa ano={ano} mes={mes} linhas={linhas} feriados={feriados} empresa={empresa} onMudar={setLinhas} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded border border-gray-300 bg-white px-4 py-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Total de dias:</span> {dias} &nbsp;·&nbsp;
          <span className="font-semibold">Total:</span> {formatarMoedaTabela(valor)}
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap items-end justify-between gap-6 rounded border border-gray-300 bg-white p-4">
        <label className="flex flex-col text-sm font-medium text-gray-700">
          Data do recibo
          <span className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={maximoDiaRecibo}
              value={diaRecibo}
              onChange={(e) => {
                const valorNovo = Number(e.target.value);
                if (Number.isFinite(valorNovo)) {
                  setDiaRecibo(Math.min(Math.max(valorNovo, 1), maximoDiaRecibo));
                }
              }}
              className="w-16 rounded border border-gray-300 px-2 py-1.5"
            />
            <span className="text-gray-600">{formatarDataPorExtenso(ano, mes, diaRecibo)}</span>
          </span>
        </label>

        <BotaoGerarPdf ano={ano} mes={mes} empresa={empresa} linhas={linhas} feriados={feriados} diaRecibo={diaRecibo} />
      </footer>
    </main>
  );
}
