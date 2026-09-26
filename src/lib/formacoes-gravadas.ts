import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { RESERVAS_ICLIGO, cursoAcademy } from "./formacoes-icligo";

/**
 * Formações gravadas (/consultor/formacoes) — recriação, no painel do
 * consultor, das formações que estavam na escola (escola.travellersteam.pt).
 * Enquanto for `true`, o botão "Formações" e as páginas só funcionam no
 * painel de demonstração (zmrlopes@gmail.com). Passar a `false` publica-as
 * para toda a equipa — é o único sítio a mexer para as pôr no ar.
 */
const SO_PAINEL_DEMONSTRACAO = true;

export function formacoesGravadasVisiveis(email: string): boolean {
  if (email === EMAIL_PAINEL_DEMONSTRACAO) return true;
  return !SO_PAINEL_DEMONSTRACAO;
}

export interface Aula {
  /** Chave estável (ID do vídeo do YouTube; ver formacoes_vistas). */
  id: string;
  titulo: string;
  /** ID do vídeo no YouTube; null enquanto a aula ainda não tem vídeo alojado aí. */
  youtube: string | null;
  min: number | null;
  /** Data de publicação na escola (AAAA-MM-DD) — só serve para "mais recentes". */
  data: string;
  formador?: string;
}

export interface Modulo {
  titulo: string;
  aulas: Aula[];
}

export interface Curso {
  id: string;
  titulo: string;
  descricao: string;
  modulos: Modulo[];
}

/** Lição de um curso da iCliGo Academy — abre lá (precisa da conta iCliGo). */
export interface LicaoExterna {
  id: string;
  titulo: string;
  url: string;
  /** Palavras extra para a pesquisa (país, continente…) que não estão no título. */
  palavras?: string;
}

export interface ModuloExterno {
  titulo: string;
  licoes: LicaoExterna[];
}

/**
 * Curso alojado na iCliGo Academy (academy.icligo.com): não temos os vídeos,
 * só o índice das lições, cada uma com link para lá (onde o consultor entra
 * com a conta iCliGo). Ver formacoes-icligo.ts.
 */
export interface CursoExterno {
  id: string;
  titulo: string;
  url: string;
  capa: string;
  /** Agrupa os cursos na página (ex.: "Campanhas"). */
  grupo: string;
  /** Vazio = só o cartão do curso (as lições não são públicas ou não interessam). */
  modulos: ModuloExterno[];
}

/** Formações da própria iCliGo, separadas das da Tropa de Elite em cada categoria. */
export interface FormacoesIcligo {
  /** Aulas gravadas no YouTube — funcionam como os cursos da Tropa de Elite. */
  cursos: Curso[];
  externos: CursoExterno[];
}

export interface Categoria {
  id: string;
  titulo: string;
  descricao: string;
  /** false = o card aparece com "Em breve" e ainda não abre. */
  disponivel: boolean;
  /** Formações da Tropa de Elite. */
  cursos: Curso[];
  icligo: FormacoesIcligo;
}

/** [título, ID do YouTube (ou null), minutos (ou null), data de publicação, formador?] */
type AulaBruta = [string, string | null, number | null, string, string?];

function modulo(cursoId: string, titulo: string, aulas: AulaBruta[]): Modulo {
  return {
    titulo,
    aulas: aulas.map(([tituloAula, youtube, min, data, formador], i) => ({
      id: youtube ?? `${cursoId}-${titulo}-${i + 1}`,
      titulo: tituloAula,
      youtube,
      min,
      data,
      ...(formador ? { formador } : {}),
    })),
  };
}

const SETE_SKILLS = "7-skills";
const EXCELENCIA = "consultor-de-excelencia";
const CANVA = "canva";
const ACELERACAO = "aceleracao-digital";
const GERAIS = "gerais";
const DESTINOS = "por-destinos";
const MASTERCLASSES = "masterclasses-especiais";
const EW_PRIMEIROS_PASSOS = "eric-worre-primeiros-passos";
const EW_INFLUENCIA = "eric-worre-influencia";
const EW_ESTRATEGIA = "eric-worre-estrategia-relampago";
const EW_CONFIANCA = "eric-worre-confianca-inquebravel";
const EW_COMPETENCIAS = "eric-worre-competencias-essenciais";
const EW_PROFISSIONAIS = "eric-worre-profissionais-network-marketing";
const SESSOES_ESSENCIAIS = "tropa-elite-sessoes-essenciais";
const SESSOES_RESERVAS = "tropa-elite-sessoes-reservas";
const ICLIGO_ESSENCIAIS = "icligo-essenciais";

