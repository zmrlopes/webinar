import { lerConfig } from "@/lib/dashboard-negocio";
import { CoreRankCliente, type DadosCoreRank } from "./core-rank-cliente";
import { CoreRankDiretosPainel } from "./core-rank-diretos-painel";
import Link from "next/link";
import type { DadosCoreDiretos } from "@/lib/core-rank-diretos";
import { CoreRankDiretosCliente } from "./core-rank-diretos-cliente";

const VAZIO = {
  background: "#f7f8f2",
  border: "1px dashed rgba(75,83,32,0.3)",
  borderRadius: 12,
  padding: "2rem",
  textAlign: "center" as const,
  color: "#6b6a63",
  fontSize: "0.9rem",
};

export async function CoreRankPainel({ vista }: { vista?: string }): Promise<React.JSX.Element> {
  const [dados, grupo] = await Promise.all([lerConfig<DadosCoreRank>("core_rank"), lerConfig<DadosCoreDiretos>("core_rank_grupo")]);
  const mostrarGrupo = vista === "grupo" || (vista !== "diretos" && !!grupo);
  return <>
    <nav aria-label="Vista do Core Rank" style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: "1.25rem" }}>
      <Link href="/admin/dashboard-negocio?aba=core-rank&vista=grupo" aria-current={mostrarGrupo ? "page" : undefined} style={{ color: "#4b5320", fontWeight: mostrarGrupo ? 700 : 400 }}>Grupo Core Rank</Link>
      <Link href="/admin/dashboard-negocio?aba=core-rank&vista=diretos" aria-current={!mostrarGrupo ? "page" : undefined} style={{ color: "#4b5320", fontWeight: !mostrarGrupo ? 700 : 400 }}>Os nossos diretos</Link>
    </nav>
    {mostrarGrupo ? grupo ? <CoreRankDiretosCliente key="grupo" dados={grupo} /> : <p className="dn-nota">Ainda não há uma lista de membros do grupo confirmada.</p> : <CoreRankDiretosPainel />}
    <details style={{ marginTop: "2rem" }}>
      <summary style={{ cursor: "pointer", color: "#4b5320" }}>Histórico trimestral da equipa</summary>
      {dados ? <CoreRankCliente dados={dados} /> : <div style={VAZIO}>Ainda não há dados históricos do Core-rank carregados na base de dados.</div>}
    </details>
  </>;
}
