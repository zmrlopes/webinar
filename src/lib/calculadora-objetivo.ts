export const BONUS_TP = 80;
export const PATAMARES_CALCULADORA = [
  { chave: "junior", nome: "Júnior", percentagem: 0, valorPonto: 0 },
  { chave: "senior", nome: "Sénior", percentagem: 1, valorPonto: 2 },
  { chave: "master", nome: "Master", percentagem: 3, valorPonto: 6 },
  { chave: "coordenador", nome: "Coordenador", percentagem: 7, valorPonto: 14 },
  { chave: "diretor", nome: "Diretor", percentagem: 12, valorPonto: 24 },
  { chave: "bronze", nome: "Bronze", percentagem: 16, valorPonto: 32 },
  { chave: "prata", nome: "Prata", percentagem: 19, valorPonto: 38 },
  { chave: "ouro", nome: "Ouro", percentagem: 20, valorPonto: 40 },
] as const;

/** Evita acrescentar uma unidade por erros de precisão junto a um inteiro. */
function arredondarParaCima(valor: number): number {
  const inteiro = Math.round(valor);
  if (inteiro > 0 && Math.abs(valor - inteiro) <= Number.EPSILON * Math.max(1, Math.abs(valor)) * 4) return inteiro;
  return Math.ceil(valor);
}

export function calcularObjetivoComissao(objetivo: number, margem: number, percentagemComissao: number, percentagemTPs: number, valorPonto: number) {
  if (![objetivo, margem, percentagemComissao, percentagemTPs, valorPonto].every(Number.isFinite)
    || objetivo < 0 || margem < 0 || margem > 100 || percentagemComissao < 0 || percentagemComissao > 100
    || percentagemTPs < 0 || percentagemTPs > 100 || !PATAMARES_CALCULADORA.some(p => p.valorPonto === valorPonto)) return null;

  const objetivoTPs = objetivo * (percentagemTPs / 100);
  const objetivoVendas = objetivo * ((100 - percentagemTPs) / 100);
  const taxaVendas = (margem / 100) * (percentagemComissao / 100);
  if (objetivoVendas > 0 && taxaVendas === 0) return null;

  const valorTP = BONUS_TP + valorPonto;
  const tps = arredondarParaCima(objetivoTPs / valorTP);
  // A faturação também sobe ao cêntimo seguinte para atingir a parcela das vendas.
  const faturacao = objetivoVendas > 0 ? arredondarParaCima((objetivoVendas / taxaVendas) * 100) / 100 : 0;
  const comissaoVendas = faturacao * taxaVendas;
  const bonusTPs = tps * BONUS_TP;
  const comissaoPontosTPs = tps * valorPonto;
  const comissaoTPs = bonusTPs + comissaoPontosTPs;
  const total = comissaoVendas + comissaoTPs;
  if (!Number.isSafeInteger(tps) || ![faturacao, comissaoVendas, comissaoTPs, total].every(Number.isFinite)) return null;
  return { objetivoTPs, objetivoVendas, tps, faturacao, comissaoVendas, bonusTPs, comissaoPontosTPs, comissaoTPs, total, valorTP };
}