const essenciais: Categoria = {
  id: "essenciais",
  titulo: "Essenciais",
  descricao:
    "As competências para vender e fazer crescer o negócio, o atendimento de excelência ao cliente e as ferramentas digitais. Segue a ordem recomendada.",
  disponivel: true,
  cursos: [
    {
      id: SETE_SKILLS,
      titulo: "7 Skills: Torna-te um Super Patrocinador",
      descricao:
        "As competências para fazer crescer o negócio: lista de contactos, convite, apresentação, a tua história, objeções e fecho.",
      modulos: [
        modulo(SETE_SKILLS, "Lista e Contactos (1ª Skill)", [
          ["Construir a Lista de Contactos", "q0cWBj4MTDo", 6, "2025-05-01"],
          ["Estratégias para aumentar a tua Lista", "GRiFpT0T_gE", 4, "2025-05-01"],
          ["Tipos de Contactos", "2MJgVH4yY0w", 5, "2025-05-01"],
          ["Princípios e Estratégias para Contactar", "nXe6Tb-PqH8", 9, "2025-05-01"],
        ]),
        modulo(SETE_SKILLS, "Convite (2ª Skill)", [
          ["Mindset para o melhor Convite", "noSWUWkRH5w", 5, "2025-05-01"],
          ["Quando e Como Convidar?", "GWlAH3o8Mgs", 5, "2025-05-01"],
          ["Estratégias e Exemplos de Convites Eficientes", "h8gVSljiQDI", 16, "2025-05-01"],
        ]),
        modulo(SETE_SKILLS, "Apresentação (3ª Skill)", [
          ["Formas que podes usar para Apresentar", "5lex0jpWTes", 4, "2025-05-24"],
          ["O webinar como ferramenta poderosa de Apresentação", "tSc4Dywz_YI", 3, "2025-05-01"],
          ["O que fazer antes do Webinar", "9XFjdRUFatc", 4, "2025-05-01"],
          ["O que fazer durante o Webinar", "Gt2svIhprNg", 3, "2025-05-01"],
          ["O que fazer depois do Webinar", "gRcJHvzwE7s", 15, "2025-05-24"],
        ]),
        modulo(SETE_SKILLS, "História (4ª Skill)", [
          ["A importância da tua História", "ah6T9myj4uA", 2, "2025-06-19"],
          ["Como contares a tua História", "WaG8bRpAyjM", 4, "2025-06-19"],
          ["A parte mais importante da tua História", "rZocCOR-FU4", 4, "2025-06-19"],
          ["Quando contar a tua História", "D5UsivHc8-Y", 7, "2025-06-19"],
          ["Dicas para contares a tua História", "yU5Rk1Ydsf8", 6, "2025-06-19"],
          ["Um último desafio", "7oHBGWObWsY", 2, "2025-06-19"],
        ]),
        modulo(SETE_SKILLS, "Dominar Objeções (5ª Skill)", [
          ["O que são Objeções", "1NHtVDOpv7k", 5, "2025-06-19"],
          ["5 Chaves para Dominar Objeções", "0XSkthGRFkk", 2, "2025-06-19"],
          ["Passo a Passo para lidar com a Objeção", "xv3QsqV6Guc", 3, "2025-06-19"],
          ["Objeção - Eu não tenho tempo!", "3cGFgcnFyPo", 2, "2025-06-19"],
          ["Objeção - Eu não tenho Dinheiro!", "Ivf-WQMUxKY", 2, "2025-06-19"],
          ["Objeção - Eu não tenho jeito para vendas", "FSquCb-5gxM", 2, "2025-06-19"],
        ]),
        modulo(SETE_SKILLS, "Fecho (6ª Skill)", [
          ["4 Passos para o fecho acontecer", "z1YLFmOWx5M", 3, "2025-06-19"],
          ["3 Pilares de Confiança para o fecho acontecer", "kSuMOidWO-U", 2, "2025-06-19"],
          ["O que são Perguntas Poderosas para o Fecho", "CRr1cK_S2Qc", 5, "2025-06-19"],
          ["O Modelo de 6 questões para acontecer o SIM", "QBNV8anr9Xc", 7, "2025-06-19"],
          ["Caso o SIM não aconteça!", "I5kRvPH64bs", 2, "2025-06-19"],
        ]),
        modulo(SETE_SKILLS, "Competências Essenciais para seres um Super Patrocinador (2023)", [
          ["Lista de Contatos e Objetivo do Contato – Parte 1/5", "fAAoGbfR4Ts", 22, "2025-02-06"],
          ["Convite para Agendamento da Apresentação da Oportunidade – Parte 2/5", "HIjJ2VLrOoA", 32, "2025-02-06"],
          ["Métodos para a Apresentação da Oportunidade – Parte 3/5", "6kC6HpAdjBs", 31, "2025-02-06"],
          ["Acompanhamento Pós Apresentação – Parte 4/5", "AHkBBBhzYF4", 18, "2025-02-06"],
          ["Como dominar Objeções? – Parte 5/5", "RzHhcZnMBzw", 18, "2025-02-06"],
        ]),
      ],
    },
    {
      id: EXCELENCIA,
      titulo: "Consultor(a) de Excelência",
      descricao:
        "Como atender o cliente do primeiro contacto ao pós-viagem: pré-orçamento, ferramentas de pesquisa, fecho e pós-venda do orçamento e pós-reserva.",
      modulos: [
        modulo(EXCELENCIA, "Pré-Orçamento (2025)", [
          ["A experiência de uma Consultora nesta matéria", "h8cpLyjcHiQ", 5, "2025-10-03"],
          ["Ser Consultor de Viagens e Agora?", "Naxtf1eOqz8", 3, "2025-10-03"],
          ["Estratégias de Divulgação", "YCBJjkw3I6E", 11, "2025-10-03"],
          ["Reflexão sobre o que fazes", "fuQzkiCN7X0", 1, "2025-10-03"],
          ["Diferença entre Vendedor e Consultor", "dyXp7d953qU", 3, "2025-10-03"],
          ["Importância da Comunicação", "YMYyL29atU4", 8, "2025-10-03"],
          ["Perguntas Chave a serem feitas ao Cliente", "Q4Dc9oHmH5U", 4, "2025-10-03"],
          ["Formação da Empresa e da Escola", "2oohk3PMHVA", 2, "2025-10-03"],
          ["Procedimento com os Operadores Turísticos", "HOYBjPZV9Rg", 6, "2025-10-03"],
          ["Como Enviar um Orçamento ao Cliente", "pYTWA9ckApM", 3, "2025-10-03"],
        ]),
        modulo(EXCELENCIA, "Ferramentas Online para a Pesquisa de Orçamentos", [
          ["Como usar o Skyscanner?", "3Jy2WjHp-Tk", 6, "2025-02-06"],
          ["Como usar o Google Flights?", "7Z1wPfc6bDs", 13, "2025-02-06"],
          ["Obter informações sobre Bagagem de Viagem", "5UDZ8IZ03z0", 7, "2025-02-06"],
          ["Como usar o Portal das Comunidades?", "DMJdMOUdagk", 3, "2025-02-06"],
          ["Como usar o IATA Travel Centre?", "wtj1OFs_4NE", 9, "2025-02-06"],
          ["Questões sobre a Consulta do Viajante", "tG7MBHPxQII", 6, "2025-02-06"],
        ]),
        modulo(EXCELENCIA, "Fecho, Pós-venda e Comunicação", [
          ["Do acompanhamento ao Fecho do Orçamento (FI 6 – Parte 6/7)", "8dYX0CDeZeo", 17, "2025-02-06"],
          ["Pós-venda do Orçamento: Dicas Importantes (FI 6 – Parte 7/7)", "ceNqZiUr0F4", 33, "2025-02-06"],
          ["Como ter a melhor Comunicação – Pete Vargas (GO PRO World Tour Online 2020)", "GsSbjNb1BAo", 28, "2025-02-06", "Pete Vargas"],
        ]),
        modulo(EXCELENCIA, "Pós-Reserva: visão geral (2025)", [
          ["Introdução e Sumário do Curso", "fAkF6YMW8nk", 2, "2025-11-03"],
          ["Ações Imediatas Pós-Reserva", "YPQSP1RkbSE", 5, "2025-11-03"],
          ["Preparação da Viagem do Cliente", "r-vE3XhWDVg", 14, "2025-11-03"],
          ["Logística no Destino para o cliente", "a-jDlJ16UUc", 7, "2025-11-03"],
          ["Suporte pro-ativo junto do cliente", "S2KwIRHZiaI", 8, "2025-11-03"],
          ["Gestão e Pós-viagem do Cliente", "14S_SsmJQ_A", 6, "2025-11-03"],
        ]),
        modulo(EXCELENCIA, "Pós-Reserva: os 5 Pilares (2025)", [
          ["Os 5 Pilares da Consultoria no Pós-reserva", "KOeWF17mMYE", 5, "2025-06-30"],
          ["1º Pilar – Documentação + Organização da mesma", "8QLuxDBlHoA", 16, "2025-06-30"],
          ["2º Pilar – E-mails personalizados", "4sguP9_s6zg", 10, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Requisitos de entrada no país + Consulta do Viajante", "IXui-ioMe4g", 7, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Contacto com o Hotel", "OMDkPlVpclE", 10, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Contacto com o Transfer", "dV2kt7lyI34", 5, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Contacto com o Prestador das Atividades/Tours", "Js3PiYeYIg8", 5, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Gerir bagagens, assentos, check-ins de voos", "8mRG_R8XHLA", 7, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Gerir serviços adicionais não comercializados", "CVpxsbUwFbU", 2, "2025-06-30"],
          ["3º Pilar – Cuidados Pré-viagem: Gerir check-in dos cruzeiros", "oy3CMJtOEao", 3, "2025-07-02"],
          ["3º Pilar – Cuidados Pré-viagem: Gerir Envio dos Passaportes", "COvgiIy5uMM", 2, "2025-07-02"],
          ["4º Pilar – Emergências em Destino", "yKdpHDW5pZM", 4, "2025-07-02"],
          ["5º Pilar – Apoio ao Cliente", "P04AMY7jlBw", 4, "2025-07-02"],
        ]),
      ],
    },
    {
      id: CANVA,
      titulo: "Canva: Cria Conteúdo Profissional",
      descricao:
        "Posts, stories, cartão de visita digital e onde encontrar conteúdo pronto da iCliGo para as tuas redes.",
      modulos: [
        modulo(CANVA, "Aulas do curso", [
          ["Porque o Canva é Essencial no Teu Marketing de Conteúdo?", "SVPba7S51Yw", 13, "2025-02-27"],
          ["Cria Posts Irresistíveis para o Instagram no Canva!", "Sou0_-1BKpQ", 9, "2025-02-27"],
          ["Stories Que Convertem: Cria no Canva em Minutos!", "-SFcSur1hp8", 7, "2025-02-27"],
          ["Canva: Como Descarregar o Teu Conteúdo Corretamente", "BO9kyeX5VKI", 2, "2025-02-28"],
          ["Encontra os Teus Links de Consultor na iCliGo!", "hcWG7NuTLQ4", 1, "2025-02-28"],
          ["Stories Que Envolvem: Cria Interatividade no Instagram!", "xOeoHayY7GY", 4, "2025-02-28"],
          ["Onde Encontrar Conteúdo Pronto da iCliGo para as Tuas Redes!", "tOmpCITsyec", 1, "2025-02-28"],
          ["Cria o Teu Cartão de Visita Digital no Canva!", "AuFEl2jygEA", 3, "2025-02-28"],
        ]),
      ],
    },
    {
      id: ACELERACAO,
      titulo: "Aceleração Digital: Domina Ferramentas",
      descricao:
        "Aprende a usar ferramentas digitais para automatizar, comunicar melhor e acelerar o teu crescimento: ChatGPT e follow-up ao contacto.",
      modulos: [
        modulo(ACELERACAO, "ChatGPT ou DeepSeek Inteligente", [
          ["ChatGPT Inteligente: Torna a ferramenta IA ainda mais inteligente!", "E40ZfFjqcg4", 57, "2025-03-01"],
        ]),
        modulo(ACELERACAO, "Chegou um Contacto e Agora?", [
          ["Pontos que Devem ter em Atenção!", "QJTRCxay_Hk", 7, "2025-05-01"],
          ["Qual a 1ª abordagem quando recebo um contacto?", "fQFZuEEoteE", 12, "2025-05-01"],
          ["Como Apresentar o Negócio?", "l_N5QJYxavM", 3, "2025-05-01"],
          ["Reunião Individual Pós-Apresentação?", "Vd-4Rli9zXg", 5, "2025-05-01"],
          ["Follow-up Eficaz – Mensagens", "Gm-rwoON11w", 18, "2025-05-01"],
          ["Follow-up Eficaz – Mail Marketing", "6v0qaCfEog0", 5, "2025-05-01"],
        ]),
      ],
    },
    {
      id: SESSOES_ESSENCIAIS,
      titulo: "Sessões ao Vivo da Equipa",
      descricao:
        "Gravações das formações feitas ao vivo pela equipa: as 7 Skills, mentalidade, vendas, redes sociais e IA.",
      modulos: [
        modulo(SESSOES_ESSENCIAIS, "7 Skills ao Vivo", [
          ["Skill 1 – Prospetar Contactos", "vsKyUOJaD-M", 90, "2026-03-24"],
          ["Skill 2 – Convite", "8rjZHqNdu_8", 34, "2026-04-06"],
          ["Skill 3 – Apresentação (História)", "ncf5mQNcuvs", 23, "2026-04-27"],
        ]),
        modulo(SESSOES_ESSENCIAIS, "Mentalidade e Potencial", [
          ["Formação Mentalidade", "033dPjGtkVY", 52, "2026-06-15"],
          ["Mentalidade", "CstXx7QDC5U", 64, "2026-09-16", "Lara"],
          ["O Sonho", "3LiF9z448GE", 51, "2026-09-16", "Sara"],
          ["Potencial", "3Jx8LsY9rCE", 107, "2026-09-16", "Zé Miguel"],
        ]),
        modulo(SESSOES_ESSENCIAIS, "Vendas, Redes Sociais e IA", [
          ["Excelência nas Vendas", "ImwRcYsGu_4", 106, "2026-09-16", "Sara"],
          ["Redes Sociais", "Jv9BZJMuCAo", 59, "2026-09-16", "Inês Melgão"],
          ["Atração de Leads através das Redes Sociais", "Ov6amQ0eCpA", 61, "2026-07-01", "Jéssica Coelho"],
          ["Dominar a IA no nosso Negócio", "0Tiu1dpepGQ", 73, "2026-07-08", "Joana Massano"],
        ]),
      ],
    },
  ],
  icligo: {
    cursos: [
      {
        id: ICLIGO_ESSENCIAIS,
        titulo: "Devia ser obrigatório assistir!",
        descricao: "Sessões da iCliGo que todos os consultores devem ver.",
        modulos: [
          modulo(ICLIGO_ESSENCIAIS, "Sessões", [
            ["Como Atuar com Excelência quando Surgem Desafios", "1Eiz_oOuPME", 142, "2026-06-22"],
          ]),
        ],
      },
    ],
    externos: [],
  },
};

