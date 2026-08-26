import Link from "next/link";
import {
  EVENTO_DATA_TEXTO,
  EVENTO_LOCAL,
  EVENTO_ORGANIZACOES,
  EVENTO_PRECO_ADULTO,
  EVENTO_TITULO,
  listarInscricoesEvento,
} from "@/lib/eventos";

export const dynamic = "force-dynamic";

const COR_BARRA = "#3a2f77";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function AdminEventos() {
  const inscricoes = await listarInscricoesEvento();

  const porOrganizacao = EVENTO_ORGANIZACOES.map((organizacao) => ({
    organizacao,
    total: inscricoes.filter((i) => i.organizacao === organizacao).length,
  }));
  const maximoOrganizacao = Math.max(1, ...porOrganizacao.map((o) => o.total));

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
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
        .ad-voltar { color: #d4af37; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-pagina h1 { color: #fff; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #d4af37; font-size: 1.1rem; margin: 2rem 0 0.75rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-pagina > .ad-caixa > p.ad-subtitulo { color: #b3b0a6; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-grafico {
          background: #f7f6f3;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .ad-grafico-linha { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.9rem; }
        .ad-grafico-linha:last-child { margin-bottom: 0; }
        .ad-grafico-rotulo { width: 130px; flex: none; color: #15130f; font-size: 0.9rem; }
        .ad-grafico-barra-fundo { flex: 1; height: 20px; background: #eae7de; border-radius: 6px; overflow: hidden; }
        .ad-grafico-barra { height: 100%; background: ${COR_BARRA}; border-radius: 6px; }
        .ad-grafico-numero { width: 28px; flex: none; text-align: right; color: #15130f; font-weight: 700; font-size: 0.9rem; }
        .ad-tabela-wrap {
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .ad-tabela {
          width: 100%;
          min-width: 900px;
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
        .ad-download {
          display: inline-block;
          background: transparent;
          color: #a67c1e;
          border: 1px solid #d8c088;
          border-radius: 8px;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Sessões
        </Link>
        <h1>{EVENTO_TITULO}</h1>
        <p className="ad-subtitulo">
          {EVENTO_DATA_TEXTO} · {EVENTO_LOCAL} · {EVENTO_PRECO_ADULTO}€ por pessoa — {inscricoes.length}{" "}
          {inscricoes.length === 1 ? "inscrição" : "inscrições"}
        </p>

        <h2>Inscrições por organização</h2>
        <div className="ad-grafico">
          {porOrganizacao.map((o) => (
            <div key={o.organizacao} className="ad-grafico-linha">
              <span className="ad-grafico-rotulo">{o.organizacao}</span>
              <div className="ad-grafico-barra-fundo">
                <div
                  className="ad-grafico-barra"
                  style={{ width: `${(o.total / maximoOrganizacao) * 100}%` }}
                />
              </div>
              <span className="ad-grafico-numero">{o.total}</span>
            </div>
          ))}
        </div>

        <h2>Todas as inscrições</h2>
        {inscricoes.length === 0 ? (
          <p className="ad-legenda">Ainda sem inscrições.</p>
        ) : (
          <div className="ad-tabela-wrap">
            <table className="ad-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telemóvel</th>
                  <th>Email</th>
                  <th>Organização</th>
                  <th>Adultos</th>
                  <th>Crianças +10</th>
                  <th>Crianças -10</th>
                  <th>Total</th>
                  <th>Inscrito em</th>
                  <th>Comprovativo</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((i) => (
                  <tr key={i.id}>
                    <td>{i.nome}</td>
                    <td>{i.telemovel}</td>
                    <td>{i.email}</td>
                    <td>{i.organizacao}</td>
                    <td>{i.adultos}</td>
                    <td>{i.criancasMais10}</td>
                    <td>{i.criancasMenos10}</td>
                    <td>{i.totalPagar}€</td>
                    <td>{formatarData(i.criadoEm)}</td>
                    <td>
                      <a href={`/api/admin/eventos/comprovativo/${i.id}`} className="ad-download">
                        Descarregar
                      </a>
                    </td>
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
