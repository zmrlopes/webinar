/**
 * "Destino do dia" — propostas de teste para o cartão de Reservas, pesquisadas
 * manualmente no motor de Operadores do MyOffice, para validar o fluxo
 * "Criar template" com os dados da viagem já preenchidos. Mostra 2 dos
 * destinos abaixo, por rotação diária em Europe/Lisbon — igual à Frase do dia.
 * Os preços e hotéis ficam fixos até serem atualizados com uma nova pesquisa.
 */
import { dadosReservaVazios, hotelVazio, type DadosReserva } from "./reservas";
import { dataLisboa } from "./data-lisboa";

export interface FotoDestinoDia {
  url: string;
  credito: string;
  origem: string;
}

export interface DestinoDiaCard {
  id: string;
  destino: string;
  pais: string;
  hotel: string;
  estrelas: number;
  regime: string;
  partida: string;
  /** ISO yyyy-mm-dd */
  ida: string;
  regresso: string;
  viajantes: number;
  precoPessoa: number;
  precoTotal: number;
  fonte: string;
  /** Fotografia de domínio público/CC0 do Wikimedia Commons, confirmada manualmente. */
  foto: FotoDestinoDia;
}

export const DESTINOS_DIA: DestinoDiaCard[] = [
  {
    id: "punta-cana",
    destino: "Punta Cana",
    pais: "República Dominicana",
    hotel: "Vista Sol Punta Cana Beach Resort & Spa",
    estrelas: 4,
    regime: "Tudo incluído",
    partida: "Lisboa",
    ida: "2026-12-07",
    regresso: "2026-12-14",
    viajantes: 2,
    precoPessoa: 1369,
    precoTotal: 2737,
    fonte: "Motor de Operadores · Travelplan",
    foto: {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Natura_Park_beach%2C_view_towards_the_southeast%2C_Punta_Cana%2C_2004.jpg/1280px-Natura_Park_beach%2C_view_towards_the_southeast%2C_Punta_Cana%2C_2004.jpg",
      credito: "DimiTalen · CC0",
      origem: "https://commons.wikimedia.org/wiki/File:Natura_Park_beach,_view_towards_the_southeast,_Punta_Cana,_2004.jpg",
    },
  },
  {
    id: "cancun",
    destino: "Cancún",
    pais: "México",
    hotel: "Occidental Costa Cancún",
    estrelas: 4,
    regime: "Tudo incluído",
    partida: "Lisboa",
    ida: "2026-12-07",
    regresso: "2026-12-14",
    viajantes: 2,
    precoPessoa: 1528,
    precoTotal: 3055,
    fonte: "Motor de Operadores · Travelplan",
    foto: {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Playa_Delfines.jpg/1280px-Playa_Delfines.jpg",
      credito: "Pikilita1024 · CC0",
      origem: "https://commons.wikimedia.org/wiki/File:Playa_Delfines.jpg",
    },
  },
  {
    id: "sal",
    destino: "Sal",
    pais: "Cabo Verde",
    hotel: "Ouril Julia Hotel",
    estrelas: 3,
    regime: "Por confirmar no orçamento",
    partida: "Lisboa",
    ida: "2026-12-07",
    regresso: "2026-12-14",
    viajantes: 2,
    precoPessoa: 695,
    precoTotal: 1391,
    fonte: "Motor de Operadores · Solférias",
    foto: {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/20240101_123825_beach_near_Santa_Maria%2C_Sal%2C_Cabo_Verde.jpg/1280px-20240101_123825_beach_near_Santa_Maria%2C_Sal%2C_Cabo_Verde.jpg",
      credito: "Tbo47 · CC0",
      origem: "https://commons.wikimedia.org/wiki/File:20240101_123825_beach_near_Santa_Maria,_Sal,_Cabo_Verde.jpg",
    },
  },
  {
    id: "rio-de-janeiro",
    destino: "Rio de Janeiro",
    pais: "Brasil",
    hotel: "Riale Imperial Flamengo",
    estrelas: 3,
    regime: "Por confirmar no orçamento",
    partida: "Lisboa",
    ida: "2026-12-07",
    regresso: "2026-12-14",
    viajantes: 2,
    precoPessoa: 1378,
    precoTotal: 2755,
    fonte: "Motor de Operadores · Solférias",
    foto: {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Copacabana%2C_Rio_de_Janeiro.jpg/1280px-Copacabana%2C_Rio_de_Janeiro.jpg",
      credito: "Wilfredor · CC0",
      origem: "https://commons.wikimedia.org/wiki/File:Copacabana,_Rio_de_Janeiro.jpg",
    },
  },
  {
    id: "salvador",
    destino: "Salvador",
    pais: "Brasil",
    hotel: "Rede Andrade Riviera Premium",
    estrelas: 4,
    regime: "Por confirmar no orçamento",
    partida: "Lisboa",
    ida: "2026-12-07",
    regresso: "2026-12-14",
    viajantes: 2,
    precoPessoa: 1716,
    precoTotal: 3433,
    fonte: "Motor de Operadores · Solférias",
    foto: {
      url: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Farol_da_Barra_Beach_-_Salvador%2C_Brazil.JPG",
      credito: "Hentzer · Domínio público",
      origem: "https://commons.wikimedia.org/wiki/File:Farol_da_Barra_Beach_-_Salvador,_Brazil.JPG",
    },
  },
];

const DIA_MS = 86_400_000;
const INICIO_ROTACAO_DESTINO_DIA = Date.UTC(2026, 10, 12);

/** Escolhe 2 destinos diferentes por dia (Europe/Lisbon), por rotação — igual à Frase do dia. */
export function obterDestinosDoDia(agora = new Date()): DestinoDiaCard[] {
  const data = dataLisboa(agora);
  const [ano, mes, dia] = data.split("-").map(Number);
  const dias = Math.floor((Date.UTC(ano!, mes! - 1, dia!) - INICIO_ROTACAO_DESTINO_DIA) / DIA_MS);
  const n = DESTINOS_DIA.length;
  const indiceA = ((dias % n) + n) % n;
  const indiceB = (indiceA + Math.max(1, Math.floor(n / 2))) % n;
  return [DESTINOS_DIA[indiceA]!, DESTINOS_DIA[indiceB]!];
}

/** Constrói os dados de viagem (destino, datas, hotel e preço) já confirmados a partir do cartão. */
export function dadosReservaDestinoDia(c: DestinoDiaCard): DadosReserva {
  return {
    ...dadosReservaVazios(),
    destino: c.destino,
    partida: c.partida,
    ida: c.ida,
    regresso: c.regresso,
    viajantes: c.viajantes,
    hoteis: [{ ...hotelVazio(), nome: c.hotel, regime: c.regime, total: c.precoTotal, precoPessoa: c.precoPessoa }],
  };
}
