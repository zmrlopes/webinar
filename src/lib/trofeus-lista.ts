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
