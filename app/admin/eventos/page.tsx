import Link from "next/link";
import {
  estaoInscricoesAbertas,
  EVENTO_DATA_TEXTO,
  EVENTO_LOCAL,
  EVENTO_TITULO,
  listarInscricoesEvento,
} from "@/lib/eventos";

export const dynamic = "force-dynamic";

/**
 * Lista de eventos. Por agora só existe um (o Teambuilding, com os detalhes
 * todos em constantes — ver src/lib/eventos.ts), mas a página já está
 * organizada como lista para receber os próximos sem mudar de forma.
 */
export default async function AdminEventos() {
  const [inscricoes, inscricoesAbertas] = await Promise.all([
    listarInscricoesEvento(),
    estaoInscricoesAbertas(),
  ]);
  const pessoas = inscricoes.reduce(
    (soma, i) => soma + i.adultos + i.criancasMais10 + i.criancasMenos10,
    0,
  );

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
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.4rem; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .ad-eventos-grelha {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .ad-evento-cartao {
          display: block;
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          color: #000000;
        }
        .ad-evento-cartao:hover { background: #f2f1ec; }
        .ad-evento-titulo { font-size: 1.15rem; font-weight: 700; margin: 0 0 0.3rem; }
        .ad-evento-meta { color: #6b6a63; font-size: 0.9rem; margin: 0 0 0.9rem; }
        .ad-evento-rodape { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .ad-evento-numero { font-weight: 700; font-size: 0.9rem; }
        .ad-estado {
          border-radius: 999px;
          padding: 0.2rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .ad-estado-abertas { background: #e4f3e4; color: #0ca30c; }
        .ad-estado-fechadas { background: #f8e2e0; color: #a33; }
        .ad-evento-seta { margin-left: auto; color: #4b5320; font-size: 0.85rem; font-weight: 700; }
      `}</style>

      <div className="ad-caixa">
        <h1>Eventos</h1>
        <p className="ad-subtitulo">
          Clica num evento para veres as inscrições, os documentos e tudo o resto sobre ele.
        </p>

        <div className="ad-eventos-grelha">
          <Link href="/admin/eventos/teambuilding" className="ad-evento-cartao">
            <p className="ad-evento-titulo">{EVENTO_TITULO}</p>
            <p className="ad-evento-meta">
              {EVENTO_DATA_TEXTO} · {EVENTO_LOCAL}
            </p>
            <div className="ad-evento-rodape">
              <span className="ad-evento-numero">{pessoas} pessoas</span>
              <span className={inscricoesAbertas ? "ad-estado ad-estado-abertas" : "ad-estado ad-estado-fechadas"}>
                {inscricoesAbertas ? "inscrições abertas" : "inscrições encerradas"}
              </span>
              <span className="ad-evento-seta">Abrir →</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
