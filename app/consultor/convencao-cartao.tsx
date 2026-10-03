"use client";

import { useState } from "react";

export interface PedidoConvencao {
  bilhetes: number;
  pagamento: string;
  comprovativoNome: string | null;
  comprovativoEm: string | null;
  comprovativo2Nome: string | null;
  comprovativo2Em: string | null;
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

/** Um espaço de envio: um comprovativo (o 1º pagamento, o restante, ou o valor total). */
function EnvioComprovativo({
  email,
  numero,
  titulo,
  enviadoEmInicial,
}: {
  email: string;
  numero: 1 | 2;
  titulo: string;
  enviadoEmInicial: string | null;
}) {
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviadoEm, setEnviadoEm] = useState(enviadoEmInicial);
  const [acabouDeGravar, setAcabouDeGravar] = useState(false);
  const idCampo = `comprovativo-convencao-${numero}`;

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
      dados.set("pagamento", String(numero));
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

  return (
    <form onSubmit={gravar} className="vqb-convencao-form">
      <label htmlFor={idCampo}>{titulo}</label>
      {enviadoEm ? (
        <p className="vqb-convencao-ok">
          {acabouDeGravar ? "Comprovativo gravado. Obrigado!" : `Enviado a ${formatarData(enviadoEm)}.`} Se
          precisares, podes enviar outro para o substituir.
        </p>
      ) : (
        <p className="vqb-convencao-falta">Ainda não enviaste este comprovativo.</p>
      )}
      <input
        id={idCampo}
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
      {erro && <p className="vqb-erro">{erro}</p>}
    </form>
  );
}

export function ConvencaoCartao({ email, pedido }: { email: string; pedido: PedidoConvencao }) {
  const pagaEmDuasVezes = pedido.pagamento !== "O valor total";
  const pagamento = pagaEmDuasVezes ? "Pagas em duas vezes" : "Pagas o valor total";

  return (
    <div className="vqb-cartao vqb-convencao">
      <span className="vqb-destaque-etiqueta">Convenção</span>
      <h3 className="vqb-destaque-titulo">Convenção Nacional iCligo</h3>
      <p className="vqb-destaque-data">13 de março de 2027 · TGV, pack da Sara Izza</p>
      <p className="vqb-destaque-texto">
        O teu pedido: {pedido.bilhetes} {pedido.bilhetes === 1 ? "bilhete" : "bilhetes"} · {pagamento}.{" "}
        <a href="/bilhetes-convencao" className="vqb-convencao-link">
          Acrescentar bilhetes
        </a>
      </p>

      {pagaEmDuasVezes ? (
        <div className="vqb-convencao-pagamentos">
          <EnvioComprovativo
            email={email}
            numero={1}
            titulo="1º pagamento (para bloquear o lugar)"
            enviadoEmInicial={pedido.comprovativoEm}
          />
          <EnvioComprovativo
            email={email}
            numero={2}
            titulo="2º pagamento (o restante)"
            enviadoEmInicial={pedido.comprovativo2Em}
          />
        </div>
      ) : (
        <EnvioComprovativo
          email={email}
          numero={1}
          titulo="Comprovativo de pagamento"
          enviadoEmInicial={pedido.comprovativoEm}
        />
      )}
    </div>
  );
}
