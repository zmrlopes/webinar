import type {ConfiguracaoBF} from "./blackfriday";

/** Só o modo de simulação usa uma data dentro do período antes do arranque. */
export function dataSimulacaoBF(config: ConfiguracaoBF, hoje: string) {
  return hoje < config.inicio ? config.inicio : hoje > config.fim ? config.fim : hoje;
}
