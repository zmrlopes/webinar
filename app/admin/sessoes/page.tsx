import Link from "next/link";
import { listarWebinarsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function AdminSessoes() {
  const webinars = await listarWebinarsAdmin();

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0; }
        .ad-topo { display: flex; justify-content: space-between; align-items: start; gap: 0.5rem; margin-bottom: 1.25rem; }
        .ad-cartao-seta { color: #4b5320; font-size: 0.8rem; margin-top: 0.35rem; text-decoration: none; }
        .ad-grid-sessoes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
        }
        .ad-cartao {
          background: #ffffff;
          color: #000000;
          border: 1px solid #ececE6;
          border-radius: 16px;
          padding: 1.25rem 1.4rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px rgba(0, 0, 0, 0.04);
        }
        .ad-sessao {
          display: block;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ad-sessao:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        }
        .ad-sessao-topo { display: flex; justify-content: space-between; align-items: start; gap: 0.5rem; }
        .ad-etiqueta {
          display: inline-block;
          background: #eef1e4;
          color: #4b5320;
          border: 1px solid #8a9a5b;
          border-radius: 999px;
          padding: 0.15rem 0.65rem;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-numeros-linha { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .ad-numero-pequeno { font-size: 1.3rem; font-weight: 800; }
      `}</style>

      <div className="ad-caixa">
        <div className="ad-topo">
          <h1>Sessões</h1>
          <Link href="/admin/formacoes/nova" className="ad-cartao-seta">
            + Criar formação
          </Link>
        </div>

        <div className="ad-grid-sessoes">
          {webinars.map((w) => {
            const pctPresentes =
              w.totalInscritos > 0 ? Math.round((w.presentes / w.totalInscritos) * 100) : 0;

            return (
              <Link key={w.id} href={`/admin/webinar/${w.id}`} className="ad-cartao ad-sessao">
                <div className="ad-sessao-topo">
                  <strong>{w.titulo}</strong>
                  {w.presencasFechadas ? (
                    <span className="ad-etiqueta">presenças fechadas</span>
                  ) : (
                    <span className="ad-etiqueta">ativa</span>
                  )}
                </div>
                {w.tipo === "formacao" && <span className="ad-etiqueta">formação</span>}
                <p className="ad-legenda" style={{ margin: "0.25rem 0 0" }}>
                  {formatarData(w.sessaoExternaEm)}
                </p>

                <div className="ad-numeros-linha">
                  <div>
                    <div className="ad-numero-pequeno">{w.totalInscritos}</div>
                    <div className="ad-legenda">Inscritos</div>
                  </div>
                  <div>
                    <div className="ad-numero-pequeno" style={{ color: COR_PRESENTE }}>
                      {w.presentes}
                      {w.totalInscritos > 0 && (
                        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}> ({pctPresentes}%)</span>
                      )}
                    </div>
                    <div className="ad-legenda">Assistiram</div>
                  </div>
                  <div>
                    <div className="ad-numero-pequeno">
                      {w.mediaAssistencia !== null ? `${w.mediaAssistencia}%` : "—"}
                    </div>
                    <div className="ad-legenda">Média assistência</div>
                  </div>
                </div>

                {w.totalInscritos > 0 && (
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      overflow: "hidden",
                      marginTop: "0.9rem",
                      background: "#e5e5e5",
                    }}
                  >
                    <div
                      style={{ width: `${pctPresentes}%`, height: "100%", background: COR_PRESENTE }}
                    />
                  </div>
                )}

                <p className="ad-legenda" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                  Links: {w.linksObtidos} obtido(s) · {w.linksPendentes} pendente(s) ·{" "}
                  {w.linksFalhados} falhado(s)
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
