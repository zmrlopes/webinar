import type { CursoExterno, LicaoExterna, ModuloExterno } from "./formacoes-gravadas";

/**
 * Formações da iCliGo Academy (academy.icligo.com) sobre reservas, destinos e
 * orçamentos. As aulas ficam lá (é preciso entrar com a conta iCliGo); aqui só
 * temos o índice — título e link de cada lição — para o consultor as encontrar
 * na mesma pesquisa das formações da Tropa de Elite.
 *
 * Levantado da Academy a 2026-09-25. Os slugs vêm dos links das lições; há
 * alguns trocados do lado deles (ex.: "laponia" é o Senegal) — vale o título.
 */

const ACADEMY = "https://academy.icligo.com";

/** [slug da lição, título, palavras extra para a pesquisa (país, continente…)] */
type LicaoBruta = [string, string, string?];

function modulo(titulo: string, licoes: LicaoBruta[]): ModuloExterno {
  return {
    titulo,
    licoes: licoes.map(([slug, tituloLicao, palavras]): LicaoExterna => ({
      id: `icligo-${slug}`,
      titulo: tituloLicao,
      url: `${ACADEMY}/lessons/${slug}`,
      ...(palavras ? { palavras } : {}),
    })),
  };
}

/** A capa é uma cópia local (public/formacoes/icligo) — a Academy não deixa usar as imagens noutros sites. */
export function cursoAcademy(
  slug: string,
  titulo: string,
  grupo: string,
  modulos: ModuloExterno[] = [],
): CursoExterno {
  return {
    id: slug,
    titulo,
    url: `${ACADEMY}/courses/${slug}`,
    capa: `/formacoes/icligo/${slug}.jpg`,
    grupo,
    modulos,
  };
}

const DESTINOS = "Destinos e Produto";
const ORCAMENTOS = "Orçamentos e Reservas";
const CAMPANHAS = "Campanhas";

