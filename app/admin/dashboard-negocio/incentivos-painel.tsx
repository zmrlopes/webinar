import { lerConfig } from "@/lib/dashboard-negocio";
import { type DadosIncentivos, IncentivosCliente } from "./incentivos-cliente";

const VAZIO = {
  background: "#f7f8f2",
  border: "1px dashed rgba(75,83,32,0.3)",
  borderRadius: 12,
  padding: "2rem",
  textAlign: "center" as const,
  color: "#6b6a63",
  fontSize: "0.9rem",
};

export async function IncentivosPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosIncentivos>("incentivos");
  if (!dados) return <div style={VAZIO}>Ainda não há dados dos incentivos carregados na base de dados.</div>;
  return <IncentivosCliente dados={dados} />;
}
