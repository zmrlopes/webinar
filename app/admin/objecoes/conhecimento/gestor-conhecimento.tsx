"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConhecimentoObjecao } from "@/lib/objecoes";

export function GestorConhecimento({ itens }: { itens: ConhecimentoObjecao[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState<{ titulo: string; juntou: boolean } | null>(null);
  const [aApagar, setAApagar] = useState<string | null>(null);

  async function adicionar(): Promise<void> {
    if (!titulo.trim() || (!conteudo.trim() && !pdf)) return;
    setAGuardar(true);
    setErro("");
    setUltimoResultado(null);
    try {
      let resposta: Response;
      if (pdf) {
        const dados = new FormData();
        dados.set("titulo", titulo);
        dados.set("pdf", pdf);
        resposta = await fetch("/api/admin/objecoes/conhecimento/pdf", { method: "POST", body: dados });
      } else {
        resposta = await fetch("/api/admin/objecoes/conhecimento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, conteudo }),
        });
      }
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível gravar");
        setAGuardar(false);
        return;
      }
      setTitulo("");
      setConteudo("");
      setPdf(null);
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
            disabled={pdf !== null}
            placeholder="Diretriz, exemplo, referência ou conhecimento que o assistente deve usar..."
          />
        </div>
        <p className="ob-ou">— ou, em vez de escrever, anexa um PDF —</p>
        <div className="ob-campo">
          <label htmlFor="ob-pdf">PDF</label>
          <input
            id="ob-pdf"
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
          />
          {pdf && <p className="ob-pdf-escolhido">Vai extrair o texto de "{pdf.name}".</p>}
        </div>
        {erro && <p className="ob-erro">{erro}</p>}
        {ultimoResultado && (
          <p className="ob-resultado">
            {ultimoResultado.juntou
              ? `Juntado ao tema já existente "${ultimoResultado.titulo}".`
              : `Novo tema criado: "${ultimoResultado.titulo}".`}
          </p>
        )}
        <button
          type="button"
          disabled={!titulo.trim() || (!conteudo.trim() && !pdf) || aGuardar}
          onClick={adicionar}
        >
          {aGuardar ? (pdf ? "A ler o PDF e a adicionar…" : "A verificar temas e a adicionar…") : "Adicionar"}
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
              {item.pdfNome && (
                <a href={`/api/admin/objecoes/conhecimento/${item.id}/pdf`} className="ob-pdf-link">
                  📄 {item.pdfNome}
                </a>
              )}
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
