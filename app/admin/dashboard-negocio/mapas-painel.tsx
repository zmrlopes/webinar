import { lerConfig } from "@/lib/dashboard-negocio";
import { type DadosMapas, MapasCliente } from "./mapas-cliente";

/**
 * Servidor: lê o snapshot dos Mapas de dashboard_config (os totais próprios do
 * Zé, carregados por /api/admin/dashboard-negocio/config) e entrega-o ao
 * componente de cliente, que replica o separador Mapas do artefacto. Nada de
 * números no código — chegam da base de dados privada.
 */
export async function MapasPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosMapas>("mapas");

  if (!dados) {
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
        Ainda não há snapshot dos Mapas carregado na base de dados. Assim que os totais forem importados, os cartões, os
        gráficos, as projeções e o mapa de comissões aparecem aqui.
      </div>
    );
  }

  return <MapasCliente dados={dados} />;
}
