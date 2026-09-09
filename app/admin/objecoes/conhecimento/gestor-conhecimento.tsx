"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConhecimentoObjecao } from "@/lib/objecoes";

export function GestorConhecimento({ itens }: { itens: ConhecimentoObjecao[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState<{ titulo: string; juntou: boolean } | null>(null);
  const [aApagar, setAApagar] = useState<string | null>(null);

  async function adicionar(): Promise<void> {
    if (!titulo.trim() || !conteudo.trim()) return;
    setAGuardar(true);
    setErro("");
    setUltimoResultado(null);
    try {
      const resposta = await fetch("/api/admin/objecoes/conhecimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, conteudo }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível gravar");
        setAGuardar(false);
        return;
      }
      setTitulo("");
      setConteudo("");
      setUltimoResultado({ titulo: corpo.titulo, juntou: corpo.juntou === true });
      router.refresh();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAGuardar(false);
    }
  }

  async function apagar(id: string): Promise<void> {
    if (!window.confirm("Apagar esta entrada?")) return;
    setAApagar(id);
    try {
      await fetch(`/api/admin/objecoes/conhecimento/${id}/apagar`, { method: "POST" });
      router.refresh();
    } finally {
      setAApagar(null);
    }
  }

  return (
    <div>
      <div className="ob-cartao" style={{ marginBottom: "1.5rem" }}>
        <div className="ob-campo">
          <label htmlFor="ob-titulo">Título</label>
          <input
            id="ob-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="ex: Objeção de preço, Argumentário oficial, Exemplo real..."
          />
        </div>
        <div className="ob-campo">
          <label htmlFor="ob-conteudo">Conteúdo</label>
          <textarea
            id="ob-conteudo"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Diretriz, exemplo, referência ou conhecimento que o assistente deve usar..."
          />
        </div>
        {erro && <p className="ob-erro">{erro}</p>}
        {ultimoResultado && (
          <p className="ob-resultado">
            {ultimoResultado.juntou
              ? `Juntado ao tema já existente "${ultimoResultado.titulo}".`
              : `Novo tema criado: "${ultimoResultado.titulo}".`}
          </p>
        )}
        <button type="button" disabled={!titulo.trim() || !conteudo.trim() || aGuardar} onClick={adicionar}>
          {aGuardar ? "A verificar temas e a adicionar…" : "Adicionar"}
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="ad-subtitulo">Ainda sem nenhuma entrada — o assistente vai responder com cautela genérica até aqui teres algo.</p>
      ) : (
        itens.map((item) => (
          <div className="ob-item" key={item.id}>
            <div>
              <strong>{item.titulo}</strong>
              <p>{item.conteudo}</p>
            </div>
            <button
              type="button"
              className="ob-apagar"
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
