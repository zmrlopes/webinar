import type { CursoExterno, LicaoExterna, ModuloExterno } from "./formacoes-gravadas";

/**
 * Formações da iCliGo Academy (academy.icligo.com) sobre reservas, destinos e
 * orçamentos (RESERVAS_ICLIGO) e sobre criação de equipa (EQUIPA_ICLIGO). As aulas ficam lá (é preciso entrar com a conta iCliGo); aqui só
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

const CURSOS_EQUIPA = "Cursos de Criação de Equipa";
const SESSOES_EQUIPA = "Sessões e Testemunhos";

/**
 * Formações da iCliGo Academy sobre criação e liderança de equipa. Levantado
 * da Academy a 2026-09-28 (os cursos com mais de 20 lições têm uma 2ª página
 * que a Academy carrega à parte — está tudo incluído).
 */
export const EQUIPA_ICLIGO: CursoExterno[] = [
  cursoAcademy("be-a-pro-5", "Be a Pro", CURSOS_EQUIPA, [
    modulo("Bem-vindo ao Curso Be a Pro", [
      [
        "aula-1-o-que-e-o-be-a-pro-criterios-de-sucesso-e-as-7-skills",
        "O que é o “Be a Pro”, critérios de sucesso e as 7 Skills",
      ],
    ]),
    modulo("Skill #1: Prospeção de Contactos", [
      ["aula-1-erros-mais-comuns-na-prospecao-de-contactos", "Erros mais comuns na prospeção de contactos"],
      ["aula-2-form", "FORM", "prospeção de contactos"],
      [
        "aula-3-lista-inicial-mercado-quente-mercado-morno-mercado-frio",
        "Lista inicial: mercado quente, morno e frio",
        "prospeção de contactos",
      ],
      ["aula-4-como-organizar-a-lista-importancia-do-volume", "Como organizar a lista e a importância do volume"],
      ["aula-5-o-contacto-e-a-importancia-da-necessidade", "O contacto e a importância da necessidade"],
      [
        "aula-6-guiao-da-conversa-com-o-joao-skill-1-prospecao-de-contactos",
        "Guião da conversa com o João (Skill #1: Prospeção de contactos)",
      ],
    ]),
    modulo("Skill #2: Convite", [
      ["aula-1-erros-mais-comuns-no-convite", "Erros mais comuns no convite"],
      [
        "aula-2-o-convite-serve-para-abrir-porta-a-apresentacao-nao-para-explicar-o-negocio",
        "O convite serve para abrir porta à apresentação, não para explicar o negócio",
      ],
      [
        "aula-3-como-fazer-um-convite-eficaz-e-quais-os-tipos-de-convite",
        "Como fazer um convite eficaz e quais os tipos de convite",
      ],
      ["aula-4-guiao-da-conversa-com-o-joao-skill-2-convite", "Guião da conversa com o João (Skill #2: Convite)"],
    ]),
    modulo("Skill #3: Apresentação", [
      ["aula-1-erros-mais-comuns-na-apresentacao", "Erros mais comuns na apresentação"],
      ["aula-2-o-objetivo-de-contar-a-tua-historia", "O objetivo de contar a tua história", "apresentação"],
      ["aula-3-a-apresentacao-webinar", "A apresentação: webinar"],
      [
        "aula-4-guiao-da-conversa-com-o-joao-skill-3-apresentacao",
        "Guião da conversa com o João (Skill #3: Apresentação)",
      ],
    ]),
    modulo("Skill #4: Fecho", [
      ["aula-1-erros-mais-comuns-no-fecho-e-o-que-e", "Erros mais comuns no fecho e o que é"],
      ["aula-2-o-fecho-na-pratica-a-pergunta-inicial-obrigatoria", "O fecho na prática: a pergunta inicial obrigatória"],
      ["aula-3-as-objecoes-mais-comuns", "As objeções mais comuns", "fecho"],
      ["aula-4-desbloqueio-de-objecoes", "Desbloqueio de objeções", "fecho"],
      ["aula-5-guiao-da-conversa-com-o-joao-skill-4-fecho", "Guião da conversa com o João (Skill #4: Fecho)"],
    ]),
    modulo("Skill #5: Acompanhamento (Exposições)", [
      ["aula-1-erros-mais-comuns-no-acompanhamento", "Erros mais comuns no acompanhamento"],
      ["aula-2-follow-up-sem-apego-emocional", "Follow-up sem apego emocional", "acompanhamento"],
      [
        "aula-3-o-que-dizer-depois-do-nao-apos-a-apresentacao",
        "O que dizer depois do “não” após a apresentação",
        "acompanhamento follow-up",
      ],
      [
        "aula-4-guiao-de-conversa-com-o-joao-skill-5-acompanhamento",
        "Guião da conversa com o João (Skill #5: Acompanhamento)",
      ],
    ]),
    modulo("Skill #6: Iniciar o Novo Travel Partner", [
      [
        "aula-1-erros-mais-comuns-ao-iniciar-um-novo-travel-partner",
        "Erros mais comuns ao iniciar um novo Travel Partner",
      ],
      [
        "aula-2-os-5-passos-essenciais-para-iniciar-um-novo-travel-partner",
        "Os 5 passos essenciais para iniciar um novo Travel Partner",
      ],
      ["aula-3-a-funcao-do-mentor", "A função do mentor", "iniciar novo Travel Partner"],
      ["aula-4-core-rank-e-metas-iniciais", "Core-rank e metas iniciais", "iniciar novo Travel Partner"],
    ]),
    modulo("Skill #7: Promoção de Eventos", [
      ["aula-1-erros-mais-comuns-na-promocao-de-eventos", "Erros mais comuns na promoção de eventos"],
      [
        "aula-2-porque-devem-os-travel-partners-participar-num-evento-da-icligo",
        "Porque devem os Travel Partners participar num evento da iCliGo",
      ],
      ["aula-3-eventos-icligo", "Eventos iCliGo"],
      [
        "aula-4-guiao-da-conversa-com-o-joao-skill-7-promocao-de-eventos",
        "Guião da conversa com o João (Skill #7: Promoção de Eventos)",
      ],
    ]),
  ]),
  cursoAcademy("be-a-leader-2", "Be a Leader", CURSOS_EQUIPA, [
    modulo("Bem-vindo ao Curso Be a Leader", [
      ["aula-1-introducao-ao-be-a-leader", "Introdução ao Be a Leader", "liderança"],
      ["aula-2-o-que-muda-quando-passas-a-ser-um-lider", "O que muda quando passas a ser um líder?", "liderança"],
    ]),
    modulo("As 5 Características de um Líder", [
      ["aula-1-as-5-caracteristicas-de-um-lider", "As 5 características de um líder", "liderança"],
    ]),
    modulo("Liderança", [
      ["aula-1-esta-e-a-fase-de", "Esta é a fase de…", "liderança"],
      ["aula-2-criterios-de-sucesso-lideranca-real-aplicada", "Critérios de sucesso (liderança real aplicada)"],
    ]),
    modulo("Com Quem Vou Trabalhar?", [
      ["aula-1-erros-mais-comuns", "Erros mais comuns", "liderança com quem trabalhar"],
      ["aula-2-o-filtro-principal-fome-ser-ensinavel", "O filtro principal: fome + ser ensinável", "liderança"],
    ]),
    modulo("Os 10 Sistemas (o Motor da Escalabilidade)", [
      ["aula-1-os-10-sistemas-icligo", "Os 10 sistemas iCliGo", "escalabilidade"],
      ["aula-2-aquisicao-de-clientes", "Aquisição de clientes", "sistemas"],
      ["aula-3-retencao-de-clientes", "Retenção de clientes", "sistemas"],
      ["aula-4-atracao-de-travel-partners", "Atração de Travel Partners", "sistemas recrutamento"],
      ["aula-5-retencao-de-travel-partners", "Retenção de Travel Partners", "sistemas"],
      ["aula-6-core-rank", "Core rank", "sistemas"],
      ["aula-7-comunicacao", "Comunicação", "sistemas"],
      ["aula-8-desenvolvimento-de-skills", "Desenvolvimento de Skills", "sistemas"],
      [
        "aula-9-reconhecimento-e-incentivos-por-produtividade",
        "Reconhecimento e incentivos (por produtividade)",
        "sistemas",
      ],
      ["aula-10-desenvolvimento-de-lideres", "Desenvolvimento de líderes", "sistemas liderança"],
      ["aula-11-promocao-em-eventos", "Promoção em eventos", "sistemas"],
    ]),
    modulo("Autonomia das Diferentes Linhas", [
      ["aula-1-o-que-e-uma-linha-autonoma", "O que é um canal de atividade autónomo", "linha autónoma"],
      [
        "aula-2-o-que-e-uma-linha-dependente",
        "O que é um canal de atividade comercial dependente",
        "linha dependente",
      ],
    ]),
    modulo("O Ponto de Rutura: do 2º para o 3º Nível", [
      ["aula-1-o-que-tens-de-construir-na-2a-geracao", "O que tens de construir no 2º nível", "geração profundidade"],
    ]),
    modulo("3-Way Calls para Independência em 6 Sessões", [
      ["aula-1-principios-base-e-visao-geral", "Princípios base e visão geral", "3-way calls chamadas a três"],
      [
        "aula-2-1a-sessao-ajuste-de-expectativas-contacto-e-convite",
        "1ª sessão: ajuste de expectativas + contacto e convite",
        "3-way calls",
      ],
      ["aula-3-2a-sessao-edificacao-e-posicionamento", "2ª sessão: edificação e posicionamento", "3-way calls"],
      ["aula-4-3a-sessao-apresentacao-e-compromisso", "3ª sessão: apresentação e compromisso", "3-way calls"],
      ["aula-5-4a-sessao-abertura-do-fecho", "4ª sessão: abertura do fecho", "3-way calls"],
      ["aula-6-5a-sessao-fecho-e-quebra-de-objecoes", "5ª sessão: fecho e quebra de objeções", "3-way calls"],
      ["aula-7-6a-sessao-autonomia-total", "6ª sessão: autonomia total", "3-way calls"],
      [
        "aula-8-checklist-do-mentor-para-cada-travel-partner-da-2a-geracao",
        "Checklist do mentor para cada Travel Partner do 2º nível",
        "3-way calls",
      ],
    ]),
    modulo("Inversão de Papel (o Nascimento da Profundidade)", [
      ["aula-1-o-que-tem-de-acontecer", "O que tem de acontecer", "profundidade"],
      ["aula-2-os-sinais-de-falsa-profundidade-e-como-corrigir", "Os sinais de falsa profundidade e como corrigir"],
    ]),
  ]),
  cursoAcademy("be-a-promoter", "Be a Promoter", CURSOS_EQUIPA, [
    modulo("Bem-vindo ao Curso Be a Promoter", [["aula-1-objetivo-do-curso", "Objetivo do curso", "eventos promotor"]]),
    modulo("O que é um Evento", [
      ["aula-1-erros-mais-comuns-sobre-eventos", "Erros mais comuns sobre eventos"],
      ["aula-2-quais-sao-os-eventos-da-icligo", "Quais são os eventos da iCliGo"],
      ["aula-3-porque-os-eventos-criam-promotores-e-lideres", "Porque os eventos criam promotores e líderes"],
    ]),
    modulo("O Evento como Ferramenta de Crescimento", [
      ["aula-1-erros-mais-comuns-na-promocao", "Erros mais comuns na promoção", "eventos"],
      ["aula-2-a-estrategia-o-que-esperar-de-um-evento", "A estratégia: o que esperar de um evento"],
    ]),
    modulo("A Máquina Operacional: Funil + Métricas", [
      ["aula-1-erros-operacionais-mais-comuns", "Erros operacionais mais comuns", "eventos"],
      ["aula-2-o-funil-do-promotor-e-as-metricas-que-importam", "O funil do promotor e as métricas que importam", "eventos"],
    ]),
    modulo("Scripts, Templates e Checklists", [
      ["aula-1-erros-mais-comuns-na-comunicacao", "Erros mais comuns na comunicação", "eventos"],
      ["aula-2-scripts-prontos-one-on-one", "Scripts prontos (one on one)", "eventos"],
      ["aula-3-template-para-confirmados-grupos-de-chat", "Template para “confirmados” (grupos de chat)", "eventos"],
    ]),
    modulo("Criar Promotores", [
      ["aula-1-erros-mais-comuns-na-duplicacao", "Erros mais comuns na escalabilidade", "duplicação"],
      ["aula-2-duplicacao-de-promotores", "Escalabilidade de promotores", "duplicação"],
      ["aula-3-como-identificar-um-promotor", "Como identificar um promotor"],
      ["aula-4-como-acompanhar-um-promotor-identificado", "Como acompanhar um promotor identificado"],
    ]),
    modulo("O Sistema do Promotor: Ciclo Anual e Planeamentos", [
      ["aula-1-calendario-anual-do-promotor", "Calendário anual do promotor", "eventos"],
      ["aula-2-o-modelo-dos-3-ciclos", "O modelo dos 3 ciclos", "promotor"],
      ["aula-3-planeamento-anual-mensal-e-semanal", "Planeamento anual, mensal e semanal", "promotor"],
    ]),
  ]),
  cursoAcademy("be-a-pro", "Sessões Semanais Be a Pro", SESSOES_EQUIPA, [
    modulo("Sessões", [
      ["be-a-pro-1", "#1 – Potencial do Negócio"],
      ["be-a-pro-2", "#2 – Prospeção de Contactos"],
      ["be-a-pro-3", "#3 – Contacto e História"],
      ["4-convite", "#4 – Convite"],
      ["5-apresentacao-de-webinar", "#5 – Apresentação de Webinar"],
      ["6-fecho-e-dominio-de-objecoes", "#6 – Fecho e Domínio de Objeções"],
      ["7-follow-up", "#7 – Follow-Up", "acompanhamento"],
      ["8-promocao-de-eventos", "#8 – Promoção de Eventos"],
      ["9-potencial-de-negocio", "#9 – Potencial do Negócio"],
      ["10-prospecao-de-contactos", "#10 – Prospeção de Contactos"],
      ["11-contacto-e-historia", "#11 – Contacto e História"],
      ["12-o-convite", "#12 – O Convite"],
      ["13-apresentacao", "#13 – Apresentação"],
      ["14-objecoes-e-fecho", "#14 – Objeções e Fecho"],
      ["15-follow-up", "#15 – Follow-Up", "acompanhamento"],
      ["16-potencial-do-negocio", "#16 – Potencial do Negócio"],
      ["17-prospeccao-de-contactos", "#17 – Prospeção de Contactos"],
      ["18-contactos-e-historia", "#18 – Contacto e História"],
      ["19-convite", "#19 – Convite"],
      ["20-apresentacao", "#20 – Apresentação"],
      ["21-dominio-de-objecoes-e-fecho", "#21 – Domínio de Objeções e Fecho"],
      ["22-follow-up", "#22 – Follow-Up", "acompanhamento"],
      ["23-promocao-de-eventos", "#23 – Promoção de Eventos"],
      ["24-potencial-com-a-icligo", "#24 – Potencial com a iCliGo"],
      ["25-contacto-e-historia", "#25 – Contacto e História"],
      ["26-convite", "#26 – Convite"],
      ["27-a-apresentacao", "#27 – A Apresentação"],
      ["28-objecoes-e-fecho", "#28 – Objeções e Fecho"],
    ]),
  ]),
  cursoAcademy("da-duvida-a-decisao", "Da Dúvida à Decisão", SESSOES_EQUIPA, [
    modulo(
      "Testemunhos",
      (
        [
          ["nao-tenho-tempo-nao-tinha-tempo-e-nao-se-via-a-viver-assim-para-sempre", "“Não tenho tempo” – Não tinha tempo e não se via a viver assim para sempre"],
          ["quero-sentir-me-integrado-procurava-comunidade-e-sentido-de-pertenca", "“Quero sentir-me integrado” – Procurava comunidade e sentido de pertença"],
          ["nao-tenho-tempo-para-a-familia-queria-estar-mais-presente-na-vida-dos-filhos", "“Não tenho tempo para a família” – Queria estar mais presente na vida dos filhos"],
          ["nao-sou-capaz-achava-que-o-sucesso-dependia-de-contactos-que-nao-tinha", "“Não sou capaz” – Achava que o sucesso dependia de contactos que não tinha"],
          ["nao-tenho-dinheiro-nem-experiencia-nao-vinha-do-turismo-e-estava-sem-dinheiro", "“Não tenho dinheiro nem experiência” – Não vinha do turismo e estava sem dinheiro"],
          ["nao-tenho-tempo-o-tempo-era-sempre-o-maior-bloqueio", "“Não tenho tempo” – O tempo era sempre o maior bloqueio"],
          ["sera-que-consigo-o-modelo-de-negocio-parecia-lhe-complexo", "“Será que consigo?” – O modelo de negócio parecia-lhe complexo"],
          ["e-se-nao-recupero-o-valor-da-inscricao-o-medo-do-investimento-travava-a-decisao", "“E se não recupero o valor da inscrição?” – O medo do investimento travava a decisão"],
          ["nao-consigo-receio-de-nao-conseguir-rentabilizar", "“Não consigo” – Receio de não conseguir rentabilizar"],
          ["o-que-vao-dizer-la-em-casa-a-decisao-nao-era-consensual-na-familia", "“O que vão dizer lá em casa?” – A decisão não era consensual na família"],
          ["conheco-poucas-pessoas-nao-gostava-de-falar-nem-tinha-rede-de-contactos", "“Conheço poucas pessoas” – Não gostava de falar nem tinha rede de contactos"],
          ["nao-e-possivel-nao-acreditava-que-fosse-possivel", "“Não é possível” – Não acreditava que fosse possível"],
          ["nao-tenho-dinheiro-a-limitacao-financeira-parecia-decisiva", "“Não tenho dinheiro” – A limitação financeira parecia decisiva"],
          ["ate-onde-posso-crescer-procurava-algo-escalavel-e-sustentavel", "“Até onde posso crescer?” – Procurava algo escalável e sustentável"],
          ["conseguirei-sozinha-queria-liberdade-sem-perder-controlo", "“Conseguirei sozinha?” – Queria liberdade sem perder controlo"],
          ["nao-tenho-tempo-mae-professora-e-sem-espaco-para-empreender", "“Não tenho tempo” – Mãe, professora e sem espaço para empreender"],
          ["posso-ser-mais-feliz-uma-frase-que-mudou-tudo", "“Posso ser mais feliz?” – Uma frase que mudou tudo"],
          ["conseguirei-por-mim-avancou-quando-ninguem-acreditava", "“Conseguirei por mim?” – Avançou quando ninguém acreditava"],
          ["nao-tenho-tempo-para-a-familia-percebeu-que-estava-a-perder-tempo-com-o-filho", "“Não tenho tempo para a família” – Percebeu que estava a perder tempo com o filho"],
          ["tenho-medo-de-me-expor-receava-comprometer-a-sua-imagem-profissional", "“Tenho medo de me expor” – Receava comprometer a sua imagem profissional"],
          ["devia-ter-comecado-mais-cedo-o-unico-arrependimento-foi-ter-esperado", "“Devia ter começado mais cedo” – O único arrependimento foi ter esperado"],
          ["sera-que-e-um-negocio-legitimo-desconfiava-do-modelo-de-negocio", "“Será que é um negócio legítimo?” – Desconfiava do modelo de negócio"],
          ["nao-tenho-dinheiro-pediu-dinheiro-emprestado-para-comecar", "“Não tenho dinheiro” – Pediu dinheiro emprestado para começar"],
        ] as [string, string][]
      ).map(([slug, titulo]): LicaoBruta => [slug, titulo, "objeção testemunho"]),
    ),
  ]),
];
