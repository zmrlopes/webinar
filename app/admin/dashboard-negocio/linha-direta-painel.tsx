import { lerConfig } from "@/lib/dashboard-negocio";
import { type DadosLinhaDireta, LinhaDiretaCliente } from "./linha-direta-cliente";

const VAZIO = {
  background: "#f7f8f2",
  border: "1px dashed rgba(75,83,32,0.3)",
  borderRadius: 12,
  padding: "2rem",
  textAlign: "center" as const,
  color: "#6b6a63",
  fontSize: "0.9rem",
};

export async function LinhaDiretaPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosLinhaDireta>("linha_direta");
  if (!dados) return <div style={VAZIO}>Ainda não há dados da linha direta carregados na base de dados.</div>;
  return <LinhaDiretaCliente dados={dados} />;
}
