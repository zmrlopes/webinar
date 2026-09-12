"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Resultado {
  ficheiro: string;
  totalLinhasCru: number;
  importados: number;
  ignorados: string[];
  jaExistiam: string;
  colunas: string[];
  colunaDataRegisto: string | null;
  comDataRegisto: number;
  exemploDataRegisto: string | null;
}

export function FormularioImportarEquipa() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"pronto" | "a-importar" | "feito" | "erro">("pronto");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function importar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    const ficheiro = inputRef.current?.files?.[0];
    if (!ficheiro) {
      setErro("Escolhe um ficheiro .csv primeiro.");
      setEstado("erro");
      return;
    }

    setEstado("a-importar");
    setErro(null);
    try {
      const formData = new FormData();
      formData.set("ficheiro", ficheiro);
      const resposta = await fetch("/api/admin/equipa/importar", { method: "POST", body: formData });
      const dados = (await resposta.json()) as Resultado & { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha desconhecida.");
        setEstado("erro");
        return;
      }
      setResultado(dados);
      setEstado("feito");
      router.refresh();
    } catch {
      setErro("Falha de rede — tenta outra vez.");
      setEstado("erro");
    }
  }

  return (
    <div>
      <form onSubmit={importar} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <input ref={inputRef} type="file" accept=".csv" disabled={estado === "a-importar"} />
        <button
          type="submit"
          disabled={estado === "a-importar"}
          style={{
            padding: "0.5rem 1.1rem",
            fontSize: "0.9rem",
            background: "#4b5320",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.3rem",
            cursor: estado === "a-importar" ? "default" : "pointer",
          }}
        >
          {estado === "a-importar" ? "A importar…" : "Importar"}
        </button>
      </form>

      {estado === "feito" && resultado && (
        <ul style={{ marginTop: "1rem", paddingLeft: "1.2rem", color: "#000000" }}>
          <li>Ficheiro: {resultado.ficheiro}</li>
          <li>Linhas no CSV: {resultado.totalLinhasCru}</li>
          <li>Consultores importados/atualizados: {resultado.importados}</li>
          <li>Já existiam antes desta importação: {resultado.jaExistiam}</li>
          {resultado.ignorados.length > 0 && (
            <li>
              Ignorados por falta de email: {resultado.ignorados.length} (
              {resultado.ignorados.slice(0, 5).join(", ")}
              {resultado.ignorados.length > 5 ? ", …" : ""})
            </li>
          )}
          <li>
            Data de registo:{" "}
            {resultado.colunaDataRegisto ? (
              <>
                lida da coluna <strong>{resultado.colunaDataRegisto}</strong> — {resultado.comDataRegisto}{" "}
                de {resultado.importados} com data
                {resultado.exemploDataRegisto ? ` (exemplo: "${resultado.exemploDataRegisto}")` : ""}
              </>
            ) : (
              <strong style={{ color: "#c0392b" }}>
                nenhuma coluna de data encontrada neste ficheiro
              </strong>
            )}
          </li>
          <li>Colunas do ficheiro: {resultado.colunas.join(", ")}</li>
        </ul>
      )}

      {estado === "erro" && <p style={{ marginTop: "1rem", color: "#c0392b" }}>{erro}</p>}
    </div>
  );
}
