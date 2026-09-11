"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PessoaWelcomeAboard } from "@/lib/welcome-aboard";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-PT", { dateStyle: "medium", timeZone: "Europe/Lisbon" });
}

export function TabelaWelcomeAboard({ itens }: { itens: PessoaWelcomeAboard[] }) {
  const router = useRouter();
  const [aGuardar, setAGuardar] = useState<string | null>(null);

  async function marcar(email: string, sessao: 1 | 2, concluida: boolean): Promise<void> {
    setAGuardar(`${email}-${sessao}`);
    try {
      await fetch("/api/admin/welcome-aboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessao, concluida }),
      });
      router.refresh();
    } finally {
      setAGuardar(null);
    }
  }

  if (itens.length === 0) {
    return <p className="ad-subtitulo">Ninguém elegível de momento.</p>;
  }

  return (
    <div className="ad-tabela-wrap">
      <table className="ad-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Registo</th>
            <th>Sessão 1</th>
            <th>Sessão 2</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.email}>
              <td>
                <div>{p.nome}</div>
                <div className="ad-legenda">{p.email}</div>
              </td>
              <td>{formatarData(p.dataRegisto)}</td>
              <td>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={p.sessao1Concluida}
                    disabled={aGuardar === `${p.email}-1`}
                    onChange={(e) => marcar(p.email, 1, e.target.checked)}
                  />
                  concluída
                </label>
              </td>
              <td>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={p.sessao2Concluida}
                    disabled={aGuardar === `${p.email}-2`}
                    onChange={(e) => marcar(p.email, 2, e.target.checked)}
                  />
                  concluída
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
