"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Fechar/reabrir o questionário e mandar a notificação no telemóvel à equipa. */
export function BotoesQuestionario({
  slug,
  aberto,
  pushEnviadoEm,
}: {
  slug: string;
  aberto: boolean;
  pushEnviadoEm: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const [aCorrer, setACorrer] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  async function acao(nome: "fechar" | "abrir" | "notificar"): Promise<void> {
    setACorrer(nome);
    setMensagem("");
    try {
      const r = await fetch("/api/admin/questionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, acao: nome }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) setMensagem(typeof corpo.erro === "string" ? corpo.erro : "não foi possível");
      else if (nome === "notificar") setMensagem(`Notificação enviada a ${corpo.enviados} consultor${corpo.enviados === 1 ? "" : "es"}.`);
      router.refresh();
    } catch {
      setMensagem("falha de ligação");
    } finally {
      setACorrer(null);
    }
  }

  const quando = pushEnviadoEm
    ? new Date(pushEnviadoEm).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" })
    : null;

  return (
    <div className="aq-botoes">
      {aberto && (
        <button type="button" disabled={aCorrer !== null} onClick={() => acao("notificar")}>
          {aCorrer === "notificar" ? "A enviar…" : quando ? "Enviar notificação outra vez" : "Enviar notificação no telemóvel"}
        </button>
      )}
      <button type="button" className="aq-secundario" disabled={aCorrer !== null} onClick={() => acao(aberto ? "fechar" : "abrir")}>
        {aberto ? "Fechar questionário" : "Reabrir questionário"}
      </button>
      {quando && <span className="aq-mudo">Notificação enviada a {quando} (só a quem ainda não tinha respondido).</span>}
      {mensagem && <span className="aq-mudo">{mensagem}</span>}
    </div>
  );
}
