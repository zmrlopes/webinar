/**
 * "Destino do dia" — propostas de teste para o cartão de Reservas, pesquisadas
 * manualmente no motor de Operadores do MyOffice (Travelplan), para validar o
 * fluxo "Criar template" com os dados da viagem já preenchidos.
 */
import { dadosReservaVazios, hotelVazio, type DadosReserva } from "./reservas";

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
];

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
