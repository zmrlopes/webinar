"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DocumentoEvento } from "@/lib/eventos";

// A Vercel rejeita o pedido inteiro acima de ~4.5MB — avisa-se já aqui.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

function formatarData(data: Date): string {
  return new Date(data).toLocaleDateString("pt-PT", { dateStyle: "medium", timeZone: "Europe/Lisbon" });
}

export function DocumentosEvento({ itens }: { itens: DocumentoEvento[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState("");
  const [aApagar, setAApagar] = useState<string | null>(null);

  async function enviar(): Promise<void> {
    const ficheiro = inputRef.current?.files?.[0];
    if (!ficheiro) {
      setErro("escolhe um ficheiro primeiro");
      return;
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setErro(`este ficheiro tem ${(ficheiro.size / 1024 / 1024).toFixed(1)}MB — o máximo é 4MB`);
      return;
    }

    setAEnviar(true);
    setErro("");
    try {
      const dados = new FormData();
      dados.set("ficheiro", ficheiro);
      const resposta = await fetch("/api/admin/eventos/documentos", { method: "POST", body: dados });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(
          corpo && typeof corpo.erro === "string"
            ? corpo.erro
            : `não foi possível gravar (o servidor respondeu ${resposta.status})`,
        );
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAEnviar(false);
    }
  }

  async function apagar(id: string): Promise<void> {
    if (!window.confirm("Apagar este documento?")) return;
    setAApagar(id);
    try {
      await fetch(`/api/admin/eventos/documentos/${id}/apagar`, { method: "POST" });
      router.refresh();
    } finally {
      setAApagar(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <input ref={inputRef} type="file" disabled={aEnviar} />
        <button
          type="button"
          disabled={aEnviar}
          onClick={enviar}
          style={{
            padding: "0.5rem 1.1rem",
            fontSize: "0.9rem",
            background: "#4b5320",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.3rem",
            cursor: aEnviar ? "default" : "pointer",
          }}
        >
          {aEnviar ? "A carregar…" : "Carregar documento"}
        </button>
      </div>
      {erro && <p style={{ color: "#c0392b", fontSize: "0.9rem", marginTop: "0.6rem" }}>{erro}</p>}

      {itens.length === 0 ? (
        <p className="ad-legenda" style={{ marginTop: "0.75rem" }}>
          Ainda sem documentos — carrega aqui relatórios, programas ou qualquer coisa que queiras ter à
          mão sobre este evento.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {itens.map((d) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.55rem 0",
                borderTop: "1px solid #eae7de",
              }}
            >
              <a href={`/api/admin/eventos/documentos/${d.id}`} className="ad-download">
                {d.nome}
              </a>
              <span className="ad-legenda" style={{ marginLeft: "auto" }}>
                {formatarData(d.criadoEm)}
              </span>
              <button
                type="button"
                disabled={aApagar === d.id}
                onClick={() => apagar(d.id)}
                style={{
                  flexShrink: 0,
                  padding: "0.3rem 0.8rem",
                  fontSize: "0.8rem",
                  background: "#ffffff",
                  color: "#c0392b",
                  border: "1px solid #c0392b",
                  borderRadius: "0.3rem",
                  cursor: "pointer",
                }}
              >
                {aApagar === d.id ? "A apagar…" : "Apagar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
