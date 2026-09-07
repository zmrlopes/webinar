import Link from "next/link";
import { listarInscritosSemResposta, listarRespostasTeambuilding } from "@/lib/teambuilding";

export const dynamic = "force-dynamic";

export default async function TeambuildingRespostasPagina() {
  const [respostas, semResposta] = await Promise.all([
    listarRespostasTeambuilding(),
    listarInscritosSemResposta(),
  ]);

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
        .ad-caixa { max-width: 1000px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #4b5320; font-size: 1.1rem; margin: 2rem 0 0.75rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-resposta {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .ad-resposta-email { color: #6b6a63; font-size: 0.8rem; margin: 0 0 0.75rem; }
        .ad-resposta dt { font-weight: 700; font-size: 0.85rem; margin-top: 0.75rem; }
        .ad-resposta dt:first-of-type { margin-top: 0; }
        .ad-resposta dd { margin: 0.25rem 0 0; white-space: pre-wrap; }
        .ad-pendentes { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .ad-etiqueta {
          display: inline-block;
          background: #eef1e4;
          color: #4b5320;
          border: 1px solid #8a9a5b;
          border-radius: 999px;
          padding: 0.2rem 0.75rem;
          font-size: 0.8rem;
        }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Teambuilding — respostas ao formulário</h1>
        <p className="ad-subtitulo">
          {respostas.length} resposta(s) · {semResposta.length} inscrito(s) ainda por responder
        </p>

        <h2>Ainda falta responder ({semResposta.length})</h2>
        {semResposta.length === 0 ? (
          <p className="ad-subtitulo">Toda a gente já respondeu.</p>
        ) : (
          <div className="ad-pendentes">
            {semResposta.map((p) => (
              <span key={p.email} className="ad-etiqueta">
                {p.nome} — {p.email}
              </span>
            ))}
          </div>
        )}

        <h2>Respostas ({respostas.length})</h2>
        {respostas.length === 0 ? (
          <p className="ad-subtitulo">Ainda sem respostas.</p>
        ) : (
          respostas.map((r) => (
            <div className="ad-resposta" key={r.email}>
              <p className="ad-resposta-email">
                {r.email} · {r.criadoEm.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
              </p>
              <dl>
                <dt>O que espera do dia</dt>
                <dd>{r.expectativa}</dd>
                <dt>Formações desejadas</dt>
                <dd>{r.formacoesDesejadas}</dd>
                {r.duvidas && (
                  <>
                    <dt>Dúvidas</dt>
                    <dd>{r.duvidas}</dd>
                  </>
                )}
                {r.outros && (
                  <>
                    <dt>Outros</dt>
                    <dd>{r.outros}</dd>
                  </>
                )}
              </dl>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
