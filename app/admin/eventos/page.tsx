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

const CORES_ORGANIZACAO = ["#b8902f", "#3a2f77", "#2f7568", "#a33333"];

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function AdminEventos() {
  const inscricoes = await listarInscricoesEvento();

  let acumulado = 0;
  const porOrganizacao = EVENTO_ORGANIZACOES.map((organizacao, indice) => {
    const total = inscricoes.filter((i) => i.organizacao === organizacao).length;
    const percentagem = inscricoes.length > 0 ? (total / inscricoes.length) * 100 : 0;
    const inicio = acumulado;
    acumulado += percentagem;
    return { organizacao, total, percentagem, inicio, fim: acumulado, cor: CORES_ORGANIZACAO[indice] };
  });
  const gradienteCircular =
    inscricoes.length > 0
      ? `conic-gradient(${porOrganizacao.map((o) => `${o.cor} ${o.inicio}% ${o.fim}%`).join(", ")})`
      : "#eae7de";

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
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
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .ad-circulo-wrap { position: relative; width: 200px; height: 200px; flex: none; }
        .ad-circulo { width: 200px; height: 200px; border-radius: 50%; }
        .ad-circulo-centro {
          position: absolute;
          inset: 32px;
          background: #f7f6f3;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ad-circulo-centro-numero { font-size: 1.8rem; font-weight: 800; color: #15130f; line-height: 1.1; }
        .ad-circulo-centro-legenda { color: #6b6a63; font-size: 0.75rem; margin-top: 0.15rem; }
        .ad-legenda-lista { display: flex; flex-direction: column; gap: 0.6rem; }
        .ad-legenda-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: #15130f; }
        .ad-legenda-ponto { width: 12px; height: 12px; border-radius: 50%; flex: none; }
        .ad-legenda-nome { min-width: 130px; }
        .ad-legenda-numero { font-weight: 700; }
        .ad-legenda-percentagem { color: #6b6a63; font-size: 0.8rem; }
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
          <div className="ad-circulo-wrap">
            <div className="ad-circulo" style={{ background: gradienteCircular }} />
            <div className="ad-circulo-centro">
              <span className="ad-circulo-centro-numero">{inscricoes.length}</span>
              <span className="ad-circulo-centro-legenda">
                {inscricoes.length === 1 ? "inscrição" : "inscrições"}
              </span>
            </div>
          </div>
          <div className="ad-legenda-lista">
            {porOrganizacao.map((o) => (
              <div key={o.organizacao} className="ad-legenda-item">
                <span className="ad-legenda-ponto" style={{ background: o.cor }} />
                <span className="ad-legenda-nome">{o.organizacao}</span>
                <span className="ad-legenda-numero">{o.total}</span>
                <span className="ad-legenda-percentagem">({Math.round(o.percentagem)}%)</span>
              </div>
            ))}
          </div>
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
