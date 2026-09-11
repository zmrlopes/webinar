import Link from "next/link";
import { listarWelcomeAboard } from "@/lib/welcome-aboard";
import { TabelaWelcomeAboard } from "./tabela-welcome-aboard";

export const dynamic = "force-dynamic";

export default async function WelcomeAboardPagina() {
  const itens = await listarWelcomeAboard();

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
        .ad-caixa { max-width: 900px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-tabela-wrap {
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #000000;
        }
        .ad-tabela {
          width: 100%;
          min-width: 560px;
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
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Welcome Aboard</h1>
        <p className="ad-subtitulo">
          Quem está no negócio há menos de 3 meses (pela data de registo do CSV da equipa) — marca aqui
          quando cada um assistir a cada uma das duas sessões obrigatórias. Isto é temporário, até o
          Patrick ligar isto por API do lado dele.
        </p>
        <TabelaWelcomeAboard itens={itens} />
      </div>
    </main>
  );
}
