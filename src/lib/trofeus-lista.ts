/**
 * As listas de troféus, sem nada que toque na base de dados — o formulário
 * do consultor é um componente de cliente e importar daqui evita arrastar o
 * cliente de Postgres para dentro do browser. A lógica toda vive em
 * src/lib/trofeus.ts, que reexporta isto.
 */
export interface Trofeu {
  chave: string;
  rotulo: string;
  /** Versão curta, para tabelas onde o rótulo inteiro não cabe. */
  curto: string;
}

/** Os troféus que se podem pedir. A ordem é a que aparece no formulário. */
export const TROFEUS_QUERO: Trofeu[] = [
  { chave: "patamar-junior", rotulo: "Troféu do patamar Júnior", curto: "Júnior" },
  { chave: "patamar-senior", rotulo: "Troféu do patamar Sénior", curto: "Sénior" },
  { chave: "patamar-master", rotulo: "Troféu do patamar Master", curto: "Master" },
  { chave: "patamar-coordenador", rotulo: "Troféu do patamar Coordenador", curto: "Coordenador" },
  { chave: "patamar-diretor", rotulo: "Troféu do patamar Diretor", curto: "Diretor" },
  { chave: "patamar-bronze", rotulo: "Troféu do patamar Bronze", curto: "Bronze" },
];

/**
 * Os troféus que se podem declarar como já recebidos. Tem dois a mais do
 * que a lista de cima — os de faturação — de propósito: servem para saber
 * quem já os tem, mas não se pedem por aqui.
 */
export const TROFEUS_JA_TENHO: Trofeu[] = [
  { chave: "patamar-junior", rotulo: "Troféu Júnior", curto: "Júnior" },
  { chave: "patamar-senior", rotulo: "Troféu Sénior", curto: "Sénior" },
  { chave: "patamar-master", rotulo: "Troféu Master", curto: "Master" },
  { chave: "patamar-coordenador", rotulo: "Troféu Coordenador", curto: "Coordenador" },
  { chave: "patamar-diretor", rotulo: "Troféu Diretor", curto: "Diretor" },
  { chave: "patamar-bronze", rotulo: "Troféu Bronze", curto: "Bronze" },
  { chave: "faturacao-100k", rotulo: "Troféu de faturação 100K", curto: "100K" },
  { chave: "faturacao-250k", rotulo: "Troféu de faturação 250K", curto: "250K" },
];

/**
 * A ordem dos patamares de troféu, do mais baixo para o mais alto —
 * TROFEUS_QUERO já vem nesta ordem (confirmada com o utilizador: Bronze é
 * o patamar mais alto, apesar de ser o último nome na lista). Usada para
 * saber, dado o patamar atual de alguém, que troféus de patamar ela já
 * devia ter recebido.
 */
const ORDEM_PATAMARES = TROFEUS_QUERO.map((t) => t.chave);

/** "COORDENADOR", "Coordenador ", "coordenador" → "patamar-coordenador". null se não reconhecer. */
export function chaveDoPatamar(nivel: string | null): string | null {
  if (!nivel) return null;
  const normalizado = nivel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
  const chave = `patamar-${normalizado.toLowerCase()}`;
  return ORDEM_PATAMARES.includes(chave) ? chave : null;
}

/**
 * Os troféus de patamar que alguém já devia ter — o seu e todos os
 * abaixo dele — mas que não constam do que declarou em "já tenho" no
 * questionário. É como se cruza o patamar de cada um (vindo do CSV da
 * equipa) com o que a pessoa disse já ter: alguém que chegou a Coordenador
 * mas só marcou o troféu de Júnior está com dois troféus por entregar,
 * mesmo que não os tenha pedido.
 *
 * Devolve null quando não há dados suficientes para responder — patamar
 * desconhecido/não reconhecido, ou a pessoa ainda não respondeu ao
 * questionário (jaTenho null) — para não se confundir "não sabemos" com
 * "não falta nada".
 */
