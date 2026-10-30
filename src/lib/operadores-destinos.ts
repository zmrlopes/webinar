/**
 * Onde posso vender — destinos autorizados por operador turístico, transcritos
 * das FAQs do Centro de Ajuda iCliGo (help.icligo.com → Suporte operacional →
 * Operadores turísticos → "Que destinos posso reservar com…").
 *
 * As FAQs estão protegidas por login, por isso os dados são mantidos aqui à mão.
 * Ao atualizar, rever a data `atualizado` de cada operador e `REVISTO_EM`.
 * Só é importado pelo servidor (API da nova área), para não ir no bundle do cliente.
 */

export const REVISTO_EM = "30/10/2026";
export const CENTRO_AJUDA = "https://help.icligo.com/suporte-operacional/operadores-turisticos";

export type IdOperador =
  | "newblue-pt" | "newblue-es" | "nortravel" | "solferias" | "soltour" | "soltropico"
  | "travelplan" | "travelplan-es" | "viagens-tempo" | "viajar-tours" | "catai" | "icarion";

export type Tema = "fim-de-ano" | "pascoa" | "carnaval" | "mercados-natal";

export interface Destino {
  id: string;
  nome: string;
  pais: string;
  /** País, arquipélago e regiões — pesquisar um grupo devolve todos os destinos dele. */
  grupos: string[];
  /** Outros nomes, cidades e códigos IATA. */
  termos?: string[];
  /** Destino "guarda-chuva" (ex.: Brasil): as linhas dele valem para todos os destinos do grupo. */
  abrange?: string;
  tema?: Tema;
}

export interface Linha {
  destino: string;
  /** Ex.: "Programação 2027", "Réveillon 2026/27". */
  bloco?: string;
  origem?: string;
  companhia?: string;
  dias?: string;
  periodo?: string;
  detalhe?: string;
  temas?: Tema[];
}

export interface Operador {
  id: IdOperador;
  nome: string;
  /** Integrado no motor de operadores do MyOffice (reserva automática). */
  motor: boolean;
  /** Pagamento inicial (sinal), segundo a FAQ de pagamentos. */
  sinal: string;
  atualizado: string;
  faq: string;
  resumo: string;
  permitido: string[];
  proibido: string[];
  avisos?: string[];
  /** Operadores em que todo o produto do site é autorizado, nestas regiões. */
  todoOSite?: string[];
  linhas: Linha[];
}

const FAQ = (slug: string) => `${CENTRO_AJUDA}/${slug}`;

// ─── Destinos ────────────────────────────────────────────────────────────────

const AL = "América Latina", CAR = "Caraíbas", AFR = "África", IND = "Oceano Índico", ASI = "Ásia", MO = "Médio Oriente", EUR = "Europa", NAF = "Norte de África";

