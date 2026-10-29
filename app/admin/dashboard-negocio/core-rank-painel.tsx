import { lerConfig } from "@/lib/dashboard-negocio";
import { CoreRankCliente, type DadosCoreRank } from "./core-rank-cliente";
import { CoreRankDiretosPainel } from "./core-rank-diretos-painel";

const VAZIO = {
  background: "#f7f8f2",
  border: "1px dashed rgba(75,83,32,0.3)",
  borderRadius: 12,
  padding: "2rem",
  textAlign: "center" as const,
  color: "#6b6a63",
  fontSize: "0.9rem",
};

export async function CoreRankPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosCoreRank>("core_rank");
  return <>
    <CoreRankDiretosPainel />
    <details style={{ marginTop: "2rem" }}>
      <summary style={{ cursor: "pointer", color: "#4b5320" }}>Histórico trimestral da equipa</summary>
      {dados ? <CoreRankCliente dados={dados} /> : <div style={VAZIO}>Ainda não há dados históricos do Core-rank carregados na base de dados.</div>}
    </details>
  </>;
}
