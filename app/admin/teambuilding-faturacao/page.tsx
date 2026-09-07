import Link from "next/link";
import { listarInscritosComFaturacao } from "@/lib/teambuilding";
import { TabelaFaturacao } from "./tabela-faturacao";

export const dynamic = "force-dynamic";

export default async function TeambuildingFaturacaoPagina() {
  const inscritos = await listarInscritosComFaturacao();

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
        .ad-caixa { max-width: 900px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-tabela-wrap { border-radius: 10px; overflow-x: auto; border: 1px solid #000000; }
        .ad-tabela { width: 100%; min-width: 560px; border-collapse: collapse; background: #f7f6f3; }
        .ad-tabela th, .ad-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #000000;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .ad-tabela th { color: #6b6a63; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .ad-tabela tr:last-child td { border-bottom: none; }
        .ad-sem-dados { color: #6b6a63; font-style: italic; }
        .ad-pagina button.ad-th-ordenar {
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          font: inherit;
          text-transform: inherit;
          letter-spacing: inherit;
          color: inherit;
          font-weight: inherit;
          border-radius: 0;
          cursor: pointer;
          white-space: nowrap;
        }
        .ad-pagina button.ad-th-ordenar:hover { color: #4b5320; }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin/eventos" className="ad-voltar">
          ← Teambuilding
        </Link>
        <h1>Inscritos — patamar e faturação</h1>
        <p className="ad-subtitulo">
          {inscritos.length} inscrito(s). Patamar e faturação vêm do último CSV importado
          (/admin/equipa/importar) — se aparecer &quot;sem dados&quot;, reimporta o CSV mais recente. Clica
          num título de coluna para ordenar por ela.
        </p>

        {inscritos.length === 0 ? (
          <p className="ad-subtitulo">Ainda sem inscrições.</p>
        ) : (
          <TabelaFaturacao inscritos={inscritos} />
        )}
      </div>
    </main>
  );
}
