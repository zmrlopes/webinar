"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { MapaPDFDocumento, type DadosMapaPDF } from "@/components/MapaPDF";

export default function BotaoGerarPdf({ ano, mes, empresa, linhas, feriados, diaRecibo }: DadosMapaPDF) {
  const [aGerar, setAGerar] = useState(false);

  async function gerarPdf() {
    setAGerar(true);
    try {
      const blob = await pdf(
        <MapaPDFDocumento ano={ano} mes={mes} empresa={empresa} linhas={linhas} feriados={feriados} diaRecibo={diaRecibo} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const nomeFicheiro = `Mapa_AjudasDeCusto_${String(mes).padStart(2, "0")}_${ano}.pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeFicheiro;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setAGerar(false);
    }
  }

  return (
    <button
      type="button"
      onClick={gerarPdf}
      disabled={aGerar}
      className="rounded bg-[#4b5320] px-5 py-2 font-semibold text-white hover:bg-[#3a4119] disabled:opacity-60"
    >
      {aGerar ? "A gerar..." : "Gerar PDF"}
    </button>
  );
}