export function trofeusPatamarEmFalta(nivel: string | null, jaTenho: string[] | null): string[] | null {
  const chaveAtual = chaveDoPatamar(nivel);
  if (chaveAtual === null || jaTenho === null) return null;
  const indice = ORDEM_PATAMARES.indexOf(chaveAtual);
  return ORDEM_PATAMARES.slice(0, indice + 1).filter((c) => !jaTenho.includes(c));
}

/**
 * Os troféus de patamar a que alguém tem mesmo direito de pedir: o seu e
 * todos os abaixo dele — não só o seu. Um Master pode legitimamente pedir
 * o de Master, o de Sénior e o de Júnior (confirmado com o utilizador);
 * só quem pede um patamar ACIMA do seu é que está a marcar algo a mais.
 * Mesma regra de null de trofeusPatamarEmFalta: patamar desconhecido não
 * dá para dizer que está errado, dá para dizer "não sabemos".
 */
export function patamaresComDireito(nivel: string | null): string[] | null {
  const chaveAtual = chaveDoPatamar(nivel);
  if (chaveAtual === null) return null;
  const indice = ORDEM_PATAMARES.indexOf(chaveAtual);
  return ORDEM_PATAMARES.slice(0, indice + 1);
}

/**
 * Pontos de qualificação necessários por patamar (confirmado com o
 * utilizador) — Júnior é o ponto de partida, toda a gente começa em 0. O
 * Bronze fica de fora de propósito: é um caso à parte (só um consultor lá
 * está), sem limiar definido.
 */
const LIMIARES_PONTOS: Record<string, number> = {
  "patamar-junior": 0,
  "patamar-senior": 15,
  "patamar-master": 75,
  "patamar-coordenador": 250,
  "patamar-diretor": 1000,
};

export interface ProgressoPatamar {
  pontosNecessarios: number;
  pontosAtuais: number;
  faltam: number;
  percentagem: number;
}

/**
 * Quão perto alguém está de um patamar que pediu no questionário mas
 * ainda não tem direito a pedir (ver patamaresComDireito) — para quem
 * está mesmo quase a lá chegar não ser tratado sempre como um engano a
 * corrigir. null quando não há pontos importados para esta pessoa, ou o
 * patamar não tem limiar definido (Bronze).
 */
export function progressoParaPatamar(
  pontosAtuais: number | null,
  chavePatamar: string,
): ProgressoPatamar | null {
  const pontosNecessarios = LIMIARES_PONTOS[chavePatamar];
  if (pontosAtuais === null || pontosNecessarios === undefined) return null;
  const faltam = Math.max(0, pontosNecessarios - pontosAtuais);
  const percentagem =
    pontosNecessarios === 0 ? 100 : Math.min(100, Math.round((pontosAtuais / pontosNecessarios) * 100));
  return { pontosNecessarios, pontosAtuais, faltam, percentagem };
}

/** Os troféus de faturação e o volume (em euros) que os desbloqueia. */
const LIMIARES_FATURACAO: [chave: string, limiar: number][] = [
  ["faturacao-100k", 100_000],
  ["faturacao-250k", 250_000],
];

/**
 * A mesma ideia de trofeusPatamarEmFalta, mas para faturação: os troféus de
 * faturação que o volume de vendas próprio (do CSV da equipa) diz que a
 * pessoa já atingiu, mas que não constam do que declarou em "já tenho".
 * null quando não há dados para responder — sem valor de vendas, ou a
 * pessoa ainda não respondeu ao questionário.
 */
export function trofeusFaturacaoEmFalta(vendas: number | null, jaTenho: string[] | null): string[] | null {
  if (vendas === null || jaTenho === null) return null;
  return LIMIARES_FATURACAO.filter(([chave, limiar]) => vendas >= limiar && !jaTenho.includes(chave)).map(
    ([chave]) => chave,
  );
}
