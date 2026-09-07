import Link from "next/link";
import { listarConsultoresInscritosEventoPorLider } from "@/lib/admin";
import {
  estaoInscricoesAbertas,
  EVENTO_DATA_TEXTO,
  EVENTO_LOCAL,
  EVENTO_PRECO_ADULTO,
  EVENTO_TITULO,
  listarInscricoesEvento,
} from "@/lib/eventos";
import { BotaoEstadoInscricoes } from "./botao-estado";
import { TabelaInscricoesEvento } from "./tabela-inscricoes-evento";

export const dynamic = "force-dynamic";

export default async function AdminEventos() {
  const [inscricoes, consultoresPorLider, inscricoesAbertas] = await Promise.all([
    listarInscricoesEvento(),
    listarConsultoresInscritosEventoPorLider(),
    estaoInscricoesAbertas(),
  ]);
  const totalAdultos = inscricoes.reduce((soma, i) => soma + i.adultos, 0);
  const totalCriancasMais10 = inscricoes.reduce((soma, i) => soma + i.criancasMais10, 0);
  const totalCriancasMenos10 = inscricoes.reduce((soma, i) => soma + i.criancasMenos10, 0);
  const totalPessoas = totalAdultos + totalCriancasMais10 + totalCriancasMenos10;
  const totalConsultoresPorLider = consultoresPorLider.reduce((soma, l) => soma + l.inscritos, 0);
  const maxConsultoresPorLider = Math.max(1, ...consultoresPorLider.map((l) => l.inscritos));

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
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
        .ad-cartao {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 16px;
          padding: 1.1rem 1.25rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px rgba(0, 0, 0, 0.04);
          max-width: 480px;
        }
        .ad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
          max-width: 720px;
        }
        .ad-grid .ad-cartao { max-width: none; }
        .ad-numero { font-size: 2rem; font-weight: 800; line-height: 1.1; color: #000000; }
        .ad-lider-linha { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
        .ad-lider-etiqueta { flex: 0 0 140px; font-size: 0.85rem; }
        .ad-lider-barra-fundo { flex: 1; height: 10px; border-radius: 5px; background: #eee; overflow: hidden; }
        .ad-lider-barra { height: 100%; background: linear-gradient(90deg, #5d6b2a, #4b5320); }
        .ad-lider-numero { flex: 0 0 auto; font-weight: 700; font-size: 0.85rem; }
      `}</style>

      <div className="ad-caixa">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1>{EVENTO_TITULO}</h1>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <BotaoEstadoInscricoes abertas={inscricoesAbertas} />
            <Link
              href="/consultor/teambuilding?preview=1"
              target="_blank"
              style={{
                display: "inline-block",
                background: "transparent",
                color: "#4b5320",
                border: "1px solid #4b5320",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Pré-visualizar formulário
            </Link>
            <Link
              href="/admin/teambuilding-respostas"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #5d6b2a, #4b5320)",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Respostas ao formulário de preparação
            </Link>
            <Link
              href="/admin/teambuilding-faturacao"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #5d6b2a, #4b5320)",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Patamar e faturação dos inscritos
            </Link>
          </div>
        </div>
        <p className="ad-subtitulo">
          {EVENTO_DATA_TEXTO} · {EVENTO_LOCAL} · {EVENTO_PRECO_ADULTO}€ por pessoa — {totalPessoas}{" "}
          {totalPessoas === 1 ? "pessoa inscrita" : "pessoas inscritas"} · {totalConsultoresPorLider}{" "}
          {totalConsultoresPorLider === 1 ? "consultor" : "consultores"} ·{" "}
          <strong style={{ color: inscricoesAbertas ? "#0ca30c" : "#c0392b" }}>
            {inscricoesAbertas ? "inscrições abertas" : "inscrições encerradas"}
          </strong>
        </p>

        <div className="ad-grid">
          <div className="ad-cartao">
            <div className="ad-numero">{totalAdultos}</div>
            <div className="ad-legenda">Adultos</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{totalCriancasMais10}</div>
            <div className="ad-legenda">Crianças pagantes (+10)</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{totalCriancasMenos10}</div>
            <div className="ad-legenda">Crianças não pagantes (-10)</div>
          </div>
        </div>

        {totalConsultoresPorLider > 0 && (
          <>
            <h2>Consultores inscritos por líder</h2>
            <div className="ad-cartao">
              {consultoresPorLider.map((l) => (
                <div className="ad-lider-linha" key={l.nome}>
                  <span className="ad-lider-etiqueta">{l.nome}</span>
                  <div className="ad-lider-barra-fundo">
                    <div
                      className="ad-lider-barra"
                      style={{ width: `${(l.inscritos / maxConsultoresPorLider) * 100}%` }}
                    />
                  </div>
                  <span className="ad-lider-numero">{l.inscritos}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <h2>Todas as inscrições</h2>
        {inscricoes.length === 0 ? (
          <p className="ad-legenda">Ainda sem inscrições.</p>
        ) : (
          <TabelaInscricoesEvento inscricoes={inscricoes} />
        )}
      </div>
    </main>
  );
}
