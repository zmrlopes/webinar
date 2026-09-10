"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormacaoExterna } from "@/lib/formacoes-externas";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function GestorFormacoesExternas({ itens }: { itens: FormacaoExterna[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [link, setLink] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [aApagar, setAApagar] = useState<string | null>(null);

  async function adicionar(): Promise<void> {
    if (!titulo.trim() || !dataHora || !link.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      const sessaoExternaEm = new Date(dataHora).toISOString();
      const resposta = await fetch("/api/admin/formacoes-externas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, sessaoExternaEm, link }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível gravar");
        return;
      }
      setTitulo("");
      setDataHora("");
      setLink("");
      router.refresh();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAGuardar(false);
    }
  }

  async function apagar(id: string): Promise<void> {
    if (!window.confirm("Apagar esta formação?")) return;
    setAApagar(id);
    try {
      await fetch(`/api/admin/formacoes-externas/${id}/apagar`, { method: "POST" });
      router.refresh();
    } finally {
      setAApagar(null);
    }
  }

  return (
    <div>
      <div className="fe-cartao" style={{ marginBottom: "1.5rem" }}>
        <div className="fe-campo">
          <label htmlFor="fe-titulo">Título</label>
          <input
            id="fe-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="ex: 🇵🇹 Be an Expert • Reservas"
          />
        </div>
        <div className="fe-campo">
          <label htmlFor="fe-data">Data e hora</label>
          <input
            id="fe-data"
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
          />
        </div>
        <div className="fe-campo">
          <label htmlFor="fe-link">Link</label>
          <input
            id="fe-link"
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://forum.icligo.com/c/eventos-online/..."
          />
        </div>
        {erro && <p className="fe-erro">{erro}</p>}
        <button
          type="button"
          disabled={!titulo.trim() || !dataHora || !link.trim() || aGuardar}
          onClick={adicionar}
        >
          {aGuardar ? "A guardar…" : "Adicionar"}
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="ad-subtitulo">Ainda sem nenhuma formação externa adicionada.</p>
      ) : (
        itens.map((item) => (
          <div className="fe-item" key={item.id}>
            <div>
              <strong>{item.titulo}</strong>
              <p>{formatarData(item.sessaoExternaEm)}</p>
              <a href={item.link} target="_blank" rel="noreferrer">
                {item.link}
              </a>
            </div>
            <button
              type="button"
              className="fe-apagar"
              disabled={aApagar === item.id}
              onClick={() => apagar(item.id)}
            >
              {aApagar === item.id ? "A apagar…" : "Apagar"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