const reservas: Categoria = {
  id: "reservas",
  titulo: "Reservas",
  descricao:
    "Pesquisa de orçamentos e destinos: aulas gravadas por tipo de pesquisa e por continente, para orçamentares com confiança.",
  disponivel: true,
  cursos: [
    {
      id: GERAIS,
      titulo: "Gerais",
      descricao:
        "Pesquisas que não são de um destino específico: multidestino, cruzeiros, operadores, grupos e mais.",
      modulos: [
    modulo(GERAIS, "Multidestino", [
      ["Circuito pela Riviera Francesa _ Multidestino", "YaUJu1KFUdg", null, "2025-05-06", "Inês Melgão"],
      ["Circuito pelo Japão _ Multidestino", "ic_gB6i0eQk", 36, "2025-04-08", "Marta Coutinho"],
      ["PESQUISA de um pacote no Quénia", "luFcZ-FGpRk", 14, "2025-03-18", "Inês Evaristo"],
      ["PESQUISA de um Circuito na Albânia", "biXkfiaGagQ", 37, "2025-03-04", "Margarida Matos"],
      ["Orçamento Circuito pelas FILIPINAS _ Multidestino", "w5kCDK3fjI0", 60, "2024-11-19", "Mariline Ferreira"],
      ["A experiência de um INTERRAIL", "5HPezfhl5jA", 48, "2024-02-27", "Mariana Figueira"],
      ["PESQUISA de orçamentos nos motores icligo.com", "a3jGS4XTC2Q", 73, "2024-01-30", "Maria João Miranda"],
      ["MILÃO como ponto de partida para vários Destinos", "a5hIKQsnKZU", null, "2023-06-27", "Filipa Leal"],
      ["PESQUISA de Circuito pela COSTA RICA", "r7kcTmvGIew", null, "2023-05-30", "João Ramalho"],
      ["Questões Frequentes sobre Orçamentos e não só!", "Jm1tbJV00as", null, "2023-03-07", "Joana Pinho"],
      ["PESQUISA para circuito EUROPA", "yWe6eN6Vo7E", 63, "2022-11-15", "Sónia Melro"],
      ["PESQUISA para a ÁSIA com o Multidestino", "HDAjpP-A7No", 47, "2022-10-11", "Mariline Ferreira"],
    ]),
    modulo(GERAIS, "Operadores", [
      ["Pesquisa de Orçamento para o MÉXICO + Dúvidas", "wnos3deLEeI", 36, "2025-03-25", "Susana Boavida"],
      ["Pacotes Operador vs Pacotes Dinâmicos _ LISTA de PARCEIROS (Operadores Turísticos) iCliGo", "iorRKdReFv8", null, "2023-02-14", "José Ricardo"],
      ["Pesquisa de Orçamentos na New Blue", "jVYoX1BWlO0", null, "2023-01-17", "Rita Líbano"],
      ["PESQUISA e Operadores para as CARAÍBAS", "5tKjDxFKeIs", 65, "2022-11-29", "Lara Rodrigues"],
      ["PESQUISA para a ILHA do SAL e RIVIEIRA MAYA", "lEXrknNIEPQ", 98, "2022-10-18", "Rúben Freitas"],
    ]),
    modulo(GERAIS, "Cruzeiros", [
      ["Tudo o que precisas saber sobre Pesquisa de Cruzeiros", "INAJfWYymic", 85, "2025-04-15", "Lara Rodrigues"],
      ["PESQUISA de orçamentos para CRUZEIROS", "zkujJoETxrA", null, "2023-11-21", "Eugénia Fernandes"],
      ["PESQUISA de CRUZEIROS", "ToIlETqCHoI", 110, "2022-10-04", "Lara Rodrigues"],
    ]),
    modulo(GERAIS, "Grupos", [
      ["PESQUISA de Orçamentos para muitas pessoas e Pedido de Grupos", "0nRKMqQCV_4", 50, "2022-12-20", "Rúben Freitas"],
    ]),
    modulo(GERAIS, "Dia dos Namorados", [
      ["PESQUISA de Voo + Hotel para o dia dos namorados", "AxtDtT1_T5M", null, "2023-01-31", "Cláudia Santos"],
    ]),
    modulo(GERAIS, "Viagens em Família", [
      ["Viagens em Família - Dicas", "F-gKq2Wwd8M", 49, "2025-04-01", "Joana Rodrigues"],
    ]),
      ],
    },
    {
      id: DESTINOS,
      titulo: "Por Destinos",
      descricao:
        "Um separador por continente, com as aulas de destino e de pesquisa de orçamento juntas — o que o torna especial, o que visitar e como orçamentar.",
      modulos: [
    modulo(DESTINOS, "Continente Europeu", [
      ["RIVIERA FRANCESA como destino de férias", "VtPuITSaN-g", 44, "2025-05-06", "Inês Melgão"],
      ["ALBÂNIA como destino de férias", "tXPPh8wHDhM", 31, "2025-03-04", "Margarida Matos"],
      ["GRÉCIA: Quais as melhores ilhas a visitar", "JlSO2WpLnyA", 72, "2025-02-25", "Rita Neto"],
      ["NORUEGA como destino de férias", "b5YdgHxZSKg", 46, "2025-01-21", "Luis Rodrigues"],
      ["LAPÓNIA como destino de férias & Criação do Circuito", "KEydOXmehUI", 46, "2024-11-26", "Marisa Araújo"],
      ["Mercadinhos de Natal – ORÇAMENTO", "KnEPkKpVNWU", 51, "2024-09-17", "Inês Melgão"],
      ["ATENAS como destino de férias", "UkQ9qQocDdc", 50, "2024-07-09", "Ana Gama"],
      ["PESQUISA de orçamento para a BULGÁRIA", "X9GBVvgFUmc", 49, "2024-05-21", "Margarida Matos"],
      ["SARDENHA como destino de férias", "-HZF9dUb_O0", 52, "2024-05-14", "Ema Aldeano"],
      ["Os BÁLTICOS como destino de férias", "KId8xphRNvM", 30, "2024-04-30", "Maria João Miranda"],
      ["ISLÂNDIA como destino de férias", "sQ1kkKnOsmU", 56, "2024-04-16", "Edgar Santos & Jani Domingues"],
      ["ITÁLIA como destino de férias", "VWMgAfs7L2M", 70, "2024-04-09", "Sara Santos"],
      ["PESQUISA de orçamento para a DISNEYLAND PARIS", "bAaLhFIiHOE", 47, "2024-03-12", "Raquel Santos"],
      ["PESQUISA de orçamento para LONDRES e de LONDRES", "HoGWTgW7ewE", null, "2023-07-18", "Andreia Carrasco"],
      ["LITUÂNIA como destino de Férias", "P-7288pNxeo", null, "2023-06-20", "Filipe Teixeira"],
      ["PESQUISA de Orçamento para o CHIPRE", "hn-gm1W9m-Y", null, "2023-03-21", "Andreia Dias"],
      ["AÇORES como destino de férias", "QMV-BFricy0", null, "2023-01-24", "José Franco"],
      ["PESQUISA para a CROÁCIA", "6kbbGV5VbwE", 75, "2022-11-08", "Rita Líbano"],
      ["PESQUISA para a DISNEYLAND PARIS", "v-4WFK2-5Rs", 91, "2022-10-25", "Mariline Ferreira"],
      ["PESQUISA para a ILHA da MADEIRA", "bytJCZuDBmA", 55, "2022-09-13", "Cláudia Santos"],
      ["Andaluzia com destino de Férias", "ZHunL_k-bcU", 47, "2022-07-26", "Adília & Nuno Mendes"],
      ["SERRA NEVADA (Neve) como destino para férias", "dWxC8dknuiM", 44, "2021-12-09", "Cláudia Santos"],
      ["Costa AMALFITANA como destino de férias", "s60p4a57woc", 30, "2021-10-05", "Ângela Sousa"],
      ["Circuito pela TOSCANA como destino de férias", "F9gYLW_B-bY", 47, "2021-09-21", "Cláudia Santos"],
      ["BARCELONA como City Break", "8Xk4VHJQz4M", 59, "2021-07-20", "Maria Eduarda"],
      ["ILHA DO PICO como destino de Férias", "wyERd_DB3Zc", 52, "2021-06-22", "Catarina Duarte"],
      ["MALTA como destino de Férias", "C6xFni5XNUs", 80, "2021-06-08", "Ana Casimiro"],
      ["Circuito pelos Balcãs", "b3gwyfi4n6I", 84, "2021-04-05", "Luís Rodrigues"],
      ["Paris e DisneyLand", "9Y7SrdfQtcY", 64, "2021-03-22", "Filipa Oliveira"],
      ["Programação de uma Viagem Circuito de Mota pela Europa", "Qmu2eS7eYJs", 63, "2021-03-08", "José Miguel"],
      ["TENERIFE como Destino de Férias e a Visitar", "uPw3uTsWpM8", 73, "2020-12-14", "Rafaela Ferreira"],
      ["AÇORES (Ilha São Miguel) como Destino de Férias", "sVVDXzkclrQ", 62, "2020-11-23", "Joana Pinho"],
      ["MADEIRA como Destino de Férias", "bzHJVPe81v8", 67, "2020-10-19", "Joana Figueira"],
      ["Roteiro por Portugal Continental", "_kODLxgHXgI", 87, "2020-10-08", "Mariana Fernandes"],
      ["Guia Turístico da Ilha Grega Corfu", "IbUQjDRz6A0", 66, "2020-08-03", "Mariana Pires"],
      ["Circuito pela Turquia de 9 dias", "F4WXkj1HYzs", 69, "2020-02-11", "Susana Agostinho"],
    ]),
    modulo(DESTINOS, "Continente Africano", [
      ["CAPE TOWN (Cidade do Cabo) como destino de férias", "MYtVzqOurj8", 35, "2025-05-20", "Maria Taquelim"],
      ["SÃO TOMÉ como destino de férias", "Fs4HXyt71hc", 40, "2025-05-13", "Marisa Araújo"],
      ["QUÉNIA como destino de férias", "zMy-OQ4ceNQ", 16, "2025-03-18", "Inês Evaristo"],
      ["DJERBA como destino de férias", "_HTpBJXQ00Y", 40, "2024-12-03", "Ana Caiola"],
      ["Road Trip por MARROCOS", "cuak5-WTFB8", 51, "2024-07-16", "Maria Taquelim"],
      ["SENEGAL como destino de férias", "_l3lw782tFc", 50, "2024-05-07", "Andreia Dias"],
      ["PESQUISA de orçamento para MARROCOS", "gUZtzPTF9vs", null, "2024-01-01"],
      ["SEYCHELLES como destino de Férias", "fky7a90JgwA", null, "2023-11-14", "Maria João Miranda"],
      ["EGITO como destino de Férias", "5bMEcaoIpvw", null, "2023-10-03", "Tânia Reguengo"],
      ["PESQUISA de Orçamentos para Zanzibar (Tanzânia)", "R1Ydh-DR9k4", null, "2023-02-28", "Filipa Leal"],
      ["ZANZIBAR como destino de Férias", "zKpgzUczrTw", 44, "2022-11-01", "Filipa Leal"],
      ["Cabo Verde como destino de férias", "i0nZu2MnyAI", 80, "2022-06-02", "Naiza Oliveira"],
      ["MAURÍCIAS como destino de férias", "4RXNJysIsv8", 31, "2022-03-31", "Andreia Carrasco"],
      ["SÃO TOMÉ como destino de férias", "g41Ly0yxxTE", 71, "2021-11-11", "Susana Agostinho"],
      ["Quénia como destino de férias", "-PtD27uub-o", 62, "2021-05-25", "Cláudia Santos"],
      ["Namíbia como Destino para Safaris e não só!", "r5cEwloUHJE", 92, "2020-08-17", "Andreia Dias"],
    ]),
    modulo(DESTINOS, "Continente Asiático", [
      ["JAPÃO como destino de férias", "8K7QUBciDLA", 14, "2025-04-08", "Marta Coutinho"],
      ["MALDIVAS como destino de férias", "Xkl5FSR-Gec", 52, "2024-11-12", "Zé Miguel"],
      ["EMIRADOS ÁRABES UNIDOS como destino de férias", "16hQgJSL7iE", 65, "2024-06-18", "Inês Rodrigues"],
      ["ÍNDIA como destino de férias", "ocWzWiGv-rM", 62, "2024-02-06", "Susana Boavida"],
      ["OMÃ como destino de férias", "IGD0KwGdMDY", 59, "2024-01-16", "Maria Taquelim"],
      ["JAPÃO como destino de férias", "RWCKE8vBQrs", null, "2023-11-28", "Mariana Figueira"],
      ["SRI LANKA como destino de Férias", "jRmObX5IB0A", null, "2023-10-24", "Marisa Vieira"],
      ["PESQUISA de orçamentos para Istambul + Capadócia + Pamukkale", "8m7e8_ACZfE", null, "2023-10-17", "Mariana Figueira"],
      ["TAILÂNDIA como destino de Férias", "LWglEgkwOlw", null, "2023-04-18", "Mariana Figueira"],
      ["JORDÂNIA como destino de Férias", "a7uKDFHY3gs", null, "2023-03-28", "Maria João Miranda"],
      ["PESQUISA de Orçamentos para MALDIVAS", "qun6aJdfygQ", 45, "2022-12-27", "Mariline Ferreira"],
      ["SINGAPURA & INDONÉSIA como destino de Férias", "LHUumVQnrdo", 107, "2022-12-13", "Joana Pinho"],
      ["BALI como destino de férias", "bX_HMCV5cWE", 51, "2022-05-12", "Mariline Ferreira"],
      ["China como destino de férias", "GcmU2d6rFEU", 80, "2022-04-21", "Luís Rodrigues"],
      ["FILIPINAS como destino de Férias", "KF51pDDBlRk", 68, "2022-02-24", "Andreia Dias"],
      ["Vietnam como destino para férias", "qjpBCQhnsyw", 51, "2022-01-20", "Mariline Ferreira"],
    ]),
    modulo(DESTINOS, "Continente Americano", [
      ["Nova Iorque como destino de férias", "6ZJP4u4YHwc", 60, "2025-04-29", "Francisca S. & David M."],
      ["MÉXICO como destino de férias", "cYOXAcvq71w", 25, "2025-03-25", "Susana Boavida"],
      ["ARUBA como destino de férias", "H8ZR3Nf-UoQ", 40, "2025-02-04", "Maria Taquelim"],
      ["CUBA como destino de férias", "Zk8FZWdQs_o", 59, "2024-10-22", "Madalena Antunes"],
      ["PESQUISA de orçamento para as BAHAMAS", "gQvfhW6C6MY", 79, "2024-07-02", "Alexia Neves"],
      ["NOVA IORQUE como destino de férias", "em7LBTpQJAs", 41, "2024-06-25", "Daniela Casimiro"],
      ["PANAMÁ como destino de férias", "ztTedwdr2WI", 61, "2024-06-04", "Maria Taquelim"],
      ["RoadTrip pela zona OESTE dos EUA", "pE3CdAXSy0Q", 53, "2024-03-26", "Inês Afonso"],
      ["CURAÇAU como destino de férias", "Z_hQivNCjgo", 53, "2024-03-05", "Maria Taquelim"],
      ["PERU como destino de Férias", "vOklu0wNwaA", null, "2023-06-06", "Mariline Ferreira"],
      ["GUADALUPE como destino de Férias", "Xoz0ZPmHgjc", null, "2023-05-16", "Alexia Neves"],
      ["PUNTA CANA como destino de Férias", "gbI5ph7H2cw", 56, "2021-07-13", "Christelle Fernandes"],
      ["COSTA RICA como Destino de Férias", "BuJt0EDyurc", 66, "2020-11-30", "Andreia Dias"],
      ["Cuba como Destino nas Caraíbas", "zeQ0w2aYvUg", 86, "2020-08-24", "Daniela Batista"],
    ]),
      ],
    },
    {
      id: SESSOES_RESERVAS,
      titulo: "Sessões ao Vivo da Equipa",
      descricao: "Consultores da equipa partilham como pesquisam, orçamentam e trabalham as reservas.",
      modulos: [
        modulo(SESSOES_RESERVAS, "Partilhas", [
          ["Sal noutro Ângulo de Visão", "LwbgRMnevkc", 128, "2026-02-26", "Marta Mateus"],
          ["Metodologia de Trabalho", "cnjnSxtbBpA", 25, "2026-07-01", "Cátia Rafael"],
          ["Sessão com o Tiago Magano", "klrktCG5RdQ", 22, "2026-06-08", "Tiago Magano"],
        ]),
      ],
    },
  ],
  icligo: {
    cursos: [],
    externos: RESERVAS_ICLIGO,
  },
};