export const DESTINOS: Destino[] = [
  // Caraíbas e América Latina
  { id: "rep-dominicana", nome: "República Dominicana", pais: "República Dominicana", grupos: ["República Dominicana", CAR, AL], termos: ["rep dominicana", "dominicana"], abrange: "República Dominicana" },
  { id: "punta-cana", nome: "Punta Cana", pais: "República Dominicana", grupos: ["República Dominicana", CAR, AL], termos: ["PUJ", "bavaro", "bávaro"] },
  { id: "la-romana", nome: "La Romana", pais: "República Dominicana", grupos: ["República Dominicana", CAR, AL], termos: ["LRM", "bayahibe"] },
  { id: "samana", nome: "Samaná", pais: "República Dominicana", grupos: ["República Dominicana", CAR, AL], termos: ["AZS"] },
  { id: "santo-domingo", nome: "Santo Domingo", pais: "República Dominicana", grupos: ["República Dominicana", CAR, AL], termos: ["SDQ"] },
  { id: "cancun", nome: "Cancún / Riviera Maya", pais: "México", grupos: ["México", CAR, AL], termos: ["CUN", "riviera maya", "playa del carmen", "tulum"] },
  { id: "queretaro", nome: "Querétaro", pais: "México", grupos: ["México", AL], termos: ["QRO"] },
  { id: "montego-bay", nome: "Montego Bay", pais: "Jamaica", grupos: ["Jamaica", CAR, AL], termos: ["MBJ"] },
  { id: "cali", nome: "Cali", pais: "Colômbia", grupos: ["Colômbia", AL], termos: ["CLO"] },
  { id: "cartagena", nome: "Cartagena das Índias", pais: "Colômbia", grupos: ["Colômbia", CAR, AL], termos: ["CTG", "cartagena de indias"] },
  { id: "rosario", nome: "Rosario", pais: "Argentina", grupos: ["Argentina", AL], termos: ["ROS"] },
  { id: "costa-rica", nome: "Costa Rica", pais: "Costa Rica", grupos: ["Costa Rica", AL], termos: ["SJO", "san jose"] },
  { id: "honduras", nome: "Honduras", pais: "Honduras", grupos: ["Honduras", AL], termos: ["XPL", "roatan", "roatán"] },
  { id: "el-salvador", nome: "El Salvador", pais: "El Salvador", grupos: ["El Salvador", AL], termos: ["SAL"] },
  { id: "peru", nome: "Peru", pais: "Peru", grupos: ["Peru", AL], termos: ["machu picchu", "cusco", "lima"] },
  // Brasil
  { id: "brasil", nome: "Brasil", pais: "Brasil", grupos: ["Brasil", AL], termos: ["brazil"], abrange: "Brasil" },
  { id: "salvador", nome: "Salvador da Bahia", pais: "Brasil", grupos: ["Brasil", AL], termos: ["SSA", "bahia", "baia"] },
  { id: "recife", nome: "Recife / Porto de Galinhas", pais: "Brasil", grupos: ["Brasil", AL], termos: ["REC", "porto de galinhas", "joao pessoa", "pernambuco"] },
  { id: "rio", nome: "Rio de Janeiro", pais: "Brasil", grupos: ["Brasil", AL], termos: ["GIG", "angra dos reis", "buzios", "búzios"] },
  { id: "fortaleza", nome: "Fortaleza", pais: "Brasil", grupos: ["Brasil", AL], termos: ["FOR", "ceara", "ceará"] },
  { id: "natal", nome: "Natal", pais: "Brasil", grupos: ["Brasil", AL], termos: ["NAT", "rio grande do norte"] },
  { id: "maceio", nome: "Maceió", pais: "Brasil", grupos: ["Brasil", AL], termos: ["MCZ", "alagoas"] },
  // Cabo Verde e África
  { id: "cabo-verde", nome: "Cabo Verde", pais: "Cabo Verde", grupos: ["Cabo Verde", AFR], termos: ["cape verde"], abrange: "Cabo Verde" },
  { id: "sal", nome: "Ilha do Sal", pais: "Cabo Verde", grupos: ["Cabo Verde", AFR], termos: ["SID", "santa maria"] },
  { id: "boa-vista", nome: "Boa Vista", pais: "Cabo Verde", grupos: ["Cabo Verde", AFR], termos: ["BVC", "boavista"] },
  { id: "sao-vicente", nome: "São Vicente", pais: "Cabo Verde", grupos: ["Cabo Verde", AFR], termos: ["VXE", "mindelo"] },
  { id: "sao-tome", nome: "São Tomé e Príncipe", pais: "São Tomé e Príncipe", grupos: ["São Tomé e Príncipe", AFR], termos: ["TMS", "sao tome", "principe"] },
  { id: "senegal", nome: "Senegal", pais: "Senegal", grupos: ["Senegal", AFR], termos: ["DSS", "dakar", "saly"] },
  { id: "mocambique", nome: "Moçambique", pais: "Moçambique", grupos: ["Moçambique", AFR, IND], termos: ["mozambique", "maputo", "vilanculos"] },
  { id: "safari", nome: "Safaris", pais: "África", grupos: [AFR], termos: ["safari", "quenia", "quénia", "kenya", "tanzania", "tanzânia", "kruger", "africa do sul", "áfrica do sul", "botswana", "namibia", "namíbia", "serengeti", "masai mara"] },
  { id: "zanzibar", nome: "Zanzibar", pais: "Tanzânia", grupos: ["Tanzânia", AFR, IND], termos: ["ZNZ"] },
  // Oceano Índico e Ásia
  { id: "mauricias", nome: "Maurícias", pais: "Maurícias", grupos: ["Maurícias", IND, AFR], termos: ["MRU", "mauricio", "maurício", "mauritius", "ilha mauricia"] },
  { id: "maldivas", nome: "Maldivas", pais: "Maldivas", grupos: ["Maldivas", IND, ASI], termos: ["MLE", "maldives"] },
  { id: "seicheles", nome: "Seicheles", pais: "Seicheles", grupos: ["Seicheles", IND, AFR], termos: ["SEZ", "seychelles"] },
  { id: "tailandia", nome: "Tailândia", pais: "Tailândia", grupos: ["Tailândia", ASI], termos: ["BKK", "banguecoque", "bangkok", "phuket"] },
  { id: "vietname", nome: "Vietname", pais: "Vietname", grupos: ["Vietname", ASI], termos: ["vietnam", "hanoi", "ha long"] },
  { id: "japao", nome: "Japão", pais: "Japão", grupos: ["Japão", ASI], termos: ["japan", "toquio", "tóquio", "quioto"] },
  { id: "india", nome: "Índia", pais: "Índia", grupos: ["Índia", ASI], termos: ["india", "rajastao", "rajastão"] },
  { id: "indonesia", nome: "Indonésia / Bali", pais: "Indonésia", grupos: ["Indonésia", ASI], termos: ["bali", "indonesia"] },
  { id: "sri-lanka", nome: "Sri Lanka", pais: "Sri Lanka", grupos: ["Sri Lanka", ASI, IND], termos: ["ceilao"] },
  { id: "uzbequistao", nome: "Uzbequistão", pais: "Uzbequistão", grupos: ["Uzbequistão", ASI], termos: ["UGC", "TAS", "uzbekistan", "tashkent", "urgench", "samarcanda", "khiva", "bukhara"] },
  { id: "armenia", nome: "Arménia", pais: "Arménia", grupos: ["Arménia", "Cáucaso", ASI], termos: ["EVN", "armenia", "erevan", "yerevan"] },
  { id: "georgia", nome: "Geórgia", pais: "Geórgia", grupos: ["Geórgia", "Cáucaso", ASI], termos: ["TBS", "georgia", "tbilisi"] },
  { id: "jordania", nome: "Jordânia", pais: "Jordânia", grupos: ["Jordânia", MO], termos: ["AMM", "AQJ", "jordania", "petra", "aqaba", "ama", "amã"] },
  { id: "dubai", nome: "Dubai", pais: "Emirados Árabes Unidos", grupos: ["Emirados Árabes Unidos", MO], termos: ["DXB", "emirados", "abu dhabi"] },
  { id: "australia", nome: "Austrália", pais: "Austrália", grupos: ["Austrália", "Oceania"], termos: ["australia", "sydney"] },
  { id: "polinesia", nome: "Polinésia Francesa", pais: "Polinésia Francesa", grupos: ["Polinésia Francesa", "Oceania"], termos: ["bora bora", "tahiti", "taiti"] },
  // Norte de África e Egito
  { id: "tunisia", nome: "Tunísia", pais: "Tunísia", grupos: ["Tunísia", NAF, AFR], termos: ["tunisia"], abrange: "Tunísia" },
  { id: "tunes", nome: "Tunes / Hammamet", pais: "Tunísia", grupos: ["Tunísia", NAF, AFR], termos: ["TUN", "hammamet", "tunis"] },
  { id: "djerba", nome: "Djerba", pais: "Tunísia", grupos: ["Tunísia", NAF, AFR], termos: ["DJE", "jerba"] },
  { id: "monastir", nome: "Monastir", pais: "Tunísia", grupos: ["Tunísia", NAF, AFR], termos: ["MIR", "sousse", "port el kantaoui"] },
  { id: "marrocos", nome: "Marrocos", pais: "Marrocos", grupos: ["Marrocos", NAF, AFR], termos: ["morocco"], abrange: "Marrocos" },
  { id: "saidia", nome: "Saïdia", pais: "Marrocos", grupos: ["Marrocos", NAF, AFR], termos: ["OUD", "saidia", "oujda"] },
  { id: "marraquexe", nome: "Marraquexe", pais: "Marrocos", grupos: ["Marrocos", NAF, AFR], termos: ["RAK", "marrakech", "marraquech"] },
  { id: "fez", nome: "Fez", pais: "Marrocos", grupos: ["Marrocos", NAF, AFR], termos: ["FEZ", "fes"] },
  { id: "egito", nome: "Egito", pais: "Egito", grupos: ["Egito", NAF, AFR, MO], termos: ["egipto", "egypt"], abrange: "Egito" },
  { id: "sharm", nome: "Sharm El-Sheikh", pais: "Egito", grupos: ["Egito", "Mar Vermelho", NAF, AFR], termos: ["SSH", "sharm el sheikh", "sharm"] },
  { id: "hurghada", nome: "Hurghada", pais: "Egito", grupos: ["Egito", "Mar Vermelho", NAF, AFR], termos: ["HRG"] },
  { id: "alamein", nome: "El Alamein", pais: "Egito", grupos: ["Egito", NAF, AFR], termos: ["alamein", "DBB"] },
  { id: "luxor", nome: "Luxor (cruzeiro no Nilo)", pais: "Egito", grupos: ["Egito", NAF, AFR], termos: ["LXR", "nilo", "cruzeiro no nilo"] },
  { id: "assuao", nome: "Assuão", pais: "Egito", grupos: ["Egito", NAF, AFR], termos: ["ASW", "aswan", "assuan"] },
  { id: "cairo", nome: "Cairo / Gizé", pais: "Egito", grupos: ["Egito", NAF, AFR], termos: ["CAI", "SPX", "giza", "gize", "piramides", "pirâmides"] },
  // Portugal ilhas
  { id: "acores", nome: "Açores", pais: "Portugal", grupos: ["Açores", "Portugal"], termos: ["acores", "azores"], abrange: "Açores" },
  { id: "sao-miguel", nome: "São Miguel (Ponta Delgada)", pais: "Portugal", grupos: ["Açores", "Portugal"], termos: ["PDL", "ponta delgada", "sao miguel"] },
  { id: "terceira", nome: "Ilha Terceira", pais: "Portugal", grupos: ["Açores", "Portugal"], termos: ["TER", "angra do heroismo"] },
  { id: "madeira", nome: "Madeira (Funchal)", pais: "Portugal", grupos: ["Madeira", "Portugal"], termos: ["FNC", "funchal"] },
  { id: "porto-santo", nome: "Porto Santo", pais: "Portugal", grupos: ["Madeira", "Portugal"], termos: ["PXO"] },
  // Espanha
  { id: "maiorca", nome: "Maiorca", pais: "Espanha", grupos: ["Baleares", "Espanha", EUR], termos: ["PMI", "mallorca", "palma de maiorca"] },
  { id: "menorca", nome: "Menorca", pais: "Espanha", grupos: ["Baleares", "Espanha", EUR], termos: ["MAH", "minorca"] },
  { id: "ibiza", nome: "Ibiza", pais: "Espanha", grupos: ["Baleares", "Espanha", EUR], termos: ["IBZ", "eivissa"] },
  { id: "formentera", nome: "Formentera", pais: "Espanha", grupos: ["Baleares", "Espanha", EUR] },
  { id: "gran-canaria", nome: "Gran Canária", pais: "Espanha", grupos: ["Canárias", "Espanha", EUR], termos: ["LPA", "gran canaria", "las palmas", "maspalomas"] },
  { id: "tenerife", nome: "Tenerife", pais: "Espanha", grupos: ["Canárias", "Espanha", EUR], termos: ["TFS", "tenerife sul"] },
  { id: "lanzarote", nome: "Lanzarote", pais: "Espanha", grupos: ["Canárias", "Espanha", EUR], termos: ["ACE"] },
  { id: "fuerteventura", nome: "Fuerteventura", pais: "Espanha", grupos: ["Canárias", "Espanha", EUR], termos: ["FUE"] },
  { id: "costa-almeria", nome: "Costa de Almería", pais: "Espanha", grupos: ["Costas Espanholas", "Espanha", EUR], termos: ["LEI", "almeria", "almería"] },
  { id: "costa-dourada", nome: "Costa Dourada", pais: "Espanha", grupos: ["Costas Espanholas", "Espanha", EUR], termos: ["REU", "costa dorada", "salou", "reus"] },
  { id: "costa-luz", nome: "Costa de la Luz", pais: "Espanha", grupos: ["Costas Espanholas", "Espanha", EUR], termos: ["XRY", "costa da luz", "jerez", "cadiz", "cádis"] },
  // Resto da Europa
  { id: "albania", nome: "Albânia", pais: "Albânia", grupos: ["Albânia", "Balcãs", EUR], termos: ["TIA", "albania", "tirana", "saranda", "durres"] },
  { id: "montenegro", nome: "Montenegro", pais: "Montenegro", grupos: ["Montenegro", "Balcãs", EUR], termos: ["TIV", "tivat", "budva"] },
  { id: "veneza", nome: "Veneza", pais: "Itália", grupos: ["Itália", EUR], termos: ["TSF", "treviso", "venice", "venezia"] },
  { id: "creta", nome: "Creta", pais: "Grécia", grupos: ["Grécia", EUR], termos: ["HER", "heraklion", "crete"] },
  { id: "atenas-ilhas", nome: "Atenas, Mykonos e Santorini", pais: "Grécia", grupos: ["Grécia", EUR], termos: ["ATH", "atenas", "mykonos", "miconos", "santorini", "santorinni"] },
  { id: "turquia-capadocia", nome: "Capadócia", pais: "Turquia", grupos: ["Turquia", EUR, ASI], termos: ["NAV", "capadocia", "cappadocia", "nevsehir"] },
  { id: "turquia-circuitos", nome: "Circuitos na Turquia", pais: "Turquia", grupos: ["Turquia", EUR, ASI], termos: ["ESB", "ancara", "istambul", "istanbul"] },
  { id: "disneyland", nome: "Disneyland Paris", pais: "França", grupos: ["França", EUR], termos: ["disney", "disneylandia", "eurodisney", "paris"] },
  // Temas
  { id: "fim-de-ano", nome: "Fim de Ano / Réveillon", pais: "Pacotes temáticos", grupos: [], termos: ["fim do ano", "reveillon", "réveillon", "passagem de ano", "ano novo"], tema: "fim-de-ano" },
  { id: "pascoa", nome: "Páscoa", pais: "Pacotes temáticos", grupos: [], termos: ["pascoa", "semana santa"], tema: "pascoa" },
  { id: "carnaval", nome: "Carnaval", pais: "Pacotes temáticos", grupos: [], tema: "carnaval" },
  { id: "mercados-natal", nome: "Mercados de Natal", pais: "Pacotes temáticos", grupos: [], termos: ["natal", "christmas markets"], tema: "mercados-natal" },
];

