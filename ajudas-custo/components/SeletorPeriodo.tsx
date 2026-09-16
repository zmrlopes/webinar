"use client";

import { NOMES_MESES } from "@/lib/calculos";

interface Props {
  ano: number;
  mes: number;
  onMudar: (ano: number, mes: number) => void;
}

export default function SeletorPeriodo({ ano, mes, onMudar }: Props) {
  return (
    <section className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col text-sm font-medium text-gray-700">
        Mês
        <select
          value={mes}
          onChange={(evento) => onMudar(ano, Number(evento.target.value))}
          className="mt-1 rounded border border-gray-300 px-3 py-1.5"
        >
          {NOMES_MESES.map((nome, indice) => (
            <option key={nome} value={indice + 1}>
              {nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm font-medium text-gray-700">
        Ano
        <input
          type="number"
          value={ano}
          onChange={(evento) => onMudar(Number(evento.target.value), mes)}
          className="mt-1 w-24 rounded border border-gray-300 px-3 py-1.5"
        />
      </label>
    </section>
  );
}
