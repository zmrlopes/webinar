"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResumoPresencasEvento({
  total, presentes, semCheckin, compacto = false,
}: { total: number; presentes: number; semCheckin: number; compacto?: boolean }) {
  const router = useRouter();
  const [aAtualizar, iniciarAtualizacao] = useTransition();

  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === "visible") iniciarAtualizacao(() => router.refresh());
    };
    const intervalo = window.setInterval(atualizar, 30_000);
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, [router]);

  if (compacto) return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginTop: "1rem", fontSize: "0.9rem" }} aria-live="polite" aria-atomic="true">
      <span style={{ color: "#4b5320" }}><strong>{presentes}</strong> com check-in</span>
      <span><strong>{semCheckin}</strong> sem check-in</span>
    </div>
  );

  return (
    <section aria-label="Presenças no evento" style={{ marginBottom: "1.5rem" }}>
      <h2>Presenças no evento</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }} aria-live="polite" aria-atomic="true">
        {[
          { valor: total, legenda: "Pessoas inscritas" },
          { valor: presentes, legenda: "Vieram · check-in efetuado" },
          { valor: semCheckin, legenda: "Sem check-in" },
        ].map(({ valor, legenda }) => (
          <div key={legenda} style={{ background: "#f7f6f3", border: "1px solid #4b5320", borderRadius: 10, padding: "1rem" }}>
            <strong style={{ display: "block", color: "#4b5320", fontSize: "1.8rem" }}>{valor}</strong>
            <span style={{ fontSize: "0.85rem" }}>{legenda}</span>
          </div>
        ))}
      </div>
      <p className="ad-legenda">Contagem por pessoa, incluindo acompanhantes e crianças. Atualização automática a cada 30 segundos.</p>
      <button type="button" className="ad-download" disabled={aAtualizar} onClick={() => iniciarAtualizacao(() => router.refresh())}>
        {aAtualizar ? "A atualizar…" : "Atualizar presenças"}
      </button>
    </section>
  );
}
