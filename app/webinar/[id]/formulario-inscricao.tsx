"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function FormularioInscricao({ webinarId }: { webinarId: string }) {
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"pronto" | "a-enviar" | "feito" | "erro">("pronto");
  const [mensagemErro, setMensagemErro] = useState("");
  const referencia = useSearchParams().get("ref") ?? undefined;

  async function submeter(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    setEstado("a-enviar");
    setMensagemErro("");

    try {
      const resposta = await fetch("/api/inscricoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId, nome, apelido, email, referencia }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setMensagemErro(typeof dados.erro === "string" ? dados.erro : "não foi possível inscrever");
        setEstado("erro");
        return;
      }

      setEstado("feito");
    } catch {
      setMensagemErro("falha de ligação — tenta outra vez");
      setEstado("erro");
    }
  }

  if (estado === "feito") {
    return (
      <p className="sucesso">
        Inscrição feita! Vais receber um email de confirmação com o link de entrada antes da
        sessão.
      </p>
    );
  }

  return (
    <form onSubmit={submeter}>
      <label htmlFor="nome">Nome</label>
      <input
        id="nome"
        required
        maxLength={64}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />

      <label htmlFor="apelido">Apelido</label>
      <input
        id="apelido"
        maxLength={64}
        value={apelido}
        onChange={(e) => setApelido(e.target.value)}
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button type="submit" disabled={estado === "a-enviar"}>
        {estado === "a-enviar" ? "A inscrever..." : "Inscrever-me"}
      </button>

      {estado === "erro" && <p className="erro">{mensagemErro}</p>}
    </form>
  );
}
