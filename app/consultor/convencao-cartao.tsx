"use client";

import { useState } from "react";

export interface PedidoConvencao {
  bilhetes: number;
  pagamento: string;
  comprovativoNome: string | null;
  comprovativoEm: string | null;
}

// Abaixo do limite de 4MB do servidor, com folga para o resto do pedido.
const LIMITE_ENVIO = 3.5 * 1024 * 1024;
const LADO_MAXIMO = 2200;

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

/**
 * Fotografias tiradas no telemóvel passam facilmente dos 4MB que o servidor
 * aceita: reduz-se para JPEG antes de enviar. PDFs vão tal como estão.
 */
async function prepararFicheiro(ficheiro: File): Promise<File> {
  if (!ficheiro.type.startsWith("image/") || ficheiro.size <= LIMITE_ENVIO) return ficheiro;
  try {
    const imagem = await createImageBitmap(ficheiro);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext("2d")?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, "image/jpeg", 0.85));
    if (!blob) return ficheiro;
    const nome = ficheiro.name.replace(/\.[^.]+$/, "") || "comprovativo";
    return new File([blob], `${nome}.jpg`, { type: "image/jpeg" });
  } catch {
    return ficheiro;
  }
}

export function ConvencaoCartao({ email, pedido }: { email: string; pedido: PedidoConvencao }) {
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviadoEm, setEnviadoEm] = useState(pedido.comprovativoEm);
  const [acabouDeGravar, setAcabouDeGravar] = useState(false);

  async function gravar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!ficheiro) {
      setErro("escolhe primeiro o comprovativo (fotografia ou PDF)");
      return;
    }
    setAGravar(true);
    setErro("");
    try {
      const preparado = await prepararFicheiro(ficheiro);
      if (preparado.size > 4 * 1024 * 1024) {
        setErro("o ficheiro não pode passar 4MB — tira uma fotografia ou um print do comprovativo");
        setAGravar(false);
        return;
      }
      const dados = new FormData();
      dados.set("email", email);
      dados.set("ficheiro", preparado);
      const resposta = await fetch("/api/consultor/convencao-comprovativo", { method: "POST", body: dados });
      const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "não foi possível gravar — tenta outra vez");
        setAGravar(false);
        return;
      }
      setEnviadoEm(new Date().toISOString());
      setAcabouDeGravar(true);
      setFicheiro(null);
      formulario.reset();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    }
    setAGravar(false);
  }

  const pagamento = pedido.pagamento === "O valor total" ? "Pagas o valor total" : "Pagas só uma parte para já";

  return (
    <div className="vqb-cartao vqb-convencao">
      <span className="vqb-destaque-etiqueta">Convenção</span>
      <h3 className="vqb-destaque-titulo">Convenção Nacional iCligo</h3>
      <p className="vqb-destaque-data">13 de março de 2027 · TGV, pack da Sara Izza</p>
      <p className="vqb-destaque-texto">
        O teu pedido: {pedido.bilhetes} {pedido.bilhetes === 1 ? "bilhete" : "bilhetes"} · {pagamento}.
      </p>

      {enviadoEm && (
        <p className="vqb-convencao-ok">
          {acabouDeGravar ? "Comprovativo gravado. Obrigado!" : `Comprovativo enviado a ${formatarData(enviadoEm)}.`}{" "}
          Se precisares, podes enviar outro para o substituir.
        </p>
      )}

      <form onSubmit={gravar} className="vqb-convencao-form">
        <label htmlFor="comprovativo-convencao">Comprovativo de pagamento</label>
        <input
          id="comprovativo-convencao"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            setFicheiro(e.target.files?.[0] ?? null);
            setErro("");
            setAcabouDeGravar(false);
          }}
        />
        <button type="submit" disabled={aGravar}>
          {aGravar ? "A gravar…" : "Gravar"}
        </button>
      </form>
      {erro && <p className="vqb-erro">{erro}</p>}
    </div>
  );
}
