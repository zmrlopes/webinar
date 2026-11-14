import { ehContaPilotoNovaArea, podeVerNovaArea } from "./consultor-nova-area";
import { buscarMembroEquipa } from "./equipa";

/** Acesso às APIs da nova área: contas piloto ou qualquer consultor registado na equipa. */
export async function temAcessoNovaArea(email: string): Promise<boolean> {
  const conta = email.trim().toLowerCase();
  if (!podeVerNovaArea(conta)) return false;
  return ehContaPilotoNovaArea(conta) || (await buscarMembroEquipa(conta)) !== null;
}
