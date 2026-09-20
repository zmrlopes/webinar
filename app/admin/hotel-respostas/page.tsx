import Link from "next/link";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import {
  csvRespostasHotel,
  listarInscritosSemRespostaHotel,
  listarRespostasHotel,
  PRECO_DUPLO,
  PRECO_SINGLE,
  questionarioHotelPublicado,
} from "@/lib/hotel";
import { BotoesAvisar } from "./botoes-avisar";
import { Exportar } from "./exportar";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function contarNoites(anterior: boolean, seguinte: boolean): number {
  return (anterior ? 1 : 0) + (seguinte ? 1 : 0);
}

export default async function HotelRespostasPagina() {
  const [respostas, semResposta] = await Promise.all([
    listarRespostasHotel(),
    listarInscritosSemRespostaHotel(),
  ]);

  const querem = respostas.filter((r) => r.querQuarto);
  const singles = querem.filter((r) => r.tipoQuarto === "single").length;
  const duplos = querem.filter((r) => r.tipoQuarto === "duplo").length;
  const naoQuerem = respostas.length - querem.length;
  const comCriancas = querem.filter((r) => r.temCriancas).length;

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
        .ad-caixa { max-width: 1100px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #4b5320; font-size: 1.1rem; margin: 2.25rem 0 0.75rem; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-cartao {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 14px;
          padding: 1.1rem 1.25rem;
        }
        .ad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
        .ad-numero { font-size: 1.6rem; font-weight: 800; color: #4b5320; }
        .ad-tabela-wrap { border-radius: 10px; overflow-x: auto; border: 1px solid #e2e0d8; }
        .ad-tabela { width: 100%; min-width: 720px; border-collapse: collapse; background: #f7f6f3; }
        .ad-tabela th, .ad-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          border-bottom: 1px solid #eae7de;
          font-size: 0.88rem;
          vertical-align: top;
        }
        .ad-tabela th {
          color: #6b6a63;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ad-tabela tr:last-child td { border-bottom: none; }
        .ad-pilula {
          display: inline-block;
          background: #eef1e4;
          color: #4b5320;
          border-radius: 999px;
          padding: 0.12rem 0.55rem;
          font-size: 0.78rem;
          margin: 0 0.25rem 0.25rem 0;
        }
        .ad-pilula-cinza { background: #ececE6; color: #6b6a63; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin/eventos/teambuilding" className="ad-voltar">
          ← Teambuilding
        </Link>
        <h1>Quartos do hotel — Aurea Fátima Hotel Congress & Spa</h1>
        <p className="ad-subtitulo">
          {respostas.length} resposta(s) · {querem.length} pediu(pediram) quarto ·{" "}
          {semResposta.length} inscrito(s) ainda por responder.
        </p>

        <BotoesAvisar
          porResponder={semResposta.length}
          publicado={questionarioHotelPublicado()}
          emailDemonstracao={EMAIL_PAINEL_DEMONSTRACAO}
        />

        <h2 style={{ marginTop: 0 }}>Resumo para a reserva</h2>
        <div className="ad-grid">
          <div className="ad-cartao">
            <div className="ad-numero">{singles}</div>
            <div className="ad-legenda">Single ({PRECO_SINGLE}€/noite)</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{duplos}</div>
            <div className="ad-legenda">Duplo/Twin ({PRECO_DUPLO}€/noite)</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{naoQuerem}</div>
            <div className="ad-legenda">Não quer quarto</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{comCriancas}</div>
            <div className="ad-legenda">Quartos com crianças</div>
          </div>
        </div>

        <h2>Respostas</h2>
        <Exportar csv={csvRespostasHotel(respostas)} total={respostas.length} />
        {respostas.length === 0 ? (
          <p className="ad-legenda">Ainda ninguém respondeu.</p>
        ) : (
          <div className="ad-tabela-wrap">
            <table className="ad-tabela">
              <thead>
                <tr>
                  <th>Consultor</th>
                  <th>Quer quarto</th>
                  <th>Tipo</th>
                  <th>Noites</th>
                  <th>Crianças</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((r) => (
                  <tr key={r.email}>
                    <td>
                      {r.nome}
                      <div className="ad-legenda">{r.email}</div>
                    </td>
                    <td>{r.querQuarto ? "Sim" : "Não"}</td>
                    <td>
                      {!r.querQuarto ? (
                        <span className="ad-legenda">—</span>
                      ) : r.tipoQuarto === "single" ? (
                        <span className="ad-pilula">Single</span>
                      ) : r.tipoQuarto === "duplo" ? (
                        <span className="ad-pilula ad-pilula-cinza">Duplo/Twin</span>
                      ) : (
                        <span className="ad-legenda">—</span>
                      )}
                    </td>
                    <td>
                      {!r.querQuarto ? (
                        <span className="ad-legenda">—</span>
                      ) : (
                        <>
                          {r.noiteAnterior && <span className="ad-pilula">13→14 (véspera)</span>}
                          {r.noiteSeguinte && <span className="ad-pilula">14→15 (depois)</span>}
                          {!r.noiteAnterior && !r.noiteSeguinte && (
                            <span className="ad-legenda">nenhuma marcada</span>
                          )}
                          {(r.noiteAnterior || r.noiteSeguinte) && (
                            <div className="ad-legenda">
                              {contarNoites(r.noiteAnterior, r.noiteSeguinte)} noite(s)
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {!r.querQuarto ? (
                        <span className="ad-legenda">—</span>
                      ) : r.temCriancas ? (
                        <span className="ad-pilula">{r.idadesCriancas || "sim (idades não indicadas)"}</span>
                      ) : (
                        <span className="ad-legenda">não</span>
                      )}
                    </td>
                    <td className="ad-legenda">{formatarData(r.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2>Ainda por responder</h2>
        {semResposta.length === 0 ? (
          <p className="ad-legenda">Respondeu toda a gente que está inscrita.</p>
        ) : (
          <div className="ad-cartao">
            {semResposta.map((i) => (
              <div key={i.email} style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>
                {i.nome} <span className="ad-legenda">— {i.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