// ─── Operadores ──────────────────────────────────────────────────────────────

const NAO_AUTORIZADA = "Se pedires um pacote ou destino não autorizado, o Departamento de Reservas não processa a reserva e o cliente é reembolsado automaticamente.";
const MOTOR = "No motor de operadores do MyOffice podes reservar todos os pacotes que aparecem nos resultados (já validados com voos charter ou especiais).";
const MANUAL = "Fora do motor, a reserva é manual (Suporte → + Novo pedido → Pedido → \"Reservar pacote de operador\"); indica o constrangimento e junta o print do erro.";

type L = [destino: string, origem: string, companhia: string, dias: string, periodo: string, detalhe?: string];
const linhas = (bloco: string, lista: L[], temas?: Tema[]): Linha[] => lista.map(([destino, origem, companhia, dias, periodo, detalhe]) => ({
  destino, bloco, origem: origem || undefined, companhia: companhia || undefined, dias: dias || undefined, periodo: periodo || undefined, detalhe, temas,
}));

const NEWBLUE_ES: L[] = [
  ["cali", "Madrid", "World2fly", "Domingo", "28 mar – 24 out 2027", "7 noites"],
  ["cancun", "Madrid", "World2fly", "Segunda", "29 mar – 25 out 2027", "7 noites"],
  ["punta-cana", "Madrid", "World2fly", "Terça", "30 mar – 26 out 2027", "7 noites"],
  ["rosario", "Madrid", "World2fly", "Terça", "30 mar – 26 out 2027", "7 noites"],
  ["cali", "Madrid", "World2fly", "Quarta", "31 mar – 27 out 2027", "7 noites"],
  ["santo-domingo", "Madrid", "World2fly", "Quinta", "1 abr – 28 out 2027", "7 noites"],
  ["rosario", "Madrid", "World2fly", "Quinta", "1 abr – 28 out 2027", "7 noites"],
  ["punta-cana", "Madrid", "World2fly", "Sábado", "3 abr – 30 out 2027", "7 noites"],
  ["albania", "Madrid", "Iberia", "Terça", "1 jun – 7 set 2027", "7 noites"],
  ["albania", "Madrid", "Iberia", "Sábado", "5 jun – 4 set 2027", "7 noites"],
  ["sao-miguel", "Madrid", "Iberia", "Sábado", "12 jun – 4 set 2027"],
  ["sao-miguel", "Madrid", "Iberia", "Segunda", "14 jun – 6 set 2027"],
  ["sao-miguel", "Madrid", "Iberia", "Quarta", "16 jun – 8 set 2027"],
  ["cancun", "Madrid", "World2fly", "Sábado", "19 jun – 30 out 2027", "7 noites"],
  ["santo-domingo", "Madrid", "World2fly", "Domingo", "20 jun – 24 out 2027", "7 noites"],
  ["cali", "Madrid", "World2fly", "Segunda", "21 jun – 25 out 2027", "7 noites"],
  ["cancun", "Madrid", "World2fly", "Terça", "22 jun – 14 set 2027", "7 noites"],
  ["santo-domingo", "Madrid", "World2fly", "Quarta", "23 jun – 29 set 2027", "7 noites"],
  ["cancun", "Madrid", "World2fly", "Quinta", "24 jun – 2 set 2027", "7 noites"],
  ["punta-cana", "Madrid", "World2fly", "Sexta", "25 jun – 3 set 2027", "7 noites"],
  ["cartagena", "Madrid", "World2fly", "Sexta", "25 jun – 29 out 2027", "7 noites"],
  ["zanzibar", "Madrid", "World2fly", "Sábado", "26 jun – 25 set 2027", "7 noites"],
  ["mauricias", "Madrid", "World2fly", "Domingo", "27 jun – 19 set 2027", "7 noites"],
  ["punta-cana", "Madrid", "World2fly", "Segunda", "28 jun – 25 out 2027", "7 noites"],
  ["sal", "Madrid", "AlbaStar", "Quinta", "29 jun – 31 ago 2027", "7 noites"],
  ["sal", "Bilbau", "Eva Air", "Sexta", "9 jul – 10 set 2027", "7 noites"],
  ["cancun", "Madrid", "World2fly", "Sexta", "2 set – 29 out 2027", "7 noites"],
];

const NEWBLUE_PT: L[] = [
  ["albania", "Lisboa", "easyJet", "Terça", "29 jun – 24 ago 2027", "7 noites · charter"],
  ["albania", "Lisboa", "easyJet", "Sábado", "3 jul – 28 ago 2027", "7 noites · charter"],
  ["cancun", "Lisboa", "World2fly", "Domingo", "14 mar – 31 out 2027", "7 noites · charter"],
  ["punta-cana", "Lisboa", "World2fly", "Segunda", "15 mar – 1 nov 2027", "7 noites · charter"],
  ["sal", "Porto", "easyJet", "Domingo", "9 mai – 30 mai 2027", "7 noites · charter"],
  ["sal", "Porto", "easyJet", "Quarta", "12 mai – 26 mai 2027", "7 noites · charter"],
  ["tunes", "Lisboa", "Tunisair", "Segunda", "31 mai – 18 out 2027", "7 noites · charter"],
  ["montego-bay", "Lisboa", "World2fly", "Quarta", "2 jun – 29 set 2027", "7 noites · charter"],
  ["sal", "Porto", "easyJet", "Quarta", "2 jun – 1 set 2027", "7 noites · charter"],
  ["la-romana", "Lisboa", "World2fly", "Sexta", "4 jun – 1 out 2027", "7 noites · charter"],
  ["menorca", "Lisboa", "TAP", "Sexta", "4 jun – 10 set 2027", "7 noites · voo regular"],
  ["punta-cana", "Lisboa", "World2fly", "Sábado", "5 jun – 30 out 2027", "7 noites · charter"],
  ["menorca", "Porto", "Vueling", "Sábado", "5 jun – 18 set 2027", "7 noites · charter"],
  ["maiorca", "Porto", "Vueling", "Sábado", "5 jun – 18 set 2027", "7 noites · charter"],
  ["saidia", "Porto", "Vueling", "Domingo", "6 jun – 19 set 2027", "7 noites · charter"],
  ["saidia", "Lisboa", "Vueling", "Domingo", "6 jun – 19 set 2027", "7 noites · charter"],
  ["menorca", "Porto", "Vueling", "Domingo", "6 jun – 19 set 2027", "7 noites · charter"],
  ["maiorca", "Porto", "Vueling", "Domingo", "6 jun – 19 set 2027", "7 noites · charter"],
  ["menorca", "Lisboa", "TAP", "Domingo", "6 jun – 12 set 2027", "7 noites · voo regular"],
  ["sal", "Porto", "easyJet", "Domingo", "6 jun – 5 set 2027", "7 noites · charter"],
  ["menorca", "Porto", "Vueling", "Segunda", "7 jun – 6 set 2027", "7 noites · charter"],
  ["maiorca", "Porto", "Vueling", "Segunda", "7 jun – 6 set 2027", "7 noites · charter"],
  ["menorca", "Lisboa", "TAP", "Segunda", "7 jun – 20 set 2027", "7 noites · voo regular"],
  ["sharm", "Porto", "Red Sea Airlines", "Terça", "8 jun – 7 set 2027", "7 noites · charter"],
  ["menorca", "Lisboa", "TAP", "Quarta", "9 jun – 15 set 2027", "7 noites · voo regular"],
  ["menorca", "Lisboa", "TAP", "Quinta", "10 jun – 9 set 2027", "7 noites · voo regular"],
  ["maiorca", "Lisboa", "TAP", "Sábado", "12 jun – 18 jun 2027", "7 noites · voo regular"],
  ["maiorca", "Lisboa", "TAP", "Domingo", "13 jun – 19 set 2027", "7 noites · voo regular"],
  ["djerba", "Porto", "Air Horizont", "Segunda", "14 jun – 6 set 2027", "7 noites · charter"],
  ["maiorca", "Lisboa", "TAP", "Segunda", "14 jun – 13 set 2027", "7 noites · voo regular"],
  ["maiorca", "Lisboa", "TAP", "Terça", "15 jun – 14 set 2027", "7 noites · voo regular"],
  ["zanzibar", "Lisboa", "World2fly", "Quinta", "17 jun – 30 set 2027", "7 noites · charter"],
  ["maiorca", "Lisboa", "TAP", "Quinta", "17 jun – 16 set 2027", "7 noites · voo regular"],
  ["maiorca", "Lisboa", "TAP", "Sexta", "18 jun – 17 set 2027", "7 noites · voo regular"],
  ["albania", "Porto", "Wizz Air", "Domingo", "20 jun – 12 set 2027", "7 noites · charter"],
  ["sharm", "Porto", "Red Sea Airlines", "Terça", "22 jun – 7 set 2027", "7 noites · charter"],
  ["sal", "Porto", "Enter Air", "Domingo", "27 jun – 5 set 2027", "7 noites · charter"],
  ["sal", "Lisboa", "easyJet", "Quinta", "1 jul – 2 set 2027", "7 noites · charter"],
  ["sal", "Lisboa", "easyJet", "Sábado", "3 jul – 4 set 2027", "7 noites · charter"],
  ["sal", "Lisboa", "easyJet", "Terça", "6 jul – 31 ago 2027", "7 noites · charter"],
  ["gran-canaria", "Porto", "Vueling", "Segunda", "19 jul – 6 set 2027", "7 noites · charter"],
  ["menorca", "Porto", "Vueling", "Quarta", "21 jul – 1 set 2027", "7 noites · charter"],
  ["maiorca", "Porto", "Vueling", "Quarta", "21 jul – 1 set 2027", "7 noites · charter"],
  ["fuerteventura", "Porto", "Vueling", "Sexta", "23 jul – 3 set 2027", "7 noites · charter"],
  ["veneza", "Porto", "Vueling", "Terça", "3 ago – 31 ago 2027", "7 noites · charter"],
  ["lanzarote", "Porto", "Vueling", "Terça", "3 ago – 31 ago 2027", "7 noites · charter"],
  ["maiorca", "Porto", "Vueling", "Quinta", "5 ago – 2 set 2027", "7 noites · charter"],
  ["saidia", "Porto", "Vueling", "Sexta", "6 ago – 3 set 2027", "5 noites · charter"],
];

