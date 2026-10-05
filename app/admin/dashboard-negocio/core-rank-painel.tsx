import { lerConfig } from "@/lib/dashboard-negocio";
import { CoreRankCliente, type DadosCoreRank } from "./core-rank-cliente";

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
  if (!dados) return <div style={VAZIO}>Ainda não há dados do Core-rank carregados na base de dados.</div>;
  return <CoreRankCliente dados={dados} />;
}
