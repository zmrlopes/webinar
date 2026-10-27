import {validarReservaBF, type ConfiguracaoBF, type InscricaoBF} from "./blackfriday";

/** Demonstração no navegador: nunca é enviada à API nem ao ranking real. */
export function criarReservaSimuladaBF(
  corpo: Record<string, unknown>, config: ConfiguracaoBF, hoje: string,
  existentes: InscricaoBF[], ficheiro: {nome: string; tipo: string; tamanho: number; hash: string},
  identidade: {id: string; email: string; enviadoEm: string},
): InscricaoBF {
  if (!ficheiro.tamanho || ficheiro.tamanho > 3 * 1024 * 1024) throw new Error("Anexa um print ou PDF com até 3 MB.");
  if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(ficheiro.tipo)) throw new Error("Usa um print em PNG, JPG ou WebP, ou um PDF.");
  const reserva = validarReservaBF(corpo, config, hoje);
  const ativas = existentes.filter(i => i.estado !== "recusada");
  if (ativas.some(i => i.casa === reserva.casa)) throw new Error("Esta casa já tem uma reserva enviada.");
  if (ativas.some(i => i.referencia === reserva.referencia || i.hash === ficheiro.hash)) throw new Error("Esta reserva ou este comprovativo já está a preencher outra casa. Cada reserva só pode ser usada uma vez.");
  return {...reserva, ...identidade, nome: "Simulação", estado: "pendente", ficheiroNome: ficheiro.nome,
    ficheiroTipo: ficheiro.tipo, hash: ficheiro.hash, revisoes: []};
}