const SOLFERIAS_CHARTER: L[] = [
  ["djerba", "Lisboa", "", "Sábados", "Páscoa: 20/03/27 e 27/03/27"],
  ["djerba", "Lisboa", "", "Sábados", "29/05/27 a 25/09/27"],
  ["djerba", "Lisboa", "", "Segundas", "31/05/27 a 13/09/27"],
  ["djerba", "Porto", "", "Sábados", "29/05/27 a 25/09/27"],
  ["monastir", "Lisboa", "", "Quartas", "02/06/27 a 15/09/27"],
  ["monastir", "Porto", "", "Segundas", "31/05/27 a 13/09/27"],
  ["hurghada", "Lisboa", "", "Quartas", "02/06/27 a 08/09/27"],
  ["hurghada", "Porto", "", "Terças", "08/06/27 a 14/09/27"],
  ["sharm", "Porto", "", "Terças", "22/06/27 a 14/09/27"],
  ["alamein", "Porto", "", "Quartas", "23/06/27 a 15/09/27"],
  ["saidia", "Lisboa", "", "Quintas", "03/06/27 a 16/09/27"],
  ["saidia", "Porto", "", "Sábados", "05/06/27 a 18/09/27"],
  ["senegal", "Lisboa", "", "Sábados", "05/06/27 a 18/09/27"],
  ["senegal", "Porto", "", "Sábados", "05/06/27 a 18/09/27"],
  ["maceio", "Lisboa", "", "Domingos", "25/07/27 a 12/09/27"],
  ["boa-vista", "Lisboa", "", "Sábados", "05/06/27 a 11/09/27"],
  ["boa-vista", "Porto", "", "Sábados", "05/06/27 a 11/09/27"],
  ["sal", "Lisboa", "", "Domingos", "21/03/27 a 30/10/27"],
  ["sal", "Porto", "", "Sábados", "20/03/27 a 30/10/27"],
  ["tunes", "Lisboa", "", "Segundas", "31/05/27 a 25/10/27"],
  ["porto-santo", "Lisboa", "", "Segundas", "31/05/27 a 04/10/27"],
  ["porto-santo", "Porto", "", "Segundas", "31/05/27 a 04/10/27"],
];

const SOLTOUR: L[] = [
  ["maiorca", "Porto", "Air Nostrum", "2ª, 4ª, 5ª, sábado e domingo", "5 jun – 26 set 2027"],
  ["maiorca", "Lisboa", "TAP", "Todos os dias", "5 jun – 2 out 2027"],
  ["ibiza", "Porto", "Vueling", "Sábado", ""],
  ["ibiza", "Lisboa", "TAP", "2ª, 3ª, sábado e domingo", "1 jun – 28 set 2027"],
  ["menorca", "Porto", "Air Nostrum", "2ª, 4ª, sábado e domingo", "5 jun – 26 set 2027"],
  ["menorca", "Lisboa", "TAP", "2ª, 4ª, 5ª e 6ª", "2 jun – 27 set 2027"],
  ["tenerife", "Porto", "Air Nostrum", "3ª", "3 ago – 7 set 2027"],
  ["tenerife", "Lisboa", "TAP", "3ª, sábado e domingo", "1 jun – 3 out 2027"],
  ["lanzarote", "Porto", "Air Nostrum", "3ª", "3 ago – 7 set 2027"],
  ["gran-canaria", "Porto", "Air Nostrum", "2ª", "19 jul – 13 set 2027"],
  ["gran-canaria", "Lisboa", "TAP", "3ª, 6ª e domingo", "1 jun – 31 out 2027"],
  ["fuerteventura", "Porto", "Air Nostrum", "6ª", "23 jul – 10 set 2027"],
  ["costa-almeria", "Porto", "Air Nostrum", "2ª e sábado", "5 jun – 25 set 2027"],
  ["costa-dourada", "Porto", "Air Nostrum", "2ª e 4ª", "7 jun – 13 set 2027"],
  ["costa-luz", "Porto", "Air Nostrum", "6ª", "25 jun – 10 set 2027"],
  ["saidia", "Porto", "Air Nostrum", "6ª e domingo", "6 jun – 26 set 2027"],
  ["saidia", "Lisboa", "Air Nostrum", "Domingo", "6 jun – 26 set 2027"],
  ["djerba", "Porto", "Air Horizont", "2ª", "14 jun – 13 set 2027"],
  ["monastir", "Porto", "Nouvelair", "3ª", "31 mai – 13 set 2027"],
  ["albania", "Porto", "Wizz Air", "Domingo", "20 jun – 12 set 2027"],
  ["albania", "Lisboa", "easyJet", "3ª e sábado", "29 jun – 4 set 2027"],
  ["montenegro", "Porto", "Air Montenegro", "3ª", "17 ago 2027"],
  ["boa-vista", "Porto", "easyJet", "3ª e sábado", "4 mai – 19 out 2027"],
  ["boa-vista", "Lisboa", "easyJet", "3ª", "1 jun – 28 set 2027"],
  ["sal", "Porto", "Enter Air", "Domingo", "27 jun – 12 set 2027"],
  ["sal", "Porto", "easyJet", "2ª e 5ª", "6 mai – 28 out 2027"],
  ["sal", "Lisboa", "easyJet", "4ª e 5ª", "2 jun – 30 set 2027"],
  ["punta-cana", "Lisboa", "Orbest", "2ª", "22 mar – 24 out 2027"],
  ["la-romana", "Lisboa", "Orbest", "3ª", "1 jun – 14 set 2027"],
  ["samana", "Lisboa", "Orbest", "4ª", "2 jun – 8 set 2027", "Exclusivo Soltour"],
  ["cancun", "Lisboa", "Orbest", "Domingo", "21 mar – 24 out 2027"],
];

