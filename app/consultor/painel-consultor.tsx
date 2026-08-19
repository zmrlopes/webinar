"use client";

import { useState } from "react";

interface Resultado {
  webinar: { titulo: string; sessaoExternaEm: string };
  totalInscricoes: number;
  presencas: number;
  naoEntraram: number;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
}

export function PainelConsultor() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"pronto" | "a-pedir" | "feito" | "erro">("pronto");
  const [mensagemErro, setMensagemErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function consultar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    setEstado("a-pedir");
    setMensagemErro("");
    setResultado(null);

    try {
      const resposta = await fetch("/api/consultor/estatisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setMensagemErro(typeof dados.erro === "string" ? dados.erro : "não foi possível obter os números");
        setEstado("erro");
        return;
      }

      setResultado(dados);
      setEstado("feito");
    } catch {
      setMensagemErro("falha de ligação — tenta outra vez");
      setEstado("erro");
    }
  }

  return (
    <div>
      <form onSubmit={consultar}>
        <label htmlFor="email-painel-consultor">O teu email (o mesmo registado na equipa)</label>
        <input
          id="email-painel-consultor"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao.silva@exemplo.pt"
        />
        <button type="submit" disabled={estado === "a-pedir"}>
          {estado === "a-pedir" ? "A consultar..." : "Ver os meus números"}
        </button>
      </form>

      {estado === "erro" && <p className="erro">{mensagemErro}</p>}

      {resultado && (
        <div className="cartao" style={{ marginTop: "1.5rem" }}>
          <p className="mudo" style={{ marginTop: 0 }}>
            {resultado.webinar.titulo} — {formatarData(resultado.webinar.sessaoExternaEm)}
          </p>
          <table>
            <tbody>
              <tr>
                <td>Inscrições pelo teu link</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{resultado.totalInscricoes}</td>
              </tr>
              <tr>
                <td>Estiveram presentes</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{resultado.presencas}</td>
              </tr>
              <tr>
                <td>Não entraram (ou ainda por confirmar, se a sessão ainda não aconteceu)</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{resultado.naoEntraram}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
