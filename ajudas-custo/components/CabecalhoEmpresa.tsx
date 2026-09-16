"use client";

import { useState } from "react";
import type { DadosEmpresa } from "@/config/empresa";

interface Props {
  empresa: DadosEmpresa;
  onMudar: (empresa: DadosEmpresa) => void;
}

export default function CabecalhoEmpresa({ empresa, onMudar }: Props) {
  const [aberto, setAberto] = useState(false);

  function atualizarTexto<K extends keyof DadosEmpresa>(campo: K, valor: string) {
    onMudar({ ...empresa, [campo]: valor });
  }

  function atualizarNumero<K extends keyof DadosEmpresa>(campo: K, valor: string) {
    const numero = Number(valor.replace(",", "."));
    onMudar({ ...empresa, [campo]: Number.isFinite(numero) ? numero : 0 });
  }

  return (
    <section className="rounded border border-gray-300">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className="flex w-full items-center justify-between px-4 py-2 text-left font-semibold text-gray-800"
      >
        Definições
        <span className="text-gray-400">{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-300 p-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-700">
            Empresa
            <input
              value={empresa.empresa}
              onChange={(e) => atualizarTexto("empresa", e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Morada
            <input
              value={empresa.morada}
              onChange={(e) => atualizarTexto("morada", e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Nº de Contribuinte
            <input
              value={empresa.contribuinte}
              onChange={(e) => atualizarTexto("contribuinte", e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Localidade da assinatura
            <input
              value={empresa.localidadeAssinatura}
              onChange={(e) => atualizarTexto("localidadeAssinatura", e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Valor diário Nacional (€)
            <input
              value={empresa.valorDiarioNacional}
              onChange={(e) => atualizarNumero("valorDiarioNacional", e.target.value)}
              inputMode="decimal"
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Valor diário Estrangeiro (€)
            <input
              value={empresa.valorDiarioEstrangeiro}
              onChange={(e) => atualizarNumero("valorDiarioEstrangeiro", e.target.value)}
              inputMode="decimal"
              className="mt-1 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
        </div>
      )}
    </section>
  );
}