const equipa: Categoria = {
  id: "equipa",
  titulo: "Equipa",
  descricao:
    "Masterclasses, formações intensivas e o curriculum internacional do Eric Worre: para desenvolver o negócio e a equipa a longo prazo.",
  disponivel: true,
  cursos: [
    {
      id: MASTERCLASSES,
      titulo: "Masterclasses Especiais",
      descricao:
        "As 11 Formações Intensivas da comunidade: marketing digital, CANVA, campanhas BLITZ, histórias de sucesso e muito mais.",
      modulos: [
    modulo(MASTERCLASSES, "[F.I. 11] Formação Intensiva 11 – O Desenvolvimento Pessoal como Chave para o teu Sucesso", [
      ["Introdução: O Desenvolvimento Pessoal como Chave para o teu Sucesso", "b9ll35gOPVg", 7, "2023-09-13", "José Ricardo"],
      ["O Desenvolvimento Pessoal como Chave para o teu Sucesso", "lME6EhUuA8g", 55, "2023-09-13", "Coach Bruno Mendo"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 9] Formação Intensiva 9 – Integração de um Novo Afiliado", [
      ["Fundamentos e Objetivo da Integração", "oi9OqzDxZH8", 12, "2023-05-31", "José Ricardo"],
      ["Ação nº1 _ Boas Vindas", "u71X2oA0YGI", 5, "2023-05-31", "José Ricardo"],
      ["Ação nº2 _ Principal Canal de Comunicação", "zxdMO-JxJr8", 2, "2023-05-31", "José Ricardo"],
      ["Ação nº3 _ As primeiras 3 TAREFAS", "or7Ik9ifuM8", 4, "2023-05-31", "José Ricardo"],
      ["Ação nº4 _ A 4ª TAREFA", "7hphHG74_C4", 2, "2023-05-31", "José Ricardo"],
      ["Ação nº5 _ A 5ª e última TAREFA", "J2quEh4pVGE", 3, "2023-05-31", "José Ricardo"],
      ["AÇÃO Primordial e Fundamental", "Kfrryw3VOog", 10, "2023-05-31", "José Ricardo"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 6] Formação Intensiva 6 – Lançamento de Campanhas BLITZ", [
      ["Sumário: Lançamento de Campanhas BLITZ", "iek1rhTJxDw", 3, "2023-02-25", "José Ricardo"],
      ["Comunicação nas Redes Sociais: Perfil nas Redes!", "FRcj6udhvNo", 11, "2023-02-25", "Sara Miranda"],
      ["Comunicação nas Redes Sociais: Definição e Descrição da Campanha", "gl1HKxmGYsI", 20, "2023-02-25", "Sara Miranda"],
      ["Comunicação nas Redes Sociais: Plano de Ação para o Lançamento BLITZ", "Lff_g6st_Mo", 30, "2023-02-25", "Sara Miranda"],
      ["Orçamentar de Forma Otimizada", "PuJJehyw_Xg", 26, "2023-02-25", "José Ricardo"],
      ["Como obter os links trackeados com a vossa identificação?", "yjBFyMcUviA", 7, "2023-02-25", "José Ricardo"],
      ["Do acompanhamento ao fecho do Orçamento", "8dYX0CDeZeo", 18, "2023-02-25", "Joana Pinho"],
      ["Pós-venda do Orçamento: Dicas Importantes", "ceNqZiUr0F4", 33, "2023-02-25", "Mariline Ferreira"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 5] Formação Intensiva 5 – Skills para o Network Marketing", [
      ["Sumário: Skills para o Network Marketing", "40uMTA4AwW8", 4, "2023-01-28", "José Ricardo"],
      ["Lista de Contactos e Objetivo do Contacto", "fAAoGbfR4Ts", 22, "2023-01-28", "José Ricardo"],
      ["Convite para Agendamento da Apresentação", "HIjJ2VLrOoA", 32, "2023-01-28", "Joana Pinho"],
      ["Métodos para fazer a Apresentação da Oportunidade", "6kC6HpAdjBs", 31, "2023-01-28", "Joana Pinho"],
      ["Acompanhamento após a Apresentação", "AHkBBBhzYF4", 18, "2023-01-28", "José Ricardo"],
      ["Como Dominar Objeções?", "RzHhcZnMBzw", 18, "2023-01-28", "Joana Pinho"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 4] Formação Intensiva 4 – Metas 2023", [
      ["Sumário: Metas 2023", "ez4n8PqipMs", 5, "2023-01-03", "José Ricardo"],
      ["Network Marketing _ As Histórias!", "JrHWueyMlPY", 45, "2023-01-03", "Patrick B. | Joana P. | Fábio P. | Rúben F."],
      ["Poder dos Números", "5XYvTKgYn0E", 20, "2023-01-03", "José Ricardo"],
      ["Definição de OBJETIVOS", "aGRzcTgL-Tk", 22, "2023-01-03", "José Ricardo"],
      ["Plano de Ação _ As Histórias!", "tHvqZqejSug", 35, "2023-01-03", "Rúben F. | Fábio P. | Joana P. | Patrick B."],
      ["Potencial do Negócio", "9Epo4P_2mYY", 13, "2023-01-03", "José Ricardo"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 3] Formação Intensiva 3 – Segredos do CANVA", [
      ["Sumário: Segredos do CANVA", "5Tf_QkhWI8s", 2, "2022-11-19", "José Ricardo"],
      ["Marketing de Conteúdo", "C-17MNE1t-0", 23, "2022-11-19", "Joana Pinho"],
      ["Conteúdo criado no CANVA para Interação", "bPdw9QydjLs", 32, "2022-11-19", "Joana Pinho"],
      ["Conteúdo criado no CANVA para Informação", "ZGV1ti4kKts", 12, "2022-11-19", "Joana Pinho"],
      ["Conteúdo criado no CANVA para Anúncios", "kSumloMbYDg", 63, "2022-11-19", "José Ricardo"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 2] Formação Intensiva 2 – Preparação para o Online", [
      ["Sumário: Preparação para o Online", "u9y3wjZtxGg", 3, "2022-10-28", "José Ricardo"],
      ["Profissionalizar os Perfis Online", "q55rgS_2L-o", 41, "2022-10-28", "Joana Pinho"],
      ["Ferramentas para a Criação e Edição de Conteúdo", "EJqQOXmNeSY", 32, "2022-10-28", "José Ricardo"],
      ["Organização e Gestão do Conteúdo para as Redes Sociais", "HOf9kRUCwCE", 34, "2022-10-28", "Sara Miranda"],
      ["Preparação para o Marketing Digital", "TSGdg-TmpH8", 43, "2022-10-28", "Patrick Barros"],
    ]),
    modulo(MASTERCLASSES, "[F.I. 1] Formação Intensiva 1 – Estratégia, Potencial, Metas e Visão", [
      ["Sumário: Estratégia, Potencial, Metas e Visão", "Zl5ek12GkII", 4, "2022-09-27", "José Ricardo"],
      ["Estratégia de Marketing da iCliGo", "o2SCnC3GBpQ", 33, "2022-09-27", "José Ricardo"],
      ["Potencial da iCliGo e Metas para o Afiliado", "36I-GdZpmiA", 34, "2022-09-27", "José Ricardo"],
      ["Visão de Carreira para o Afiliado", "uOFp1w3DJn0", 23, "2022-09-27", "José Ricardo"],
    ]),
      ],
    },
    {
      id: EW_PRIMEIROS_PASSOS,
      titulo: "Eric Worre: Primeiros Passos",
      descricao: "O início do curriculum internacional do Eric Worre — os primeiros passos como afiliado, adaptados à nossa comunidade.",
      modulos: [
    modulo(EW_PRIMEIROS_PASSOS, "Descrição do Curso", [
      ["Bem vindo aos Primeiros Passos", "nvlBMB6Xru4", null, "2021-01-01"],
      ["Tu Fizeste a Escolha Certa", "OX2bi6Lb_z4", null, "2021-01-01"],
      ["Ascensão do Empreendedor", "vYfhYftWYPs", null, "2021-01-01"],
      ["Estabelecer Expectativas Reais", "67QnlQFLws4", null, "2021-01-01"],
      ["Envolve-te da Maneira Mais Eficiente", "Q5Sm8xvILSY", null, "2021-01-01"],
      ["Torna-te num fã entusiasmado!", "4Wp4PC0AOf8", null, "2021-01-01"],
      ["O Plano de Remuneração", "OEaFG3vjGAs", null, "2021-01-01"],
      ["Como Gerir o Tempo e as Tarefas", "Z_j7wLoSp_w", null, "2021-01-01"],
      ["Como Contar a Tua História?", "6143mkqZzDA", null, "2021-01-01"],
      ["Ganhar o teu Primeiro Cliente & Distribuidor", "xft7onV03Yk", null, "2021-01-01"],
      ["Eventos da Empresa", "qV0U45IlLMc", null, "2021-01-01"],
      ["Workbook", null, null, "2021-01-01"],
    ]),
      ],
    },
    {
      id: EW_INFLUENCIA,
      titulo: "Eric Worre: Aumenta a tua Influência",
      descricao: "Como usar as redes sociais para construir a tua marca, a tua rede e converter contactos em clientes e distribuidores.",
      modulos: [
    modulo(EW_INFLUENCIA, "Descrição do Curso", [
      ["Porquê as Redes Sociais no Network Marketing?", "lEjbNgCW440", null, "2021-01-01"],
      ["Construir a Tua Marca Online", "5EkUFxfm_XY", null, "2021-01-01"],
      ["Aumenta a Tua Rede de Amigos, Seguidores e Fãs", "XbRIKWQoiX4", null, "2021-01-01"],
      ["Como converter os contactos das Redes Sociais?", "-SScQakcf1k", null, "2021-01-01"],
      ["Converter Contactos em Clientes e Distribuidores", "jRfsaqV-Nxk", null, "2021-01-01"],
      ["As Redes Sociais como Forma de Comunicar e Treinar a Equipa", "QCEz1UaheWo", null, "2021-01-01"],
      ["Duplicar esta Estratégia das Redes Sociais em Equipa", "LLY6YTNi06Y", null, "2021-01-01"],
      ["Workbook", null, null, "2021-01-01"],
    ]),
      ],
    },
    {
      id: EW_ESTRATEGIA,
      titulo: "Eric Worre: Estratégia Relâmpago",
      descricao: "O plano de 30 dias para acelerares resultados: calendário, funil, fecho de objeções e apoio aos teus afiliados.",
      modulos: [
    modulo(EW_ESTRATEGIA, "Descrição do Curso", [
      ["A Tua Vida pode Mudar", "4MKAeg050CU", null, "2021-01-01"],
      ["O Calendário", "o9zx1wD6amQ", null, "2021-01-01"],
      ["Preparação", "ZMgnpzcXFwA", null, "2021-01-01"],
      ["Preencher o Funil", "gBX6c35Klp4", null, "2021-01-01"],
      ["Conta a tua História", "8KeORR_TJ1I", null, "2021-01-01"],
      ["Fechar, Objeções e Acompanhamento", "8NL6qDa6jCM", null, "2021-01-01"],
      ["Como te Asseguras que Tens 20 em 30 Dias", "5Qkqx230yp8", null, "2021-01-01"],
      ["Ajuda os Teus Afiliados a Começar", "uYeln7j58a4", null, "2021-01-01"],
      ["20 em 30: Recapitular", "MC-8ZIH_W5g", null, "2021-01-01"],
      ["Workbook", null, null, "2021-01-01"],
      ["Material de Suporte", null, null, "2021-01-01"],
      ["Memory Jogger", null, null, "2021-01-01"],
      ["Lista de Candidatos / Calendário", null, null, "2021-01-01"],
    ]),
      ],
    },
    {
      id: EW_CONFIANCA,
      titulo: "Eric Worre: Confiança Inquebrável",
      descricao: "Crenças, apresentações e como dominar objeções — a mentalidade para venderes e liderares com confiança.",
      modulos: [
    modulo(EW_CONFIANCA, "Confiança Imparável", [
      ["Bloqueios para a Confiança Imparável", "fCbpA_hKEco", null, "2021-01-01"],
      ["Histórias Colocar Sementes de Confiança", "xBTWelTufCo", null, "2021-01-01"],
      ["Dominar Apresentações", "vm_Z2Ho6vIk", null, "2021-01-01"],
      ["Treinar os Outros", "_sNDGlPfP5w", null, "2021-01-01"],
      ["Crenças Potenciadoras sobre Autovalorização", "I0c4mhfd6IE", null, "2021-01-01"],
      ["Três Conjuntos de Crenças para seres Confiante", "M-ClIKkLbRo", null, "2021-01-01"],
      ["Ganhar Confiança Tornando Obstáculos em Oportunidades", "m_DGU7a5XpA", null, "2021-01-01"],
      ["Acabar com a Procrastinação", "2lRwIzxgoj8", null, "2021-01-01"],
      ["Competência", "MDzNHjsA_ho", null, "2021-01-01"],
      ["Introspecção", "gvrrHDsmvHI", null, "2021-01-01"],
      ["Material de Apoio", null, null, "2021-01-01"],
    ]),
    modulo(EW_CONFIANCA, "Dominar Objecções", [
      ["Redefinir Objeções", "ESpafeLK-kg", null, "2021-01-01"],
      ["Mentalidade Necessária para ser Bem Sucedido", "bswmJKL-W68", null, "2021-01-01"],
      ["Quatro Etapas para Lidar com Objeções", "DEkw0zHRDOs", null, "2021-01-01"],
      ["As Objeções mais Comuns_parte1", "eL1R2PBOdAk", null, "2021-01-01"],
      ["As Objeções mais Comuns_parte2", "Q00DziEQzDY", null, "2021-01-01"],
      ["Workbook", null, null, "2021-01-01"],
      ["Amostra de Scripts", null, null, "2021-01-01"],
    ]),
      ],
    },
    {
      id: EW_COMPETENCIAS,
      titulo: "Eric Worre: Competências Essenciais",
      descricao: "Nunca esgotar potenciais clientes, convidar com eficácia e construir uma equipa que duplica.",
      modulos: [
    modulo(EW_COMPETENCIAS, "Ilimitado", [
      ["Como Nunca Esgotar Potenciais Clientes de Qualidade", "TYjqXXp0TlI", null, "2021-01-01"],
      ["Primeiro Passo", "6iDw5cNuGG4", null, "2021-01-01"],
      ["Expande a Tua Lista Constantemente", "D_upGo5RPgA", null, "2021-01-01"],
      ["Memory Jogger", null, null, "2021-01-01"],
    ]),
    modulo(EW_COMPETENCIAS, "Convidar", [
      ["Destrancar a Porta: A chave é Convidar!", "qnbyGZBvUsE", null, "2021-01-01"],
      ["Diferentes Tipos de Exposição", "rcPeX7gWH04", null, "2021-01-01"],
      ["Fundamentos do Convite", "Izt6si7ZTtw", null, "2021-01-01"],
      ["Como Convidar?", "1I2DSeOuz6w", null, "2021-01-01"],
      ["Workbook", null, null, "2021-01-01"],
      ["Material de Apoio", null, null, "2021-01-01"],
    ]),
    modulo(EW_COMPETENCIAS, "Duplicação Radical", [
      ["Faz Crescer o Teu Negócio de Network Marketing com Duplicação", "D54PF0jEPtA", null, "2021-01-01"],
      ["Constrói Uma Equipa Que Duplica", "PJ1tvMaqAiE", null, "2021-01-01"],
      ["Os 4 Pilares da Duplicação_parte1", "rHCIYTPKlc0", null, "2021-01-01"],
      ["Os 4 Pilares da Duplicação_parte2", "jDnTarkL2BM", null, "2021-01-01"],
      ["Os 4 Pilares da Duplicação_parte3", "cbayPQsdS7M", null, "2021-01-01"],
      ["Material de Apoio", null, null, "2021-01-01"],
      ["Fundamentos da Duplicação", null, null, "2021-01-01"],
      ["Guideline de Duplicação", null, null, "2021-01-01"],
    ]),
      ],
    },
    {
      id: EW_PROFISSIONAIS,
      titulo: "Eric Worre: Profissionais de Network Marketing",
      descricao: "Conteúdo dos eventos internacionais GoPro Recruiting Mastery 2019 e Powerful Women 2020.",
      modulos: [
    modulo(EW_PROFISSIONAIS, "GoPro Recruiting Mastery 2019", [
      ["Painel de CEOs", "7HI0DY-0L_Y", null, "2021-01-01"],
      ["Casos de Estudo 1 & 2", "fMCuWOj15DM", null, "2021-01-01"],
      ["Frazer Brookes", "xaM3oM0NIyo", null, "2021-01-01"],
      ["Cerimónia de Prémios Quadro de Honra 1 Milhão $", "jh7N6PeMHw0", null, "2021-01-01"],
      ["Armand Puyolt", "d5MKYGkMdY8", null, "2021-01-01"],
      ["Formação 7 Skills_parte1", "Q0Nxj_dcvBA", null, "2021-01-01"],
      ["Formação 7 Skills_parte2", "ISxMqZoXAxY", null, "2021-01-01"],
      ["Tom Chenault", "xDb37NSEuso", null, "2021-01-01"],
      ["Jordan Adler", "hpkhJcipt-4", null, "2021-01-01"],
      ["Casos de Estudo 3 - 7", "xpQjT27NN8E", null, "2021-01-01"],
      ["Grant Cardone", "pnt_2GGhSZc", null, "2021-01-01"],
      ["Antonio Martinez", "moz2nBZwuVk", null, "2021-01-01"],
      ["Jessie-Lee Ward", "7rutUvlYo94", null, "2021-01-01"],
      ["Darnell Self", "Wg4Of4tlLg4", null, "2021-01-01"],
    ]),
    modulo(EW_PROFISSIONAIS, "Powerful Women 2020", [
      ["Convite & Apresentação", "7G_X3suVhIA", null, "2021-01-01"],
      ["Painel Mães Empreendedoras", "Nw9Hc1UC8Vk", null, "2021-01-01"],
      ["Duplicação", "Rt-2Ir3Sy3c", null, "2021-01-01"],
      ["Competências de Liderança", "8UqlwgQ6aYU", null, "2021-01-01"],
      ["Torna-te Confiante", "LUp6bFygYyQ", null, "2021-01-01"],
      ["Painel com Casais do Network Marketing", "K_MFPaWx3uU", null, "2021-01-01"],
      ["Relações Profissional | Pessoal", "pXvrm3sTES8", null, "2021-01-01"],
    ]),
      ],
    },
  ],
  icligo: {
    cursos: [],
    externos: [
      cursoAcademy("be-a-pro", "Sessões Semanais Be a Pro", "Criação de Equipa"),
      cursoAcademy("da-duvida-a-decisao", "Da Dúvida à Decisão", "Criação de Equipa"),
      cursoAcademy("be-a-pro-5", "Be a Pro", "Criação de Equipa"),
    ],
  },
};

