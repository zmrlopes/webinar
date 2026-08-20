import Link from "next/link";
import { listarConsultoresAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminConsultores() {
  const consultores = await listarConsultoresAdmin();

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
        .ad-caixa { max-width: 900px; margin: 0 auto; }
        .ad-voltar { color: #d4af37; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-pagina h1 { color: #fff; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-pagina > .ad-caixa > p.ad-subtitulo { color: #b3b0a6; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-tabela-wrap {
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .ad-tabela {
          width: 100%;
          min-width: 620px;
          border-collapse: collapse;
          background: #f7f6f3;
        }
        .ad-tabela th, .ad-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #15130f;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .ad-tabela th {
          color: #6b6a63;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ad-tabela tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Sessões
        </Link>
        <h1>Consultores</h1>
        <p className="ad-subtitulo">
          Quem já gerou o link pelo menos uma vez em /consultor — {consultores.length}{" "}
          {consultores.length === 1 ? "consultor ativo" : "consultores ativos"}.
        </p>

        {consultores.length === 0 ? (
          <p className="ad-legenda">Ainda ninguém gerou o link.</p>
        ) : (
          <div className="ad-tabela-wrap">
            <table className="ad-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Código</th>
                  <th>Inscrições no total</th>
                  <th>Ativo desde</th>
                </tr>
              </thead>
              <tbody>
                {consultores.map((c) => (
                  <tr key={c.referencia}>
                    <td>{c.nome ?? "—"}</td>
                    <td>{c.email}</td>
                    <td>{c.referencia}</td>
                    <td>{c.inscricoesTotais}</td>
                    <td>{formatarData(c.ativoDesde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
