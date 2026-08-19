"use client";

import { useState } from "react";

export function GeradorLink() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"pronto" | "a-pedir" | "feito" | "erro">("pronto");
  const [mensagemErro, setMensagemErro] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function obterLink(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    setEstado("a-pedir");
    setMensagemErro("");
    setLink(null);

    try {
      const resposta = await fetch("/api/consultor/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setMensagemErro(typeof dados.erro === "string" ? dados.erro : "não foi possível gerar o link");
        setEstado("erro");
        return;
      }

      setLink(dados.link);
      setEstado("feito");
      setCopiado(false);
    } catch {
      setMensagemErro("falha de ligação — tenta outra vez");
      setEstado("erro");
    }
  }

  async function copiar(): Promise<void> {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  return (
    <div>
      <form onSubmit={obterLink}>
        <label htmlFor="email-consultor">O teu email (o mesmo registado na equipa)</label>
        <input
          id="email-consultor"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao.silva@exemplo.pt"
        />
        <button type="submit" disabled={estado === "a-pedir"}>
          {estado === "a-pedir" ? "A verificar..." : "Obter link"}
        </button>
      </form>

      {estado === "erro" && <p className="erro">{mensagemErro}</p>}

      {link && (
        <div className="cartao" style={{ marginTop: "1.5rem" }}>
          <p className="mudo" style={{ marginTop: 0 }}>
            O teu link de inscrição (também te enviámos por email):
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