/** Ordem em que os cards aparecem em /consultor/formacoes. */
export const CATEGORIAS_FORMACOES: Categoria[] = [essenciais, reservas, equipa];

export function procurarCategoria(id: string): Categoria | null {
  return CATEGORIAS_FORMACOES.find((c) => c.id === id) ?? null;
}

/** Cursos com aulas, da Tropa de Elite e da iCliGo. */
function todosOsCursos(categoria: Categoria): Curso[] {
  return [...categoria.cursos, ...categoria.icligo.cursos];
}

/** Cursos com aulas mais os cursos da iCliGo Academy. */
export function contarCursos(categoria: Categoria): number {
  return todosOsCursos(categoria).length + categoria.icligo.externos.length;
}

/**
 * Aulas com vídeo (as outras ainda não se podem ver) mais as lições listadas
 * da iCliGo Academy.
 */
export function contarAulas(categoria: Categoria): number {
  const videos = todosOsCursos(categoria).reduce(
    (total, curso) =>
      total + curso.modulos.reduce((t, m) => t + m.aulas.filter((a) => a.youtube !== null).length, 0),
    0,
  );
  const licoes = categoria.icligo.externos.reduce(
    (total, curso) => total + curso.modulos.reduce((t, m) => t + m.licoes.length, 0),
    0,
  );
  return videos + licoes;
}

/** Todos os ids de aulas existentes — para recusar marcações de aulas inventadas. */
export function todosOsIdsDeAulas(): Set<string> {
  const ids = new Set<string>();
  for (const categoria of CATEGORIAS_FORMACOES) {
    for (const curso of todosOsCursos(categoria)) {
      for (const m of curso.modulos) for (const a of m.aulas) ids.add(a.id);
    }
  }
  return ids;
}
