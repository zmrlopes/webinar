"use client";

import { useState } from "react";

interface Resultado {
  lista: string;
  consultoresComPainel: number;
  enviados: number;
  lotes: number;
  removidos: number;
  erros: string[];
}

export function BotaoSincronizarLista() {
  const [estado, setEstado] = useState<"pronto" | "a-sincronizar" | "feito" | "erro">("pronto");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function sincronizar(): Promise<void> {
    setEstado("a-sincronizar");
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/activecampaign/sincronizar-consultores", { method: "POST" });
      const dados = (await resposta.json()) as Resultado & { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setResultado(dados);
      setEstado("feito");
    } catch {
      setErro("Falha de rede — tenta outra vez.");
      setEstado("erro");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={sincronizar}
        disabled={estado === "a-sincronizar"}
        style={{
          padding: "0.6rem 1.2rem",
          fontSize: "0.9rem",
          fontWeight: 700,
          background: "#4b5320",
          color: "#ffffff",
          border: "none",
          borderRadius: "0.4rem",
          cursor: estado === "a-sincronizar" ? "default" : "pointer",
        }}
      >
        {estado === "a-sincronizar" ? "A sincronizar…" : "Sincronizar consultores com painel"}
      </button>

      {erro && <p style={{ color: "#c0392b", fontSize: "0.9rem", marginTop: "0.75rem" }}>{erro}</p>}

      {resultado && (
        <div className="ad-cartao" style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            <strong>{resultado.enviados}</strong> de <strong>{resultado.consultoresComPainel}</strong>{" "}
            consultores com painel enviados para a lista {resultado.lista} da ActiveCampaign, em{" "}
            {resultado.lotes} {resultado.lotes === 1 ? "lote" : "lotes"}
            {resultado.removidos > 0 && (
              <>
                {" "}
                · <strong>{resultado.removidos}</strong> retirado(s) da lista por já não pertencerem
              </>
            )}
            .
          </p>
          <p className="ad-legenda">
            A ActiveCampaign processa a importação do lado dela — os contactos aparecem na lista dentro de
            alguns minutos.
          </p>
          {resultado.erros.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", color: "#c0392b", fontSize: "0.85rem" }}>
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
