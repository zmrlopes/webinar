import Link from "next/link";
import { listarWebinarsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminDashboard() {
  const webinars = await listarWebinarsAdmin();

  return (
    <main style={{ maxWidth: 960 }}>
      <h1>Sessões</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {webinars.map((w) => {
          const pctPresentes =
            w.totalInscritos > 0 ? Math.round((w.presentes / w.totalInscritos) * 100) : 0;

          return (
            <Link
              key={w.id}
              href={`/admin/webinar/${w.id}`}
              className="cartao"
              style={{ display: "block", color: "inherit", textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong>{w.titulo}</strong>
                {w.cancelada && <span className="etiqueta">cancelada</span>}
                {!w.cancelada && w.presencasFechadas && (
                  <span className="etiqueta">presenças fechadas</span>
                )}
                {!w.cancelada && !w.presencasFechadas && <span className="etiqueta">ativa</span>}
              </div>
              <p className="mudo" style={{ margin: "0.25rem 0 1rem" }}>
                {formatarData(w.sessaoExternaEm)}
              </p>

              <div style={{ display: "flex", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{w.totalInscritos}</div>
                  <div className="mudo" style={{ fontSize: "0.8rem" }}>
                    Inscritos
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: COR_PRESENTE }}>
                    {w.presentes}
                  </div>
                  <div className="mudo" style={{ fontSize: "0.8rem" }}>
                    Assistiram
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                    {w.mediaAssistencia !== null ? `${w.mediaAssistencia}%` : "—"}
                  </div>
                  <div className="mudo" style={{ fontSize: "0.8rem" }}>
                    Média assistência
                  </div>
                </div>
              </div>

              {w.totalInscritos > 0 && (
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    overflow: "hidden",
                    marginTop: "0.9rem",
                    background: "#f0efec",
                  }}
                >
                  <div style={{ width: `${pctPresentes}%`, height: "100%", background: COR_PRESENTE }} />
                </div>
              )}

              <p className="mudo" style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.8rem" }}>
                Links: {w.linksObtidos} obtido(s) · {w.linksPendentes} pendente(s) ·{" "}
                {w.linksFalhados} falhado(s)
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
