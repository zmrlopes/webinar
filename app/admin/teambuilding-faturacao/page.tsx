import Link from "next/link";
import { ultimaImportacaoEquipa } from "@/lib/equipa-import";
import { listarInscritosComFaturacao } from "@/lib/teambuilding";
import { TabelaFaturacao } from "./tabela-faturacao";

export const dynamic = "force-dynamic";

function formatarQuando(data: Date | null): string {
  if (!data) return "nunca";
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function TeambuildingFaturacaoPagina() {
  const [inscritos, ultimaImportacao] = await Promise.all([
    listarInscritosComFaturacao(),
    ultimaImportacaoEquipa(),
  ]);
  const totalAdultos = inscritos.reduce((soma, i) => soma + i.adultos, 0);
  const totalCriancasMais10 = inscritos.reduce((soma, i) => soma + i.criancasMais10, 0);
  const totalCriancasMenos10 = inscritos.reduce((soma, i) => soma + i.criancasMenos10, 0);

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
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-tabela-wrap { border-radius: 10px; overflow-x: auto; border: 1px solid #000000; }
        .ad-tabela { width: 100%; min-width: 1280px; border-collapse: collapse; background: #f7f6f3; }
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
        .ad-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.4rem;
          height: 1.4rem;
          border-radius: 999px;
          font-weight: 800;
          font-size: 0.8rem;
        }
        .ad-badge-tem { background: #e4f3e4; color: #0ca30c; }
        .ad-badge-falta { background: #fdeee0; color: #b3541e; }
        .ad-badge-pedido { background: #e9eaf7; color: #3a2f77; }
        .ad-badge-vazio { color: #d8d6cc; }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin/eventos/teambuilding" className="ad-voltar">
          ← Teambuilding
        </Link>
        <h1>Inscritos — patamar e faturação</h1>
        <p className="ad-subtitulo">
          {inscritos.length} inscrito(s) — {totalAdultos} adulto(s), {totalCriancasMais10} criança(s)
          pagante(s) (+10) e {totalCriancasMenos10} criança(s) não pagante(s) (-10). Clica num título de
          coluna para ordenar por ela.
        </p>
        <p className="ad-subtitulo">
          Patamar e faturação vêm do CSV da equipa, importado pela última vez a{" "}
          <strong>{formatarQuando(ultimaImportacao)}</strong>. Para os atualizar, carrega o CSV mais
          recente em <Link href="/admin/equipa/importar" style={{ color: "#4b5320" }}>/admin/equipa/importar</Link>.
          As últimas colunas, uma por troféu, cruzam o questionário (respondido no painel de cada
          consultor) com o patamar e a faturação própria: <strong className="ad-badge ad-badge-tem">✓</strong>{" "}
          já tem, <strong className="ad-badge ad-badge-falta">!</strong> os dados dizem que já alcançou este
          troféu mas ainda não o declarou como recebido (falta entregar, mesmo sem ter sido pedido),{" "}
          <strong className="ad-badge ad-badge-pedido">○</strong> pediu no questionário mas os dados ainda
          não confirmam, e — quer dizer que ainda não respondeu. A contagem por troféu, para saberes quantos
          encomendar, está em{" "}
          <Link href="/admin/trofeus-respostas" style={{ color: "#4b5320" }}>Troféus a entregar</Link>.
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
