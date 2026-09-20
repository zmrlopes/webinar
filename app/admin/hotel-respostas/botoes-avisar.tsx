"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Resultado {
  enviados: number;
  falhas: { email: string; erro: string }[];
}

const ESTILO_BOTAO: React.CSSProperties = {
  padding: "0.5rem 1.1rem",
  fontSize: "0.85rem",
  fontWeight: 700,
  border: "none",
  borderRadius: "0.3rem",
  cursor: "pointer",
};

export function BotoesAvisar({
  porResponder,
  publicado,
  emailDemonstracao,
}: {
  porResponder: number;
  publicado: boolean;
  emailDemonstracao: string;
}) {
  const router = useRouter();
  const [aEnviar, setAEnviar] = useState<"teste" | "todos" | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(teste: boolean): Promise<void> {
    if (
      !window.confirm(
        teste
          ? `Enviar o email de teste para ${emailDemonstracao}?`
          : `Enviar o aviso a ${porResponder} inscrito(s) que ainda não responderam?`,
      )
    ) {
      return;
    }
    setAEnviar(teste ? "teste" : "todos");
    setErro(null);
    setResultado(null);
    try {
      const resposta = await fetch("/api/admin/hotel-notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teste }),
      });
      const dados = (await resposta.json()) as Resultado & { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        return;
      }
      setResultado(dados);
      router.refresh();
    } catch {
      setErro("Falha de rede — tenta outra vez.");
    } finally {
      setAEnviar(null);
    }
  }

  return (
    <div style={{ margin: "0 0 1.5rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={aEnviar !== null}
        onClick={() => enviar(true)}
        style={{ ...ESTILO_BOTAO, background: "#4b5320", color: "#ffffff" }}
      >
        {aEnviar === "teste" ? "A enviar…" : `Enviar teste para ${emailDemonstracao}`}
      </button>

      <button
        type="button"
        disabled={aEnviar !== null || !publicado || porResponder === 0}
        onClick={() => enviar(false)}
        title={
          publicado
            ? undefined
            : "O questionário ainda só está no painel de demonstração — publica-o primeiro."
        }
        style={{
          ...ESTILO_BOTAO,
          background: "transparent",
          color: "#4b5320",
          border: "1px solid #4b5320",
          opacity: !publicado || porResponder === 0 ? 0.5 : 1,
          cursor: !publicado || porResponder === 0 ? "default" : "pointer",
        }}
      >
        {aEnviar === "todos" ? "A enviar…" : `Avisar quem falta responder (${porResponder})`}
      </button>

      <div style={{ flexBasis: "100%" }}>
        {!publicado && (
          <p className="ad-legenda" style={{ margin: "0.5rem 0 0" }}>
            O aviso a todos está travado enquanto o questionário só aparecer no painel de demonstração —
            assim não sai o texto de teste para os inscritos por engano.
          </p>
        )}
        {resultado && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            Enviado(s): <strong>{resultado.enviados}</strong>
            {resultado.falhas.length > 0 && (
              <>
                {" "}
                · Falhou(aram):{" "}
                {resultado.falhas.map((f) => `${f.email} (${f.erro})`).join("; ")}
              </>
            )}
          </p>
        )}
        {erro && <p style={{ margin: "0.5rem 0 0", color: "#c0392b", fontSize: "0.9rem" }}>{erro}</p>}
      </div>
    </div>
  );
}
