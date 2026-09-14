"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Lote {
  enviados: number;
  falhas: number;
  restantes: number;
}

/**
 * Reenvia o aviso de sessão a toda a equipa, em lotes. O ciclo vive no
 * browser de propósito: são centenas de emails, cada um com três chamadas à
 * API da ActiveCampaign, e nenhuma função da Vercel aguenta isso de uma vez
 * — assim também se vê o progresso a andar em vez de uma página parada.
 */
export function AvisarEquipa({ webinarId, titulo }: { webinarId: string; titulo: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "a-enviar" | "feito" | "erro">("pronto");
  const [enviados, setEnviados] = useState(0);
  const [falhas, setFalhas] = useState(0);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(): Promise<void> {
    if (
      !window.confirm(
        `Reenviar o aviso desta sessão ("${titulo}") a TODA a equipa? Quem já tinha recebido vai receber outra vez.`,
      )
    ) {
      return;
    }

    setEstado("a-enviar");
    setErro(null);
    setEnviados(0);
    setFalhas(0);
    setRestantes(null);

    let totalEnviados = 0;
    let totalFalhas = 0;
    let reiniciar = true;

    try {
      for (;;) {
        const resposta = await fetch(`/api/admin/webinar/${webinarId}/avisar-equipa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reiniciar }),
        });
        const dados = (await resposta.json()) as Lote & { erro?: string };
        if (!resposta.ok) {
          setErro(dados.erro ?? "Falha desconhecida.");
          setEstado("erro");
          return;
        }
        reiniciar = false;
        totalEnviados += dados.enviados;
        totalFalhas += dados.falhas;
        setEnviados(totalEnviados);
        setFalhas(totalFalhas);
        setRestantes(dados.restantes);
        if (dados.restantes === 0) break;
        // Um lote sem ninguém processado e ainda com gente à espera só pode
        // ser um ciclo infinito — mais vale parar e dizer.
        if (dados.enviados + dados.falhas === 0) {
          setErro("O envio parou sem progredir — vê os registos da Vercel antes de tentar outra vez.");
          setEstado("erro");
          return;
        }
      }
      setEstado("feito");
      router.refresh();
    } catch {
      setErro("Falha de rede a meio do envio — o que já saiu não se repete se voltares a carregar.");
      setEstado("erro");
    }
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <button
        type="button"
        onClick={enviar}
        disabled={estado === "a-enviar"}
        style={{
          background: "transparent",
          color: "#4b5320",
          border: "1px solid #4b5320",
          borderRadius: "8px",
          padding: "0.4rem 0.9rem",
          fontSize: "0.85rem",
          fontWeight: 700,
          cursor: estado === "a-enviar" ? "default" : "pointer",
        }}
      >
        {estado === "a-enviar" ? "A enviar…" : "Reenviar aviso a toda a equipa"}
      </button>

      {estado === "a-enviar" && (
        <span className="ad-legenda" style={{ marginLeft: "0.75rem" }}>
          {enviados} enviado(s){falhas > 0 && `, ${falhas} falhou(aram)`}
          {restantes !== null && ` · faltam ${restantes}`} — não feches esta página.
        </span>
      )}
      {estado === "feito" && (
        <span className="ad-legenda" style={{ marginLeft: "0.75rem", color: "#0ca30c" }}>
          Aviso enviado a {enviados} pessoa(s){falhas > 0 && `, com ${falhas} falha(s)`}.
        </span>
      )}
      {estado === "erro" && (
        <span className="ad-legenda" style={{ marginLeft: "0.75rem", color: "#c0392b" }}>
          {erro}
        </span>
      )}
    </div>
  );
}
