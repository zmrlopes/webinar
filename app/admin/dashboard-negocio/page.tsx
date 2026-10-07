import Link from "next/link";
import { lerConfig } from "@/lib/dashboard-negocio";
import { db } from "@/lib/db";
import type { DadosEventos, MembroEventos } from "@/lib/eventos-dashboard";
import { CoreRankPainel } from "./core-rank-painel";
import { EventosPainel } from "./eventos-painel";
import { IncentivosPainel } from "./incentivos-painel";
import { LinhaDiretaPainel } from "./linha-direta-painel";
import { MapasPainel } from "./mapas-painel";
import { type DadosMapas } from "./mapas-cliente";
import { ObjetivosCliente } from "./objetivos-cliente";
import { TrofeusPainel } from "./trofeus-painel";

export const dynamic = "force-dynamic";

const ABAS = [
  { id: "mapas", label: "Mapas" },
  { id: "objetivos", label: "Objetivos" },
  { id: "eventos", label: "Eventos" },
  { id: "linha-direta", label: "Linha direta" },
  { id: "incentivos", label: "Incentivos" },
  { id: "trofeus", label: "Troféus" },
  { id: "core-rank", label: "Core-rank" },
] as const;

const EM_BREVE: string[] = [];

async function EventosAuditados(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosEventos>("eventos_auditados");
  if (!dados) return <p className="dn-nota">Ainda não há dados de eventos verificados.</p>;
  const { rows } = await db().query<MembroEventos>("select nome, email, upline_email, vendas, estado, data_registo from equipa_afiliados");
  return <EventosPainel dados={dados} equipa={rows} />;
}

async function ObjetivosPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosMapas>("mapas");
  if (!dados)
    return (
      <div
        style={{
          background: "#f7f8f2",
          border: "1px dashed rgba(75,83,32,0.3)",
          borderRadius: 12,
          padding: "2rem",
          textAlign: "center",
          color: "#6b6a63",
          fontSize: "0.9rem",
        }}
      >
        Ainda não há snapshot carregado. Os objetivos usam os mesmos dados dos Mapas.
      </div>
    );
  return <ObjetivosCliente dados={dados} />;
}

/**
 * Dashboard de negócio dentro do painel admin. O separador Eventos cruza
 * inscrições verificadas no MyOffice com a última importação da equipa.
 */
