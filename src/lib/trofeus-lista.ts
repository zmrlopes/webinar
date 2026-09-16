/**
 * As listas de troféus, sem nada que toque na base de dados — o formulário
 * do consultor é um componente de cliente e importar daqui evita arrastar o
 * cliente de Postgres para dentro do browser. A lógica toda vive em
 * src/lib/trofeus.ts, que reexporta isto.
 */
export interface Trofeu {
  chave: string;
  rotulo: string;
}

/** Os troféus que se podem pedir. A ordem é a que aparece no formulário. */
export const TROFEUS_QUERO: Trofeu[] = [
  { chave: "patamar-junior", rotulo: "Troféu do patamar Júnior" },
  { chave: "patamar-senior", rotulo: "Troféu do patamar Sénior" },
  { chave: "patamar-master", rotulo: "Troféu do patamar Master" },
  { chave: "patamar-coordenador", rotulo: "Troféu do patamar Coordenador" },
  { chave: "patamar-diretor", rotulo: "Troféu do patamar Diretor" },
  { chave: "patamar-bronze", rotulo: "Troféu do patamar Bronze" },
];

/**
 * Os troféus que se podem declarar como já recebidos. Tem dois a mais do
 * que a lista de cima — os de faturação — de propósito: servem para saber
 * quem já os tem, mas não se pedem por aqui.
 */
export const TROFEUS_JA_TENHO: Trofeu[] = [
  { chave: "patamar-junior", rotulo: "Troféu Júnior" },
  { chave: "patamar-senior", rotulo: "Troféu Sénior" },
  { chave: "patamar-master", rotulo: "Troféu Master" },
  { chave: "patamar-coordenador", rotulo: "Troféu Coordenador" },
  { chave: "patamar-diretor", rotulo: "Troféu Diretor" },
  { chave: "patamar-bronze", rotulo: "Troféu Bronze" },
  { chave: "faturacao-100k", rotulo: "Troféu de faturação 100K" },
  { chave: "faturacao-250k", rotulo: "Troféu de faturação 250K" },
];
