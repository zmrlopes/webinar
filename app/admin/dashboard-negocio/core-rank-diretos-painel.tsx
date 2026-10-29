import { lerConfig } from "@/lib/dashboard-negocio";
import type { DadosCoreDiretos } from "@/lib/core-rank-diretos";
import { CoreRankDiretosCliente } from "./core-rank-diretos-cliente";

export async function CoreRankDiretosPainel() {
  const dados = await lerConfig<DadosCoreDiretos>("core_rank_diretos");
  return <CoreRankDiretosCliente dados={dados} />;
}