export default async function DashboardNegocio({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}): Promise<React.JSX.Element> {
  const { aba } = await searchParams;
  const ativa = ABAS.some((a) => a.id === aba) ? aba : "mapas";

  return (
    <main className="dn-pagina">
      <style>{`
        .dn-pagina {
          max-width: 960px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          color: #111111;
        }
        .dn-voltar {
          display: inline-block;
          font-size: 0.85rem;
          color: #4b5320;
          text-decoration: none;
          margin-bottom: 1rem;
        }
        .dn-voltar:hover { text-decoration: underline; }
        .dn-pagina h1 { font-size: 1.6rem; margin: 0 0 0.25rem; }
        .dn-cabecalho-sub { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .dn-abas {
          display: flex;
          gap: 1.25rem;
          border-bottom: 1px solid rgba(75, 83, 32, 0.22);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .dn-aba {
          font-size: 0.9rem;
          color: #8a8d80;
          padding-bottom: 0.6rem;
          margin-bottom: -1px;
          text-decoration: none;
        }
        a.dn-aba:hover { color: #111111; }
        .dn-aba.ativa {
          color: #111111;
          font-weight: 700;
          border-bottom: 2px solid #4b5320;
        }
        .dn-aba.desligada { opacity: 0.7; cursor: default; }

        .dn-c { text-align: center; }
        .dn-tabela th.dn-c, .dn-tabela td.dn-c { text-align: center; }
        .dn-sim { color: #0ca30c; font-weight: 700; }
        .dn-nao { color: #cccccc; }
        .dn-nivel { color: #6b6a63; font-weight: 400; font-size: 0.82rem; }
        .dn-trofeus tfoot td { border-top: 2px solid rgba(75, 83, 32, 0.22); border-bottom: none; padding-top: 0.7rem; }

        .dn-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
        .dn-stat {
          background: #ffffff;
          border: 1px solid rgba(75, 83, 32, 0.22);
          border-radius: 12px;
          padding: 0.85rem 1.1rem;
          box-shadow: 0 1px 3px rgba(11, 11, 11, 0.06);
          flex: 1;
          min-width: 180px;
        }
        .dn-stat-v { font-size: 1.6rem; font-weight: 700; }
        .dn-stat-l { font-size: 0.78rem; color: #6b6a63; margin-top: 0.15rem; }
        .dn-stat-delta { font-size: 0.78rem; color: #6b6a63; margin-top: 0.3rem; }
        .dn-stat-delta.sobe { color: #0ca30c; font-weight: 600; }

        .dn-legenda-anos { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.82rem; margin: 0 0 1rem; }
        .dn-legenda-item { display: flex; align-items: center; gap: 0.35rem; color: #333; }
        .dn-swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; box-shadow: inset 0 0 0 1px rgba(75,83,32,0.35); }

        .dn-cartao-chart { padding: 0.9rem 1rem 0.6rem; }
        .dn-chart-titulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #6b6a63; font-weight: 700; margin-bottom: 0.3rem; }
        .dn-chart { display: block; width: 100%; height: auto; }
        .dn-eixo { font-size: 8px; fill: #8a8d80; }
        .dn-linha-corte { stroke: #dcded4; stroke-width: 1; stroke-dasharray: 2 2; }

        .dn-nota { font-size: 0.82rem; color: #6b6a63; line-height: 1.6; margin: 0 0 1.25rem; }

        .dn-destaque {
          background: #eef1e4;
          border: 1px solid rgba(75, 83, 32, 0.22);
          border-radius: 12px;
          padding: 1rem 1.2rem;
          font-size: 1rem;
          line-height: 1.55;
          color: #2f3416;
          margin-bottom: 2rem;
        }

        .dn-h2 { font-size: 1.15rem; margin: 1.75rem 0 0.25rem; }
        .dn-sub { font-size: 0.82rem; color: #6b6a63; margin: 0 0 0.85rem; line-height: 1.5; }

        .dn-cartao {
          background: #ffffff;
          border: 1px solid rgba(75, 83, 32, 0.22);
          border-radius: 14px;
          padding: 0.5rem 1rem;
          box-shadow: 0 1px 3px rgba(11, 11, 11, 0.06);
          margin-bottom: 0.5rem;
          overflow-x: auto;
        }
        .dn-tabela { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .dn-tabela th {
          text-align: left;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #6b6a63;
          font-weight: 700;
          padding: 0.7rem 0.6rem;
          border-bottom: 1px solid rgba(75, 83, 32, 0.18);
        }
        .dn-tabela td { padding: 0.65rem 0.6rem; border-bottom: 1px solid #eeeeee; }
        .dn-tabela tr:last-child td { border-bottom: none; }
        .dn-num { text-align: right; }
        .dn-tabela td.dn-num { text-align: right; font-variant-numeric: tabular-nums; }
        .dn-quando { color: #6b6a63; white-space: nowrap; }

        .dn-celula-barra { display: flex; align-items: center; gap: 0.7rem; }
        .dn-valor { min-width: 78px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .dn-barra { flex: 1; height: 8px; border-radius: 4px; background: #eeeeee; overflow: hidden; min-width: 60px; }
        .dn-barra span { display: block; height: 100%; border-radius: 4px; background: #4b5320; }

        .dn-rodape { font-size: 0.8rem; color: #8a8d80; margin-top: 2rem; line-height: 1.6; }

        .dn-embreve {
          background: #f7f8f2;
          border: 1px dashed rgba(75, 83, 32, 0.3);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          color: #6b6a63;
          font-size: 0.9rem;
        }
      `}</style>

      <Link href="/admin" className="dn-voltar">
        ← Início
      </Link>
      <h1>Dashboard Negócio</h1>
      <p className="dn-cabecalho-sub">
        A tua equipa, em números. Construído por separadores — a começar pelos eventos.
      </p>

      <div className="dn-abas">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={a.id === "mapas" ? "/admin/dashboard-negocio" : `/admin/dashboard-negocio?aba=${a.id}`}
            className={`dn-aba${ativa === a.id ? " ativa" : ""}`}
          >
            {a.label}
          </Link>
        ))}
        {EM_BREVE.map((l) => (
          <span key={l} className="dn-aba desligada">
            {l} (em breve)
          </span>
        ))}
      </div>

      {ativa === "trofeus" ? (
        <TrofeusPainel />
      ) : ativa === "eventos" ? (
        <EventosAuditados />
      ) : ativa === "objetivos" ? (
        <ObjetivosPainel />
      ) : ativa === "linha-direta" ? (
        <LinhaDiretaPainel />
      ) : ativa === "incentivos" ? (
        <IncentivosPainel />
      ) : ativa === "core-rank" ? (
        <CoreRankPainel />
      ) : (
        <MapasPainel />
      )}
    </main>
  );
}
