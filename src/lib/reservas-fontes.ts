/** Fontes locais: o editor e o PNG usam os mesmos ficheiros, sem dependência de um CDN. */
export const FONTES_RESERVA = [
  {id:"sans",nome:"Arial",familia:"Arial",ficheiros:[]},
  {id:"serif",nome:"Georgia",familia:"Georgia",ficheiros:[]},
  {id:"geometrica",nome:"Montserrat",familia:"ReservaGeometrica",ficheiros:[{url:"Montserrat-Variable.ttf",peso:"100 900"}]},
  {id:"condensada",nome:"Bebas Neue",familia:"ReservaCondensada",ficheiros:[{url:"BebasNeue-Regular.ttf",peso:"400"}]},
  {id:"poppins",nome:"Poppins",familia:"ReservaPoppins",ficheiros:[{url:"Poppins-Regular.ttf",peso:"400"},{url:"Poppins-Bold.ttf",peso:"700"}]},
  {id:"playfair",nome:"Playfair Display",familia:"ReservaPlayfair",ficheiros:[{url:"PlayfairDisplay-Variable.ttf",peso:"400 900"}]},
  {id:"oswald",nome:"Oswald",familia:"ReservaOswald",ficheiros:[{url:"Oswald-Variable.ttf",peso:"200 700"}]},
  {id:"raleway",nome:"Raleway",familia:"ReservaRaleway",ficheiros:[{url:"Raleway-Variable.ttf",peso:"100 900"}]},
  {id:"lora",nome:"Lora",familia:"ReservaLora",ficheiros:[{url:"Lora-Variable.ttf",peso:"400 700"}]},
  {id:"dancing",nome:"Dancing Script",familia:"ReservaDancing",ficheiros:[{url:"DancingScript-Variable.ttf",peso:"400 700"}]},
] as const;
export type FonteReserva = typeof FONTES_RESERVA[number]["id"];
export const fonteReserva = (id:FonteReserva) => FONTES_RESERVA.find(f=>f.id===id) ?? FONTES_RESERVA[0];
export const pesoFonteReserva = (id:FonteReserva,negrito:boolean) => id==="condensada"?400:negrito?id==="geometrica"?800:700:400;