const SOLTROPICO_2027: L[] = [
  ["sal", "Lisboa", "TAP", "Domingo", "21 mar – 24 out 2027", "Charter · 23 kg porão + 10 kg cabine"],
  ["sal", "Lisboa", "TAP", "Sexta, sábado e domingo", "28 mai – 10 out 2027", "Lugares garantidos · 23 kg + 10 kg"],
  ["sal", "Lisboa", "easyJet", "Sábado", "5 jun – 18 set 2027", "Lugares garantidos · 23 kg + 5 kg"],
  ["sal", "Porto", "TAP", "Domingo", "3 jan – 19 dez 2027", "Lugares garantidos · 23 kg + 10 kg"],
  ["sal", "Porto", "TAP", "Sábado", "20 mar – 23 out 2027", "Lugares garantidos · 23 kg + 10 kg"],
  ["boa-vista", "Lisboa", "easyJet", "Segunda", "31 mai – 4 out 2027", "Lugares garantidos · 23 kg + 5 kg"],
  ["boa-vista", "Porto", "easyJet", "Sábado", "29 mai – 2 out 2027", "Lugares garantidos · 23 kg + 5 kg"],
  ["porto-santo", "Lisboa", "TAP", "Sábado", "5 jun – 11 set 2027", "Lugares garantidos · 23 kg + 10 kg"],
  ["porto-santo", "Lisboa", "TAP", "Domingo", "30 mai – 3 out 2027", "Lugares garantidos · 23 kg + 10 kg"],
  ["porto-santo", "Porto", "TAP", "Sexta", "4 jun – 1 out 2027", "Charter · 23 kg + 10 kg"],
  ["porto-santo", "Porto", "TAP", "Domingo", "6 jun – 3 out 2027", "Charter · 23 kg + 10 kg"],
  ["djerba", "Lisboa", "TAP", "Sábado", "20 mar – 23 out 2027", "Charter · 23 kg + 10 kg"],
  ["djerba", "Lisboa", "TAP", "Sexta", "28 mai – 10 set 2027", "Charter · 23 kg + 10 kg"],
  ["djerba", "Porto", "TAP", "Sábado", "5 jun – 11 set 2027", "Charter · 23 kg + 10 kg"],
  ["djerba", "Porto", "TAP", "Domingo", "6 jun – 12 set 2027", "Charter · 23 kg + 10 kg"],
  ["monastir", "Lisboa", "Nouvelair", "Quarta", "2 jun – 8 set 2027", "Charter · 20 kg + 5 kg"],
  ["monastir", "Porto", "Enter Air", "Quinta", "3 jun – 2 set 2027", "Charter · 20 kg + 5 kg"],
  ["saidia", "Lisboa", "TAP", "Quinta", "3 jun – 9 set 2027", "Charter · 23 kg + 10 kg"],
  ["saidia", "Porto", "Enter Air", "Terça", "8 jun – 14 set 2027", "Charter · 20 kg + 5 kg"],
  ["senegal", "Lisboa", "TAP", "Domingo", "4 jul – 29 ago 2027", "Lugares garantidos · 23 kg + 10 kg"],
];

