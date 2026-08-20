import Link from "next/link";
import { buscarVisaoGeralAdmin, listarWebinarsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminDashboard() {
  const [webinars, visaoGeral] = await Promise.all([
    listarWebinarsAdmin(),
    buscarVisaoGeralAdmin(),
  ]);

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 980px; margin: 0 auto; }
        .ad-pagina h1 { color: #fff; font-size: 1.5rem; margin: 0 0 1.25rem; }
        .ad-kicker {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          font-weight: 700;
          color: #d4af37;
          margin: 0 0 0.75rem;
        }
        .ad-grid-geral {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .ad-grid-sessoes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
        }
        .ad-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
        }
        .ad-numero { font-size: 2rem; font-weight: 800; line-height: 1.1; color: #15130f; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-sessao {
          display: block;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ad-sessao:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }
        .ad-sessao-topo { display: flex; justify-content: space-between; align-items: start; gap: 0.5rem; }
        .ad-cartao-link {
          display: block;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ad-cartao-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }
        .ad-cartao-seta { color: #a67c1e; font-size: 0.8rem; margin-top: 0.35rem; }
        .ad-etiqueta {
          display: inline-block;
          background: #f1e6c9;
          color: #4a3c10;
          border: 1px solid #e2cf94;
          border-radius: 999px;
          padding: 0.15rem 0.65rem;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .ad-numeros-linha { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .ad-numero-pequeno { font-size: 1.3rem; font-weight: 800; }
      `}</style>

      <div className="ad-caixa">
        <p className="ad-kicker">Visão geral</p>
        <div className="ad-grid-geral">
          <div className="ad-cartao">
            <div className="ad-numero">{visaoGeral.inscricoesTotais}</div>
            <div className="ad-legenda">Inscrições no total</div>
          </div>
          <Link href="/admin/consultores" className="ad-cartao ad-cartao-link">
            <div className="ad-numero">{visaoGeral.consultoresAtivos}</div>
            <div className="ad-legenda">Consultores ativos</div>
            <div className="ad-cartao-seta">Ver todos →</div>
          </Link>
        </div>

        <h1>Sessões</h1>

        <div className="ad-grid-sessoes">
          {webinars.map((w) => {
            const pctPresentes =
              w.totalInscritos > 0 ? Math.round((w.presentes / w.totalInscritos) * 100) : 0;

            return (
              <Link key={w.id} href={`/admin/webinar/${w.id}`} className="ad-cartao ad-sessao">
                <div className="ad-sessao-topo">
                  <strong>{w.titulo}</strong>
                  {w.cancelada && <span className="ad-etiqueta">cancelada</span>}
                  {!w.cancelada && w.presencasFechadas && (
                    <span className="ad-etiqueta">presenças fechadas</span>
                  )}
                  {!w.cancelada && !w.presencasFechadas && <span className="ad-etiqueta">ativa</span>}
                </div>
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
                      background: "#eae7de",
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
