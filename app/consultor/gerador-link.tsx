"use client";

import { useState } from "react";

const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g;

function gerarCodigo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function GeradorLink({ baseUrl }: { baseUrl: string }) {
  const [nome, setNome] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function obterLink(evento: React.FormEvent): void {
    evento.preventDefault();
    const codigo = gerarCodigo(nome);
    if (!codigo) return;
    setLink(`${baseUrl}?ref=${codigo}`);
    setCopiado(false);
  }

  async function copiar(): Promise<void> {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  return (
    <div>
      <form onSubmit={obterLink}>
        <label htmlFor="nome-consultor">O teu nome</label>
        <input
          id="nome-consultor"
          required
          maxLength={64}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: João Silva"
        />
        <button type="submit">Obter link</button>
      </form>

      {link && (
        <div className="cartao" style={{ marginTop: "1.5rem" }}>
          <p className="mudo" style={{ marginTop: 0 }}>
            O teu link de inscrição:
          </p>
          <p style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{link}</p>
          <button type="button" onClick={copiar}>
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      )}
    </div>
  );
}
