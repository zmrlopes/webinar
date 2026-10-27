"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** O email de uma inscrição, com "corrigir" para quando foi mal escrito. */
export function EditarEmailInscricao({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [aEditar, setAEditar] = useState(false);
  const [valor, setValor] = useState(email);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");

  async function gravar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setAGravar(true);
    setErro("");
    try {
      const resposta = await fetch("/api/admin/eventos/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email: valor }),
      });
      const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "não foi possível gravar");
      } else {
        setAEditar(false);
        router.refresh();
      }
    } catch {
      setErro("falha de ligação");
    }
    setAGravar(false);
  }

  if (!aEditar) {
    return (
      <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
        {email}
        <button
          type="button"
          onClick={() => {
            setValor(email);
            setAEditar(true);
          }}
          style={{ background: "none", border: "none", padding: 0, color: "#4b5320", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
        >
          corrigir
        </button>
      </span>
    );
  }

  return (
    <form onSubmit={gravar} style={{ display: "grid", gap: "0.35rem", minWidth: 220 }}>
      <input
        type="email"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
        autoFocus
        aria-label="Email correto"
        style={{ padding: "0.35rem 0.5rem", border: "1px solid #ccc", borderRadius: "6px", fontSize: "0.85rem" }}
      />
      <span style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="submit"
          disabled={aGravar}
          style={{ background: "#4b5320", color: "#fff", border: "none", borderRadius: "6px", padding: "0.3rem 0.7rem", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
        >
          {aGravar ? "A gravar…" : "Gravar"}
        </button>
        <button
          type="button"
          onClick={() => setAEditar(false)}
          style={{ background: "none", border: "1px solid #ccc", borderRadius: "6px", padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.8rem" }}
        >
          Cancelar
        </button>
      </span>
      {erro && <span style={{ color: "#c0392b", fontSize: "0.8rem" }}>{erro}</span>}
    </form>
  );
}
