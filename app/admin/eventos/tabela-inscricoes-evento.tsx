"use client";

import { useMemo, useState } from "react";
import type { InscricaoEvento } from "@/lib/eventos";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function TabelaInscricoesEvento({ inscricoes }: { inscricoes: InscricaoEvento[] }) {
  const [pesquisa, setPesquisa] = useState("");

  const inscricoesFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    if (!termo) return inscricoes;
    return inscricoes.filter((i) => `${i.nome} ${i.telemovel} ${i.email}`.toLowerCase().includes(termo));
  }, [inscricoes, pesquisa]);

  return (
    <div>
      <input
        type="text"
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
        placeholder="Pesquisar por nome, telemóvel ou email…"
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "0.9rem",
          width: "100%",
          maxWidth: 320,
          boxSizing: "border-box",
        }}
      />
      {pesquisa.trim() !== "" && (
        <p className="ad-legenda" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          {inscricoesFiltradas.length} de {inscricoes.length}
        </p>
      )}
      <div className="ad-tabela-wrap">
        <table className="ad-tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telemóvel</th>
              <th>Email</th>
              <th>Adultos</th>
              <th>Crianças +10</th>
              <th>Crianças -10</th>
              <th>Total</th>
              <th>Compareceu</th>
              <th>Inscrito em</th>
              <th>Comprovativo</th>
              <th>Email QR code</th>
            </tr>
          </thead>
          <tbody>
            {inscricoesFiltradas.map((i) => (
              <tr key={i.id}>
                <td>{i.nome}</td>
                <td>{i.telemovel}</td>
                <td>{i.email}</td>
                <td>{i.adultos}</td>
                <td>{i.criancasMais10}</td>
                <td>{i.criancasMenos10}</td>
                <td>{i.totalPagar}€</td>
                <td>
                  <div className="ad-bilhetes">
                    {i.bilhetes.map((b) => (
                      <span
                        key={b.id}
                        className={b.presente ? "ad-presenca ad-presenca-sim" : "ad-presenca ad-presenca-nao"}
                      >
                        {b.rotulo} {b.presente ? "✓" : "—"}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{formatarData(i.criadoEm)}</td>
                <td>
                  <a href={`/api/admin/eventos/comprovativo/${i.id}`} className="ad-download">
                    Descarregar
                  </a>
                </td>
                <td>
                  {i.emailEnviado === null ? (
                    <span style={{ color: "#6b6a63" }}>desconhecido</span>
                  ) : i.emailEnviado ? (
                    <span style={{ color: "#0ca30c" }}>enviado</span>
                  ) : (
                    <span style={{ color: "#c0392b" }}>falhou</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