export const RESERVAS_ICLIGO: CursoExterno[] = [
  cursoAcademy("icligo-expert-formacao-de-produto", "iCliGo Expert: Formação de Produto", DESTINOS, [
    modulo("Destinos", [
      ["indonesia", "Indonésia", "Ásia Bali"],
      ["djerba", "Famtrip Djerba", "Tunísia África"],
      ["egito", "Egito", "África Cairo Nilo"],
      ["ilha-do-sal-cabo-verde", "Ilha do Sal, Cabo Verde", "África"],
      ["turquia", "Turquia", "Europa Ásia Istambul"],
      ["filipinas", "Filipinas", "Ásia"],
      ["seychelles", "Seychelles", "África Índico"],
      ["japao", "Japão", "Ásia Tóquio"],
      ["maldivas", "Maldivas", "Ásia Índico"],
      ["zanzibar", "Zanzibar", "Tanzânia África"],
      ["riviera-turca", "Riviera Turca", "Turquia Antalya Europa"],
      ["sal-e-boa-vista", "Sal e Boa Vista", "Cabo Verde África"],
      ["tailandia", "Tailândia", "Ásia"],
      ["brasil", "Brasil", "América do Sul"],
      ["disneyland-paris", "Disneyland Paris", "França Europa parques"],
      ["jamaica", "Jamaica", "Caraíbas América Central"],
      ["colombia", "Colômbia", "América do Sul"],
      ["laponia", "Senegal", "África"],
      ["laponia-2", "Lapónia", "Finlândia Europa Natal Pai Natal"],
      ["china", "China", "Ásia"],
    ]),
  ]),
  cursoAcademy("be-an-expert-3", "Sessões Semanais Be an Expert", DESTINOS, [
    modulo("Destinos", [
      ["sao-tome-e-principe-2", "São Tomé e Príncipe", "África"],
      ["riviera-maya", "Riviera Maya", "México Caraíbas América Central"],
      ["vietname", "Vietname", "Ásia"],
      ["noruega", "Noruega", "Europa fiordes"],
      ["rajastao", "Rajastão", "Índia Ásia"],
      ["creta-2", "Creta", "Grécia Europa"],
      ["sardenha", "Sardenha", "Itália Europa"],
      ["maldivas-3", "Maldivas", "Ásia Índico"],
      ["zanzibar-4", "Zanzibar", "Tanzânia África"],
      ["madeira-e-porto-santo", "Madeira e Porto Santo", "Portugal Europa"],
      ["curacao", "Curaçao", "Caraíbas América Central"],
      ["bahamas", "Bahamas", "Caraíbas América Central"],
      ["marrakech", "Marrakech", "Marrocos África"],
      ["corfu-2", "Corfu", "Grécia Europa"],
      ["albania", "Albânia", "Europa"],
      ["menorca", "Menorca", "Espanha Baleares Europa"],
      ["bulgaria", "Bulgária", "Europa"],
    ]),
    modulo("Cruzeiros, Consultoria e Procedimentos", [
      ["cruzeiros", "Cruzeiros"],
      ["consultoria-de-excelencia-pre-reserva", "Consultoria de Excelência Pré-Reserva"],
      ["consultoria-de-excelencia-pre-reserva-3", "Consultoria de Excelência Pré-Reserva (2ª sessão)"],
      ["reserva", "Reserva"],
      ["reserva-3", "Reserva (2ª sessão)"],
      ["consultoria-de-excelencia-pos-reserva", "Consultoria de Excelência Pós-Reserva"],
      ["consultoria-de-excelencia-pos-reserva-2", "Consultoria de Excelência Pós-Reserva (2ª sessão)"],
      ["pos-reserva", "Pós-Reserva"],
      ["procedimentos", "Procedimentos"],
    ]),
  ]),
  cursoAcademy("partnerup-training", "PartnerUp Training", DESTINOS, [
    modulo("Cruzeiros", [
      ["royal-caribbean-por-sandrine-nogueira-2", "Royal Caribbean, por Sandrine Nogueira", "cruzeiros"],
      [
        "royal-caribbean-por-sandrine-nogueira",
        "Royal Caribbean – na prática com Vanessa Barata",
        "cruzeiros",
      ],
      ["msc-cruzeiros-por-sivia-oliveira", "MSC Cruzeiros, por Sívia Oliveira"],
      ["msc-cruzeiros-na-pratica-com-vanessa-barata", "MSC Cruzeiros – na prática com Vanessa Barata"],
      ["celebrity-cruzeiros-por-sandrine-nogueira", "Celebrity Cruzeiros, por Sandrine Nogueira"],
      [
        "celebrity-cruzeiros-na-pratica-com-vanessa-barata",
        "Celebrity Cruzeiros – na prática com Vanessa Barata",
      ],
      ["costa-cruzeiros-por-tania-jesus", "Costa Cruzeiros, por Tânia Jesus"],
      ["costa-cruzeiros-na-pratica-com-vanessa-barata", "Costa Cruzeiros – na prática com Vanessa Barata"],
    ]),
    modulo("Dubai e Emirates", [
      [
        "turismo-do-dubai-por-alexandra-pires",
        "Turismo do Dubai, por Alexandra Pires",
        "Emirados Árabes Unidos Médio Oriente Ásia",
      ],
      ["emirates-por-hugo-miguel-faria", "Emirates, por Hugo Miguel Faria", "companhia aérea voos Dubai"],
      [
        "emirates-na-pratica-com-vanessa-barata",
        "Emirates – na prática com Vanessa Barata",
        "companhia aérea voos Dubai",
      ],
    ]),
    modulo("Solférias", [
      [
        "disneyland-por-carla-garrucho-2",
        "Disneyland, por Carla Garrucho",
        "Paris França Europa parques operador",
      ],
      ["disneyland-por-carla-garrucho", "Egito, por Dário Brilha", "África operador"],
      ["cabo-verde-por-dario-brilha", "Cabo Verde, por Dário Brilha", "África Sal Boa Vista operador"],
      ["saidia-por-dario-brilha", "Saidia, por Dário Brilha", "Marrocos África operador"],
      ["senegal-por-dario-brilha", "Senegal, por Dário Brilha", "África operador"],
      ["tunisia-por-dario-brilha", "Tunísia, por Dário Brilha", "África Djerba operador"],
    ]),
  ]),
  cursoAcademy("formacao-parceiros", "Formação Parceiros", DESTINOS),
  cursoAcademy("be-a-travel-consultant-2", "Be a Travel Partner", ORCAMENTOS, [
    modulo("Antes da Reserva", [
      [
        "aula-1-como-comecar-a-atrair-os-teus-primeiros-clientes",
        "Como começar a atrair os teus primeiros clientes",
      ],
      ["aula-2-antes-de-abrir-o-motor-de-pesquisa", "Antes de abrir o motor de pesquisa"],
      ["aula-3-pergunta-1-qual-e-o-destino", "Pergunta 1: Qual é o destino?"],
      ["aula-4-pergunta-2-qual-e-a-motivacao-da-viagem", "Pergunta 2: Qual é a motivação da viagem?"],
      ["aula-5-pergunta-3-quais-sao-as-datas", "Pergunta 3: Quais são as datas?"],
      ["aula-6-pergunta-4-quantas-pessoas-vao-viajar", "Pergunta 4: Quantas pessoas vão viajar?"],
      ["aula-7-pergunta-5-qual-o-regime-alimentar", "Pergunta 5: Qual o regime alimentar?"],
      ["aula-8-pergunta-6-que-tipo-de-alojamento-procuram", "Pergunta 6: Que tipo de alojamento procuram?"],
      ["aula-9-pergunta-7-qual-e-o-orcamento-disponivel", "Pergunta 7: Qual é o orçamento disponível?"],
      ["aula-10-dados-extra-para-o-orcamento", "Dados extra para o orçamento"],
    ]),
    modulo("Plataforma iCliGo: Criar Orçamentos", [
      ["aula-1-onde-criar-os-teus-orcamentos", "Onde criar os teus orçamentos"],
      ["aula-2-motor-voo-hotel", "Motor Voo + Hotel"],
      ["aula-3-motor-multidestino", "Motor Multidestino", "circuito"],
      ["aula-4-motor-cruzeiros", "Motor Cruzeiros"],
      ["aula-5-motor-operadores", "Motor Operadores"],
      ["aula-6-motor-rent-a-car", "Motor Rent-a-Car", "aluguer de carro"],
      ["aula-7-restantes-motores-da-icligo", "Restantes motores da iCliGo"],
    ]),
    modulo("Guardar, Enviar, Ajustar e Avançar com Orçamentos", [
      ["aula-1-guardar-um-orcamento", "Guardar um orçamento"],
      ["aula-2-onde-encontrar-e-gerir-os-teus-orcamentos", "Onde encontrar e gerir os teus orçamentos"],
      ["aula-3-como-enviar-o-orcamento-e-fechar-a-reserva", "Como enviar o orçamento e fechar a reserva"],
      ["aula-4-como-avancar-e-confirmar-a-reserva", "Como avançar e confirmar a reserva"],
    ]),
    modulo("Pós-Reserva", [
      ["aula-1-como-aceder-as-reservas", "Como aceder às reservas"],
      ["aula-2-o-primeiro-acompanhamento", "O primeiro acompanhamento"],
      ["aula-3-organizacao-e-check-in", "Organização e check-in"],
      ["aula-4-pequenos-gestos-que-criam-grandes-clientes", "Pequenos gestos que criam grandes clientes"],
      ["aula-5-o-verdadeiro-valor-de-um-travel-partner", "O verdadeiro valor de um Travel Partner"],
    ]),
    modulo("Como Contactar a iCliGo", [
      ["aula-1-onde-pedir-ajuda-da-forma-certa", "Onde pedir ajuda da forma certa", "suporte"],
      ["aula-2-como-abrir-um-ticket-no-myoffice", "Como abrir um ticket no MyOffice", "suporte"],
      [
        "aula-3-prazos-de-resposta-e-como-nao-perder-tempo",
        "Prazos de resposta e como não perder tempo",
        "suporte",
      ],
      ["aula-4-telefone-so-para-emergencias", "Telefone: só para emergências", "suporte"],
      ["aula-5-emergencia-em-destino-o-que-fazer", "Emergência em destino: o que fazer", "suporte"],
      ["aula-6-fecho-do-modulo-a-regra-de-ouro-do-suporte", "A regra de ouro do suporte", "suporte"],
    ]),
  ]),
  cursoAcademy(
    "como-potenciar-maior-eficacia-com-o-departamento-de-reservas",
    "Como Potenciar Maior Eficácia com o Departamento de Reservas",
    ORCAMENTOS,
  ),
  cursoAcademy("icligo-summer26", "iCliGo Summer’26", CAMPANHAS, [
    modulo("Sessões", [
      ["detalhes-de-campanha", "Detalhes de campanha"],
      ["cabo-verde-ilha-do-sal", "Cabo Verde – Ilha do Sal", "África"],
      [
        "algarve-costa-de-la-luz-maiorca-e-gran-canaria",
        "Algarve, Costa de la Luz, Maiorca e Gran Canária",
        "Portugal Espanha Baleares Canárias Europa",
      ],
    ]),
  ]),
  cursoAcademy("blue-monday", "Blue Monday", CAMPANHAS),
  cursoAcademy("icligo-open-season-26", "Open Season’26", CAMPANHAS),
  cursoAcademy("black-friday-2025", "Black Friday 2025", CAMPANHAS),
  cursoAcademy("icligo-reveillon-pt", "iCliGo Réveillon", CAMPANHAS),
];