const SOLTROPICO_REVEILLON: L[] = [
  ["sal", "Lisboa", "TAP", "", "25, 26, 27 e 29 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["sal", "Porto", "TAP", "Domingo", "27 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["boa-vista", "Lisboa", "TAP", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["sao-miguel", "Lisboa", "SATA", "Quarta", "30 dez 2026", "4 noites · 23 kg + 8 kg"],
  ["sao-miguel", "Porto", "SATA", "Quarta", "30 dez 2026", "4 noites · 23 kg + 8 kg"],
  ["terceira", "Lisboa", "SATA", "Quarta", "30 dez 2026", "4 noites · 23 kg + 8 kg"],
  ["madeira", "Lisboa", "TAP", "Segunda", "28 dez 2026", "5 noites · 23 kg + 10 kg"],
  ["madeira", "Lisboa", "TAP", "Terça", "29 dez 2026", "4 noites · 23 kg + 10 kg"],
  ["madeira", "Porto", "Enter Air", "Quarta", "30 dez 2026", "4 noites · 20 kg + 5 kg"],
  ["sao-tome", "Lisboa", "TAP", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["senegal", "Lisboa", "TAP", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["salvador", "Lisboa", "TAP", "Terça", "29 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["natal", "Lisboa", "TAP", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["fortaleza", "Lisboa", "TAP", "", "25, 26, 27 e 28 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["rio", "Lisboa", "TAP", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["rio", "Porto", "TAP", "Terça", "29 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["recife", "Lisboa", "TAP", "", "25, 26, 27 e 28 dez 2026", "7 noites · 23 kg + 10 kg"],
  ["recife", "Porto", "Azul", "Sábado", "26 dez 2026", "7 noites · 23 kg + 10 kg"],
];

const TRAVELPLAN: L[] = [
  ["punta-cana", "Lisboa", "Iberojet", "Segundas", "22 mar – 18 out 2027"],
  ["punta-cana", "Lisboa", "Iberojet", "Terças", "1 jun – 7 set 2027"],
  ["cancun", "Lisboa", "Iberojet", "Domingos", "21 mar – 17 out 2027"],
  ["djerba", "Porto", "Enter Air", "Terças", "8 jun – 7 set 2027"],
  ["djerba", "Porto", "Enter Air", "Sábados", "5 jun – 4 set 2027"],
  ["monastir", "Porto", "Enter Air", "Quintas", "3 jun – 2 set 2027"],
  ["saidia", "Porto", "Enter Air", "Terças", "8 jun – 14 set 2027"],
  ["uzbequistao", "Lisboa", "Iberojet", "Domingo", "6 jun 2027", "Lisboa → Urgench (UGC)"],
  ["creta", "Porto", "Enter Air", "Sábados", "3 jul – 21 ago 2027"],
  ["maiorca", "Porto", "Enter Air", "Segundas", "7 jun – 13 set 2027"],
  ["maiorca", "Lisboa", "TAP", "Segundas", "14 jun – 13 set 2027"],
  ["maiorca", "Lisboa", "TAP", "Terças", "1 jun – 24 ago 2027"],
  ["maiorca", "Lisboa", "TAP", "Quartas", "2 jun – 18 ago 2027"],
  ["maiorca", "Lisboa", "TAP", "Quintas", "3 jun – 19 ago 2027"],
  ["maiorca", "Lisboa", "TAP", "Sábados", "5 jun – 11 set 2027"],
  ["maiorca", "Lisboa", "TAP", "Domingos", "6 jun – 12 set 2027"],
  ["menorca", "Porto", "Enter Air", "Sextas", "11 jun – 10 set 2027"],
  ["menorca", "Lisboa", "TAP", "Segundas", "7 jun – 13 set 2027"],
  ["menorca", "Lisboa", "TAP", "Quartas", "2 jun – 8 set 2027"],
  ["menorca", "Lisboa", "TAP", "Quintas", "3 jun – 9 set 2027"],
  ["menorca", "Lisboa", "TAP", "Sextas", "4 jun – 10 set 2027"],
  ["menorca", "Lisboa", "TAP", "Sábados", "6 jun – 12 set 2027"],
  ["gran-canaria", "Lisboa", "TAP", "Terças", "1 jun – 21 set 2027"],
  ["gran-canaria", "Lisboa", "TAP", "Quintas", "3 jun – 16 set 2027"],
  ["gran-canaria", "Lisboa", "TAP", "Sextas", "4 jun – 17 set 2027"],
  ["gran-canaria", "Lisboa", "TAP", "Domingos", "6 jun – 19 set 2027"],
  ["gran-canaria", "Porto", "Enter Air", "Quartas", "9 jun – 8 set 2027"],
  ["gran-canaria", "Porto", "Enter Air", "Domingos", "1 ago – 15 ago 2027"],
  ["tenerife", "Lisboa", "TAP", "Sábados", "5 jun – 15 set 2027"],
  ["tenerife", "Lisboa", "TAP", "Domingos", "6 jun – 19 ago 2027"],
  ["fuerteventura", "Porto", "Enter Air", "Domingos", "6 jun – 12 set 2027"],
  ["fuerteventura", "Porto", "Enter Air", "Quartas", "4 ago – 18 ago 2027"],
  ["tailandia", "Madrid", "", "Quintas", "Até 7 jan 2027", "Voo direto de Madrid"],
  ["mauricias", "Madrid", "", "Quintas", "24 jun – 16 set 2027", "Voo direto de Madrid"],
  ["queretaro", "Madrid", "", "Quartas", "Até 12 jun 2027", "Voo direto de Madrid"],
  ["queretaro", "Madrid", "", "Sábados", "Até 9 jun 2027", "Voo direto de Madrid"],
  ["costa-rica", "Madrid", "", "Terças", "Até 26 out 2027", "Voo direto de Madrid"],
  ["costa-rica", "Madrid", "", "Quintas", "Até 21 jan 2027 e de 3 jun a 21 out 2027", "Voo direto de Madrid"],
  ["costa-rica", "Madrid", "", "Sábados", "Até 30 out 2027", "Voo direto de Madrid"],
];

const TRAVELPLAN_ES: L[] = [
  ["queretaro", "Madrid", "Iberojet", "Terças", "Até 29 dez 2026"],
  ["queretaro", "Madrid", "Iberojet", "Quartas", "Até 12 jun 2027"],
  ["queretaro", "Madrid", "Iberojet", "Sábados", "Até 9 jun 2027"],
  ["tailandia", "Madrid", "Iberojet", "Quintas", "Até 7 jan 2027"],
  ["mauricias", "Madrid", "Iberojet", "Quintas", "24 jun – 16 set 2027"],
  ["costa-rica", "Madrid", "Iberojet", "Terças", "Até 26 out 2027"],
  ["costa-rica", "Madrid", "Iberojet", "Quintas", "Até 11 fev 2027 e de 3 jun a 21 out 2027"],
  ["costa-rica", "Madrid", "Iberojet", "Sábados", "Até 30 jan 2027 e de 10 abr a 30 out 2027"],
  ["costa-rica", "Madrid", "Iberojet", "Domingos", "7 fev a 28 mar 2027"],
  ["honduras", "Madrid", "Iberojet", "Terças", "Até 15 jun 2027"],
  ["honduras", "Madrid", "Iberojet", "Sábados", "Até 12 jun 2027"],
  ["honduras", "Madrid", "Iberojet", "Domingos", "20 dez 2026 – 3 jan 2027"],
  ["honduras", "Barcelona", "Iberojet", "Quartas", "Até 8 jun 2027"],
  ["el-salvador", "Madrid", "Iberojet", "Domingos", "Até 13 jun 2027"],
  ["el-salvador", "Barcelona", "Iberojet", "Terças", "Até 15 jun 2027"],
  ["uzbequistao", "Madrid", "Iberojet", "Domingos", "16 e 30 mai, 3, 17 e 31 out 2027", "Madrid → Tashkent (TAS)"],
  ["uzbequistao", "Madrid", "Iberojet", "Domingos", "9 e 23 mai, 26 set e 24 out 2027", "Madrid → Urgench (UGC)"],
  ["uzbequistao", "Barcelona", "Iberojet", "Domingo", "2 mai 2027", "Barcelona → Tashkent (TAS)"],
  ["uzbequistao", "Saragoça", "Iberojet", "Domingo", "10 out 2027", "Saragoça → Urgench (UGC)"],
  ["uzbequistao", "Palma", "Iberojet", "Domingo", "7 nov 2027", "Palma → Urgench (UGC)"],
  ["luxor", "Bilbau", "", "Segundas", "Até 28 dez 2026, 22 fev – 26 abr e 2 ago – 27 dez 2027"],
  ["luxor", "Málaga", "", "Segundas", "Até 27 dez 2027"],
  ["luxor", "Valência", "", "Segundas", "Até 27 dez 2027"],
  ["luxor", "Madrid", "", "Segundas", "Até 25 dez 2027"],
  ["luxor", "Barcelona", "", "Segundas", "Até 28 dez 2026, 3 jan – 26 abr e 2 ago – 27 dez 2027"],
  ["luxor", "Madrid", "", "Sábados", "Até 27 dez 2027"],
  ["luxor", "Barcelona", "", "Sábados", "Até 25 dez 2027"],
  ["assuao", "Madrid", "", "Sextas", "Até 31 dez 2027"],
  ["cairo", "Saragoça", "", "Domingos", "6 dez 2026, 4 abr e 5 dez 2027", "Egito províncias"],
  ["cairo", "Santiago de Compostela", "", "Domingos", "28 fev e 31 out 2027", "Egito províncias"],
  ["cairo", "Badajoz", "", "Domingo", "1 nov 2026", "Egito províncias"],
  ["cairo", "Palma", "", "Domingo", "8 nov 2026", "Egito províncias"],
  ["cairo", "Granada", "", "Domingos", "15 nov 2026 e 17 out 2027", "Egito províncias"],
  ["cairo", "León", "", "Domingos", "22 nov 2026 e 10 out 2027", "Egito províncias"],
  ["cairo", "Pamplona", "", "Domingos", "29 nov 2026 e 28 nov 2027", "Egito províncias"],
  ["cairo", "Valladolid", "", "Domingo", "7 mar 2027", "Egito províncias"],
  ["cairo", "Oviedo", "", "Domingo", "14 mar 2027", "Egito províncias"],
  ["cairo", "Ciudad Real", "", "Domingos", "28 mar e 19 set 2027", "Egito províncias"],
  ["cairo", "Valência", "", "Domingo", "11 abr 2027", "Egito províncias"],
  ["cairo", "Málaga", "", "Domingos", "21 fev e 7 nov 2027", "Egito províncias"],
  ["cairo", "Alicante", "", "Domingo", "26 set 2027", "Egito províncias"],
  ["cairo", "Burgos", "", "Domingo", "3 out 2027", "Egito províncias"],
  ["cairo", "Sevilha", "", "Domingo", "14 nov 2027", "Egito províncias"],
  ["cairo", "Salamanca", "", "Domingo", "21 nov 2027", "Egito províncias"],
  ["cairo", "Madrid", "", "Domingo", "21 mar 2027", "Egito províncias · Madrid → Sphinx (SPX)"],
  ["turquia-capadocia", "Palma", "Alba Star", "Segunda", "2 nov 2026"],
  ["turquia-circuitos", "Madrid", "Alba Star", "Domingos", "1 nov 2026 – 21 mar 2027", "Madrid → Ancara (ESB)"],
  ["marraquexe", "Palma", "Alba Star", "Sábado", "27 fev 2027"],
  ["marraquexe", "Badajoz", "Alba Star", "Sábado", "13 mar 2027"],
  ["marraquexe", "Bilbau", "Alba Star", "Sábado", "27 mar 2027"],
  ["marraquexe", "Múrcia", "Alba Star", "Sábado", "10 abr 2027"],
  ["fez", "Pamplona", "Alba Star", "Sábado", "6 mar 2027"],
  ["fez", "Salamanca", "Alba Star", "Sábado", "20 mar 2027"],
  ["fez", "Santiago de Compostela", "Alba Star", "Sábado", "3 abr 2027"],
  ["fez", "Oviedo", "Alba Star", "Sábado", "17 abr 2027"],
  ["armenia", "Madrid", "", "Domingo", "13 jun 2027"],
  ["armenia", "Saragoça", "", "Domingo", "5 set 2027"],
  ["armenia", "Santiago de Compostela", "", "Domingo", "19 set 2027"],
  ["georgia", "Madrid", "", "Domingo", "12 set 2027"],
  ["sal", "Madrid", "Iberojet", "Sextas", "18 jun – 17 set 2027 (todas as sextas)"],
  ["sal", "Bilbau", "Iberojet", "Sextas", "9 jul – 10 set 2027 (todas as sextas)"],
  ["boa-vista", "Madrid", "Iberojet", "Quartas", "16 jun – 1 set 2027 (todas as quartas)"],
  ["senegal", "Madrid", "Iberojet", "Quintas", "10 jun – 9 set 2027 (todas as quintas)"],
  ["senegal", "Madrid", "Iberojet", "Sexta", "16 set 2027"],
  ["jordania", "Madrid", "Iberojet", "Domingos", "17 e 31 out, 14 nov e 12 dez 2027", "Madrid → Aqaba (AQJ)"],
  ["jordania", "Santiago de Compostela", "Iberojet", "Domingo", "26 set 2027", "→ Amã (AMM)"],
  ["jordania", "Granada", "Iberojet", "Domingo", "3 out 2027", "→ Aqaba (AQJ)"],
  ["jordania", "Vitoria", "Iberojet", "Domingo", "10 out 2027", "→ Amã (AMM)"],
  ["jordania", "León", "Iberojet", "Domingo", "24 out 2027", "→ Amã (AMM)"],
  ["jordania", "Saragoça", "Iberojet", "Domingo", "7 nov 2027", "→ Amã (AMM)"],
  ["jordania", "Málaga", "Iberojet", "Domingo", "21 nov 2027", "→ Amã (AMM)"],
  ["jordania", "Valência", "Iberojet", "Domingo", "28 nov 2027", "→ Aqaba (AQJ)"],
  ["jordania", "Palma", "Iberojet", "Domingo", "5 dez 2027", "→ Amã (AMM)"],
];

const VT_FIM_DE_ANO: L[] = [
  ["salvador", "Lisboa", "TAP", "", "27 dez 2026", "5177 Salvador Cidade · 5598 Salvador Praias · 5596 Salvador + Praia (7 noites)"],
  ["recife", "Lisboa", "TAP", "", "25, 26 e 28 dez 2026", "5176 Porto de Galinhas · 5616 Recife · 5595 João Pessoa · 5687 Porto de Galinhas (voo noturno) (7 noites)"],
  ["boa-vista", "Lisboa", "TAP", "", "29 dez 2026", "5319 Ilha da Boavista · 5320 SELECTION! Ilha da Boavista (7 noites)"],
  ["sao-vicente", "Lisboa", "TAP", "", "26 e 27 dez 2026", "5674 São Vicente (7 noites)"],
  ["madeira", "Lisboa", "TAP", "", "28, 29 e 30 dez 2026", "5179 Funchal (4 noites)"],
  ["madeira", "Porto", "TAP", "", "28, 29 e 30 dez 2026", "5180 Funchal (4 noites)"],
];
const VT_CARNAVAL: L[] = [
  ["salvador", "Lisboa", "TAP", "", "6 fev 2027", "5708 Salvador Cidade · 5706 Salvador + Praia · 5709 Praias de Salvador (7 noites)"],
  ["recife", "Lisboa", "TAP", "", "6 fev 2027", "5703 Porto de Galinhas · 5704 Recife · 5705 João Pessoa (7 noites)"],
  ["rio", "Lisboa", "TAP", "", "6 fev 2027", "5699 Rio de Janeiro · 5701 Rio e Angra dos Reis · 5702 Rio e Búzios (7 noites)"],
  ["boa-vista", "Lisboa", "TAP", "", "6 fev 2027", "5712 Ilha da Boavista (7 noites)"],
  ["sal", "Lisboa", "TAP", "", "6 fev 2027", "5710 Ilha do Sal (7 noites)"],
];
const VT_PASCOA: L[] = [
  ["salvador", "Lisboa", "TAP", "", "20 e 27 mar 2027", "5229 Salvador Cidade · 5649 Praias de Salvador · 5221 Salvador + Praia (7 noites)"],
  ["recife", "Lisboa", "TAP", "", "20 e 27 mar 2027", "5442 Porto de Galinhas · 5714 Recife · 5715 João Pessoa (7 noites) · 5716/5717/5718 (8 noites)"],
  ["boa-vista", "Lisboa", "TAP", "", "20 e 27 mar 2027", "5447 Ilha da Boavista (7 noites)"],
  ["sal", "Lisboa", "TAP", "", "20 e 27 mar 2027", "5222 Ilha do Sal (7 noites)"],
];

export const OPERADORES: Operador[] = [
  {
    id: "newblue-pt", nome: "Newblue Portugal", motor: true, sinal: "35% (voos charter)", atualizado: "30/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-newblue-portugal"),
    resumo: "Programação 2027 com partidas de Lisboa e Porto.",
    permitido: [MOTOR, "Manual: apenas a programação 2027 indicada (desde Lisboa / Porto)."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    avisos: ["Podem existir exceções — confirma sempre na confirmação da reserva."],
    linhas: linhas("Programação 2027", NEWBLUE_PT),
  },

  {
    id: "nortravel", nome: "Nortravel", motor: true, sinal: "40% (voos charter)", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-nortravel"),
    resumo: "Circuitos Exclusivos, Voos Especiais e algumas praias.",
    permitido: [MOTOR, "Todos os pacotes do separador \"Circuitos Exclusivos\".", "Todos os pacotes do separador \"Voos Especiais\".", "Madeira & Açores: só os Circuitos Exclusivos.", "Praias: Brasil (Fim de Ano 2026/27), Cabo Verde (Boa Vista e Sal) e Porto Santo."],
    proibido: ["Circuitos Regulares.", "Estadias e Combinados.", "Special Tours.", "Outros produtos fora da programação autorizada."],
    linhas: [
      { destino: "brasil", bloco: "Separador Praias", detalhe: "Brasil — pacotes de Fim de Ano 2026/27", temas: ["fim-de-ano"] },
      { destino: "boa-vista", bloco: "Separador Praias", detalhe: "Cabo Verde — Ilha da Boa Vista" },
      { destino: "sal", bloco: "Separador Praias", detalhe: "Cabo Verde — Ilha do Sal" },
      { destino: "porto-santo", bloco: "Separador Praias", detalhe: "Porto Santo" },
      { destino: "madeira", bloco: "Separador Madeira & Açores", detalhe: "Apenas Circuitos Exclusivos" },
      { destino: "acores", bloco: "Separador Madeira & Açores", detalhe: "Apenas Circuitos Exclusivos" },
    ],
  },
  {
    id: "solferias", nome: "Solférias", motor: true, sinal: "40%", atualizado: "30/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-solferias"),
    resumo: "Operação regular para vários destinos de longo curso, charters 2027 e pacotes especiais.",
    permitido: [MOTOR, "Operação regular: Brasil, Cabo Verde, Egito, Maldivas, Maurícias, Moçambique, Safaris, São Tomé e Príncipe, Seicheles, Senegal e Zanzibar (com combinados onde indicado).", "Todos os pacotes de Fim de Ano e de Páscoa (nacional e internacional).", "Disneyland Paris (campanha e hotéis parceiros).", "Charters 2027 e pacotes especiais com lugares garantidos."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: [
      ...["brasil", "cabo-verde", "egito", "mocambique", "sao-tome", "senegal"].map(destino => ({ destino, bloco: "Operação regular", detalhe: "Podes reservar em operação regular" })),
      ...["maldivas", "mauricias", "safari", "seicheles", "zanzibar"].map(destino => ({ destino, bloco: "Operação regular", detalhe: "Podes reservar em operação regular (e combinados)" })),
      { destino: "fim-de-ano", bloco: "Pacotes temáticos", detalhe: "Todos os pacotes de Fim de Ano (nacional e internacional)" },
      { destino: "pascoa", bloco: "Pacotes temáticos", detalhe: "Todos os pacotes de Páscoa (nacional e internacional)" },
      { destino: "disneyland", bloco: "Disneyland Paris", detalhe: "Campanha e Hotéis Parceiros: Alojamento + Serviços, Alojamento sem transfer ou Programa com Avião" },
      ...linhas("Charters 2027", SOLFERIAS_CHARTER).map(l => l.periodo?.startsWith("Páscoa") ? { ...l, temas: ["pascoa" as Tema] } : l),
      ...linhas("Pacotes especiais (lugares garantidos)", [
        ["gran-canaria", "Lisboa", "TAP", "", "", "Lugares garantidos TAP"],
        ["lanzarote", "Funchal", "Binter", "", "", "Lugares garantidos Binter"],
        ["fuerteventura", "Funchal", "Binter", "", "", "Lugares garantidos Binter"],
        ["tenerife", "Funchal", "Binter", "", "", "Tenerife Sul · lugares garantidos Binter"],
        ["menorca", "Lisboa", "TAP", "", "", "Lugares garantidos TAP"],
        ["maiorca", "Lisboa", "TAP", "", "", "Lugares garantidos TAP"],
        ["ibiza", "Lisboa", "TAP", "", "", "Lugares garantidos TAP"],
        ["formentera", "Lisboa", "TAP", "", "", "Lugares garantidos TAP"],
        ["tunes", "Lisboa", "", "", "", "Voo direto Lisboa → Tunes · lugares garantidos"],
        ["atenas-ilhas", "", "TAP", "", "", "Atenas, Mykonos e Santorini · lugares garantidos TAP"],
      ]),
    ],
  },
  {
    id: "soltour", nome: "Soltour Portugal", motor: false, sinal: "35% (voos charter)", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-na-soltour-portugal"),
    resumo: "Programação aérea 2027 e voos próprios da Soltour. Ainda não está no motor.",
    permitido: ["Reserva sempre manual (formulário).", "Programação aérea 2027 indicada.", "Todos os voos marcados no site com os símbolos \"Voo Soltour directo desde Madrid\", \"Voo Soltour com escalas\" ou \"Voo direto de Soltour\"."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: linhas("Programação aérea 2027", SOLTOUR),
  },
  {
    id: "soltropico", nome: "Soltrópico", motor: false, sinal: "40% (voos charter)", atualizado: "22/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-soltropico"),
    resumo: "Voos charter e lugares garantidos 2027 e Réveillon 2026/27. Ainda não está no motor.",
    permitido: ["Reserva sempre manual (formulário).", "Voos charter (C) e lugares garantidos (LG) 2027.", "Pacotes de Réveillon 2026/27 indicados."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: [...linhas("Voos charter e lugares garantidos 2027", SOLTROPICO_2027), ...linhas("Réveillon 2026/27", SOLTROPICO_REVEILLON, ["fim-de-ano"])],
  },
  {
    id: "travelplan", nome: "Travelplan", motor: true, sinal: "35% (voos charter)", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-travelplan"),
    resumo: "Programação 2026/27 desde Lisboa, Porto e voos diretos de Madrid.",
    permitido: [MOTOR, "Manual: apenas a programação 2026/2027 indicada."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    avisos: ["Nas Caraíbas, indica sempre os nomes completos dos passageiros."],
    linhas: linhas("Programação 2026/27", TRAVELPLAN),
  },

  {
    id: "viajar-tours", nome: "Viajar Tours", motor: false, sinal: "40% (voos charter)", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-viajar-tours"),
    resumo: "Fim de Ano, Carnaval e Páscoa com lugares em garantia TAP. Ainda não está no motor.",
    permitido: ["Reserva sempre manual (formulário).", "Pacotes de voos charter ou especiais de Fim de Ano, Carnaval e Páscoa.", "Todos os pacotes de Fim de Ano 2026/2027."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: [
      { destino: "fim-de-ano", bloco: "Pacotes temáticos", detalhe: "Todos os pacotes de Fim de Ano 2026/2027" },
      ...linhas("Fim de Ano 2026/27 · lugares em garantia TAP", VT_FIM_DE_ANO, ["fim-de-ano"]),
      ...linhas("Carnaval 2027 · lugares em garantia TAP", VT_CARNAVAL, ["carnaval"]),
      ...linhas("Páscoa 2027 · lugares em garantia TAP", VT_PASCOA, ["pascoa"]),
    ],
  },
  {
    id: "viagens-tempo", nome: "Viagens Tempo", motor: false, sinal: "50%", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-viagens-tempo"),
    resumo: "Safaris, Fim de Ano e Mercados de Natal. Ainda não está no motor.",
    permitido: ["Reserva sempre manual (formulário).", "Todos os Safaris do separador \"África\".", "Todos os pacotes do separador \"Fim de Ano\".", "Todos os pacotes do separador \"Mercados de Natal\"."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: [
      { destino: "safari", bloco: "Separador África", detalhe: "Todos os Safaris" },
      { destino: "fim-de-ano", bloco: "Separador Fim de Ano", detalhe: "Todos os pacotes" },
      { destino: "mercados-natal", bloco: "Separador Mercados de Natal", detalhe: "Todos os pacotes" },
    ],
  },
  {
    id: "newblue-es", nome: "Newblue Espanha", motor: true, sinal: "35% (voos charter)", atualizado: "30/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-newblue-espanha"),
    resumo: "Programação 2027 com partidas de Madrid e Bilbau.",
    permitido: [MOTOR, "Manual: todos os pacotes com voos charter ou especiais 2027 (desde Madrid / Bilbau)."],
    proibido: ["Pacotes dinâmicos.", "O motor \"Voo + Hotel\" da Newblue."],
    avisos: ["Para juntar um voo de ligação ao produto charter, submete o pedido manualmente."],
    linhas: linhas("Programação 2027", NEWBLUE_ES),
  },  {
    id: "travelplan-es", nome: "Travelplan Espanha", motor: true, sinal: "35% (voos charter)", atualizado: "29/10/2026",
    faq: FAQ("que-destinos-posso-reservar-com-a-travelplan-espanha"),
    resumo: "Programação 2026/27 com partidas de várias cidades espanholas.",
    permitido: [MOTOR, "Manual: apenas a programação 2026/2027 indicada."],
    proibido: ["Pacotes dinâmicos.", "Outros produtos fora da programação."],
    linhas: linhas("Programação 2026/27", TRAVELPLAN_ES),
  },  {
    id: "catai", nome: "Catai", motor: false, sinal: "40%", atualizado: "—",
    faq: FAQ("que-destinos-posso-reservar-com-a-catai"),
    resumo: "Grandes viagens: Ásia, América Latina, África e Oceania. Todo o produto do site é autorizado.",
    permitido: ["Reserva sempre manual (formulário).", "Todo o produto disponível no site da Catai."],
    proibido: [],
    todoOSite: [ASI, AL, CAR, AFR, IND, MO, "Oceania"],
    linhas: [],
  },
  {
    id: "icarion", nome: "Icárion", motor: false, sinal: "40%", atualizado: "—",
    faq: FAQ("que-destinos-posso-reservar-com-a-icarion"),
    resumo: "Médio e longo curso premium (Maldivas, Vietname, Japão, Costa Rica, safaris, luas de mel). Todo o produto do site é autorizado.",
    permitido: ["Reserva sempre manual (formulário).", "Todo o produto disponível no site da Icárion."],
    proibido: [],
    todoOSite: [ASI, AL, CAR, AFR, IND, MO, "Oceania"],
    linhas: [],
  },
];

/** Regras gerais das FAQs que se aplicam a qualquer reserva com operador. */
export const REGRAS_GERAIS: string[] = [
  "Pacotes dinâmicos de operador não são autorizados: reserva-os nos motores da plataforma iCliGo (Voo + Hotel, Multidestino…).",
  "Nas reservas manuais só podem ser reservados pacotes com voos charter ou especiais.",
  NAO_AUTORIZADA,
  MANUAL,
  "O Departamento de Reservas segue apenas o que está escrito no formulário; os anexos servem de apoio.",
  "Nunca confirmes nada ao cliente sem a validação do Departamento de Reservas.",
  "O pagamento total (100%) é feito até 35 dias antes da viagem, salvo exceções.",
  "Não contactes diretamente operadores turísticos nem companhias de cruzeiros: o contacto é feito pela equipa iCliGo.",
  "Para grupos, podes pedir orçamento de pacote de operador (taxa de 50 €, deduzida se a reserva avançar).",
];

// ─── Pesquisa ────────────────────────────────────────────────────────────────

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const POR_ID = new Map(DESTINOS.map(d => [d.id, d]));

/** Direta: o termo começa pela pesquisa (ou uma palavra dele). Contida: a frase pesquisada inclui o termo. */
function correspondeTermo(consulta: string, termo: string, modo: "direta" | "contida" = "direta"): boolean {
  const t = normalizar(termo);
  if (!t) return false;
  if (modo === "contida") return t.length >= 4 && ` ${consulta} `.includes(` ${t} `);
  // Pesquisas curtas (ex.: códigos IATA): palavra igual ou, com 3 letras, início de palavra.
  if (consulta.length <= 3) return t.split(" ").some(p => p === consulta || (consulta.length === 3 && p.startsWith(consulta)));
  return t.startsWith(consulta) || t.includes(` ${consulta}`);
}

function destinosPorGrupo(grupo: string): Destino[] {
  return DESTINOS.filter(d => d.grupos.includes(grupo));
}

export interface ResultadoLinha extends Omit<Linha, "destino" | "temas"> { destino: string; nomeDestino: string }
export interface ResultadoOperador {
  id: IdOperador; nome: string; motor: boolean; sinal: string; atualizado: string; faq: string; resumo: string;
  permitido: string[]; proibido: string[]; avisos: string[];
  /** "programacao": há linhas concretas; "todo-o-site": autorizado mas é preciso confirmar se o site tem o destino. */
  tipo: "programacao" | "todo-o-site";
  linhas: ResultadoLinha[];
}
export interface ResultadoPesquisa {
  consulta: string;
  destinos: { id: string; nome: string; pais: string }[];
  operadores: ResultadoOperador[];
}

/** Destinos que correspondem à pesquisa, já expandidos (país → cidades, tema → linhas do tema). */
export function procurarDestinos(consulta: string): Destino[] {
  const q = normalizar(consulta);
  if (q.length < 2) return [];
  // Primeiro a correspondência direta; só se não houver nenhuma, procura destinos dentro da frase (ex.: "pacote punta cana").
  for (const modo of ["direta", "contida"] as const) {
    const encontrados = new Map<string, Destino>();
    for (const d of DESTINOS) {
      if ([d.nome, d.pais, ...(d.termos ?? [])].some(t => correspondeTermo(q, t, modo))) encontrados.set(d.id, d);
    }
    for (const g of new Set(DESTINOS.flatMap(d => d.grupos))) if (correspondeTermo(q, g, modo)) for (const d of destinosPorGrupo(g)) encontrados.set(d.id, d);
    if (encontrados.size) return [...encontrados.values()];
  }
  return [];
}

export function pesquisarOperadores(consulta: string, filtroDestino?: string): ResultadoPesquisa {
  let destinos = procurarDestinos(consulta);
  if (filtroDestino) destinos = destinos.filter(d => d.id === filtroDestino);
  const ids = new Set(destinos.map(d => d.id));
  // Um destino puxa as linhas do "guarda-chuva" do seu país/arquipélago (ex.: Salvador → Brasil).
  for (const d of [...destinos]) for (const g of d.grupos) for (const chapeu of DESTINOS.filter(x => x.abrange === g)) ids.add(chapeu.id);
  const temas = new Set(destinos.map(d => d.tema).filter((t): t is Tema => !!t));
  const regioes = new Set(destinos.filter(d => !d.tema).flatMap(d => d.grupos));

  const operadores: ResultadoOperador[] = [];
  for (const o of OPERADORES) {
    const base = { id: o.id, nome: o.nome, motor: o.motor, sinal: o.sinal, atualizado: o.atualizado, faq: o.faq, resumo: o.resumo, permitido: o.permitido, proibido: o.proibido, avisos: o.avisos ?? [] };
    const doOperador = o.linhas.filter(l => ids.has(l.destino) || l.temas?.some(t => temas.has(t)));
    if (doOperador.length) {
      operadores.push({ ...base, tipo: "programacao", linhas: doOperador.map(({ temas: _t, ...l }) => ({ ...l, nomeDestino: POR_ID.get(l.destino)?.nome ?? l.destino })) });
    } else if (o.todoOSite?.some(r => regioes.has(r))) {
      operadores.push({ ...base, tipo: "todo-o-site", linhas: [] });
    }
  }
  // Ordem da lista OPERADORES: primeiro partidas de Portugal, depois Espanha; "todo o site" no fim.
  operadores.sort((a, b) => Number(b.tipo === "programacao") - Number(a.tipo === "programacao"));
  return { consulta, destinos: destinos.map(d => ({ id: d.id, nome: d.nome, pais: d.pais })), operadores };
}

/** Sugestões para o campo de pesquisa (nomes de destinos e grupos). */
export function sugestoesDestinos(): string[] {
  return [...new Set([...DESTINOS.map(d => d.nome), ...DESTINOS.flatMap(d => d.grupos)])].sort((a, b) => a.localeCompare(b, "pt"));
}

export function resumoOperadores() {
  return OPERADORES.map(o => ({ id: o.id, nome: o.nome, motor: o.motor, sinal: o.sinal, atualizado: o.atualizado, faq: o.faq, resumo: o.resumo }));
}
