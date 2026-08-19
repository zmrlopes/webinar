"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function FormularioInscricao({ webinarId }: { webinarId: string }) {
  const [nome, setNome] = useState("");
  const [telemovel, setTelemovel] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"pronto" | "a-enviar" | "feito" | "erro">("pronto");
  const [mensagemErro, setMensagemErro] = useState("");
  const parametros = useSearchParams();
  const referencia = parametros.get("ref") ?? undefined;
  const referenciaEmail = parametros.get("refEmail") ?? undefined;

  useEffect(() => {
    if (!referenciaEmail) return;
    fetch("/api/consultor/clique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, referenciaEmail }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submeter(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    setEstado("a-enviar");
    setMensagemErro("");

    try {
      const resposta = await fetch("/api/inscricoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId, nome, telemovel, email, referencia, referenciaEmail }),
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

      <label htmlFor="telemovel">Telemóvel</label>
      <input
        id="telemovel"
        type="tel"
        required
        maxLength={32}
        value={telemovel}
        onChange={(e) => setTelemovel(e.target.value)}
      />

      <label htmlFor="email">E-mail</label>
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
