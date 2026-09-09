"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PdfDiretrizesGerais } from "@/lib/objecoes";

// A Vercel rejeita o pedido inteiro acima de ~4.5MB, antes de chegar ao
// código — por isso avisa-se aqui já, em vez de deixar tentar e falhar com
// um erro confuso.
const TAMANHO_MAXIMO_PDF = 4 * 1024 * 1024;

export function DiretrizesGerais({ inicial, pdfs }: { inicial: string; pdfs: PdfDiretrizesGerais[] }) {
  const router = useRouter();
  const [conteudo, setConteudo] = useState(inicial);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erro, setErro] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [aEnviarPdf, setAEnviarPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState("");
  const [aApagarPdf, setAApagarPdf] = useState<string | null>(null);

  async function guardar(): Promise<void> {
    setAGuardar(true);
    setErro("");
    setGuardado(false);
    try {
      const resposta = await fetch("/api/admin/objecoes/diretrizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo }),
      });
      if (!resposta.ok) {
        setErro("não foi possível gravar");
        return;
      }
      setGuardado(true);
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAGuardar(false);
    }
  }

  async function enviarPdf(): Promise<void> {
    if (!pdf) return;
    if (pdf.size > TAMANHO_MAXIMO_PDF) {
      setErroPdf(`este PDF tem ${(pdf.size / 1024 / 1024).toFixed(1)}MB — o máximo é 4MB`);
      return;
    }
    setAEnviarPdf(true);
    setErroPdf("");
    try {
      const dados = new FormData();
      dados.set("pdf", pdf);
      const resposta = await fetch("/api/admin/objecoes/diretrizes/pdf", { method: "POST", body: dados });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErroPdf(
          corpo && typeof corpo.erro === "string"
            ? corpo.erro
            : `não foi possível gravar (o servidor respondeu ${resposta.status}, provavelmente o ficheiro é grande demais)`,
        );
        return;
      }
      setPdf(null);
      router.refresh();
    } catch {
      setErroPdf("falha de ligação — tenta outra vez");
    } finally {
      setAEnviarPdf(false);
    }
  }

  async function apagarPdf(id: string): Promise<void> {
    if (!window.confirm("Apagar este PDF das diretrizes gerais?")) return;
    setAApagarPdf(id);
    try {
      await fetch(`/api/admin/objecoes/diretrizes/pdf/${id}/apagar`, { method: "POST" });
      router.refresh();
    } finally {
      setAApagarPdf(null);
    }
  }

  return (
    <div className="ob-cartao ob-cartao-diretrizes">
      <div className="ob-campo">
        <label htmlFor="ob-diretrizes">Diretrizes gerais (aplicam-se sempre, a todas as dúvidas)</label>
        <textarea
          id="ob-diretrizes"
          value={conteudo}
          onChange={(e) => {
            setConteudo(e.target.value);
            setGuardado(false);
          }}
          placeholder="ex: Fala sempre em tom próximo e informal. Nunca prometas valores de ganhos. Termina sempre a convidar para uma chamada com o consultor..."
        />
      </div>
      {erro && <p className="ob-erro">{erro}</p>}
      {guardado && !erro && <p className="ob-resultado">Guardado.</p>}
      <button type="button" disabled={aGuardar} onClick={guardar}>
        {aGuardar ? "A guardar…" : "Guardar diretrizes gerais"}
      </button>

      <p className="ob-ou">— e/ou anexa PDFs, também sempre incluídos —</p>
      <div className="ob-campo">
        <label htmlFor="ob-diretrizes-pdf">PDF</label>
        <input
          id="ob-diretrizes-pdf"
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
        />
      </div>
      {erroPdf && <p className="ob-erro">{erroPdf}</p>}
      <button type="button" disabled={!pdf || aEnviarPdf} onClick={enviarPdf}>
        {aEnviarPdf ? "A ler o PDF e a adicionar…" : "Adicionar PDF"}
      </button>

      {pdfs.length > 0 && (
        <ul className="ob-pdfs-lista">
          {pdfs.map((p) => (
            <li key={p.id}>
              <a href={`/api/admin/objecoes/diretrizes/pdf/${p.id}`} className="ob-pdf-link">
                📄 {p.nome}
              </a>
              <button
                type="button"
                className="ob-apagar"
                disabled={aApagarPdf === p.id}
                onClick={() => apagarPdf(p.id)}
              >
                {aApagarPdf === p.id ? "A apagar…" : "Apagar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
