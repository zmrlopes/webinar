import Link from "next/link";
import {
  EVENTO_DATA_TEXTO,
  EVENTO_LOCAL,
  EVENTO_PRECO_ADULTO,
  EVENTO_TITULO,
  listarInscricoesEvento,
} from "@/lib/eventos";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function AdminEventos() {
  const inscricoes = await listarInscricoesEvento();
  const totalPessoas = inscricoes.reduce(
    (soma, i) => soma + i.adultos + i.criancasMais10 + i.criancasMenos10,
    0,
  );
  const totalBilhetes = inscricoes.reduce((soma, i) => soma + i.bilhetes.length, 0);
  const totalPresentes = inscricoes.reduce(
    (soma, i) => soma + i.bilhetes.filter((b) => b.presente).length,
    0,
  );

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: -2rem -1.25rem;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #4b5320; font-size: 1.1rem; margin: 2rem 0 0.75rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-pagina > .ad-caixa > p.ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-tabela-wrap {
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #000000;
        }
        .ad-tabela {
          width: 100%;
          min-width: 800px;
          border-collapse: collapse;
          background: #f7f6f3;
        }
        .ad-tabela th, .ad-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #000000;
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
          color: #4b5320;
          border: 1px solid #4b5320;
          border-radius: 8px;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }
        .ad-presenca {
          display: inline-block;
          border-radius: 999px;
          padding: 0.2rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .ad-presenca-sim { background: #e4f3e4; color: #0ca30c; }
        .ad-presenca-nao { background: #eee; color: #999; }
        .ad-bilhetes { display: flex; flex-direction: column; gap: 0.25rem; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Sessões
        </Link>
        <h1>{EVENTO_TITULO}</h1>
        <p className="ad-subtitulo">
          {EVENTO_DATA_TEXTO} · {EVENTO_LOCAL} · {EVENTO_PRECO_ADULTO}€ por pessoa — {totalPessoas}{" "}
          {totalPessoas === 1 ? "pessoa inscrita" : "pessoas inscritas"} · {totalPresentes} de {totalBilhetes}{" "}
          {totalBilhetes === 1 ? "bilhete confirmado" : "bilhetes confirmados"}
        </p>

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
                  <th>Adultos</th>
                  <th>Crianças +10</th>
                  <th>Crianças -10</th>
                  <th>Total</th>
                  <th>Compareceu</th>
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
