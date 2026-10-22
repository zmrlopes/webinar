import { dataLisboa } from "./data-lisboa";

/** Referências consultadas em 22/10/2026. Os textos são reflexões originais,
 * adaptadas ao trabalho do consultor, e não citações dos formadores. */
export const REFERENCIAS_FRASE_DO_DIA = {
  eric: {
    nome: "Eric Worre",
    url: "https://blog.networkmarketingpro.com/the-7-skills-that-can-ensure-success-in-network-marketing/",
  },
  sandro: { nome: "Sandro Cazzato", url: "https://www.sandrocazzato.com/" },
  daniel: { nome: "Daniel G", url: "https://certified.danielgmedia.com/sales-training" },
  jim: { nome: "Jim Rohn", url: "https://www.jimrohn.com/about/legacy" },
  ray: { nome: "Ray Higdon", url: "https://rayhigdon.com/successful-in-a-mlm/" },
} as const;

type Referencia = keyof typeof REFERENCIAS_FRASE_DO_DIA;
interface Frase { texto: string; tema: string; referencia: Referencia }

// A ordem é estável: a mesma data mostra sempre a mesma frase, em todos os dispositivos.
export const FRASES_DO_DIA: readonly Frase[] = [
  { texto: "O teu negócio ganha força quando ajudas outra pessoa a dar o primeiro passo.", tema: "Crescer em equipa", referencia: "eric" },
  { texto: "Uma rede sólida constrói-se com pessoas acompanhadas e relações de confiança.", tema: "Relações", referencia: "sandro" },
  { texto: "Antes de apresentares a oportunidade, descobre o que a outra pessoa procura.", tema: "Saber ouvir", referencia: "daniel" },
  { texto: "O tempo que dedicas a aprender melhora a forma como serves clientes e equipa.", tema: "Desenvolvimento pessoal", referencia: "jim" },
  { texto: "Reserva hoje espaço na agenda para a atividade que queres tornar consistente.", tema: "Consistência", referencia: "ray" },
  { texto: "Uma apresentação simples dá à equipa um exemplo que consegue repetir.", tema: "Duplicação", referencia: "eric" },
  { texto: "A mentoria transforma uma entrada na equipa num caminho acompanhado.", tema: "Mentoria", referencia: "sandro" },
  { texto: "Uma boa pergunta aproxima-te mais da pessoa do que uma resposta ensaiada.", tema: "Conversas", referencia: "daniel" },
  { texto: "Os hábitos que escolhes hoje dão direção ao negócio que estás a construir.", tema: "Hábitos", referencia: "jim" },
  { texto: "A próxima conversa merece a tua atenção, independentemente da resposta anterior.", tema: "Persistência", referencia: "ray" },
  { texto: "O acompanhamento faz parte do serviço, mesmo depois da primeira apresentação.", tema: "Acompanhamento", referencia: "eric" },
  { texto: "Trata cada novo consultor como alguém com um projeto próprio a desenvolver.", tema: "Empreender em equipa", referencia: "sandro" },
  { texto: "Apresenta uma viagem a partir do que o cliente valoriza na experiência.", tema: "Servir o cliente", referencia: "daniel" },
  { texto: "Um objetivo torna-se mais concreto quando lhe atribuis uma tarefa na agenda.", tema: "Objetivos", referencia: "jim" },
  { texto: "Uma rotina simples ajuda-te a continuar nos dias com menos motivação.", tema: "Disciplina", referencia: "ray" },
  { texto: "Convidar é abrir espaço para alguém conhecer e decidir por si.", tema: "Convites", referencia: "eric" },
  { texto: "A confiança da tua rede também depende da clareza com que explicas o negócio.", tema: "Profissionalismo", referencia: "sandro" },
  { texto: "Quando compreendes a dúvida, consegues responder com mais utilidade e menos pressão.", tema: "Objeções", referencia: "daniel" },
  { texto: "Aprender uma competência nova alarga as ferramentas que levas para cada desafio.", tema: "Aprendizagem", referencia: "jim" },
  { texto: "O compromisso diário fica mais leve quando sabes exatamente qual é a próxima ação.", tema: "Foco", referencia: "ray" },
  { texto: "Ajuda quem começa a praticar uma competência de cada vez.", tema: "Primeiros passos", referencia: "eric" },
  { texto: "Uma equipa cresce com mais autonomia quando a mentoria desenvolve pessoas.", tema: "Liderança", referencia: "sandro" },
  { texto: "Confirmar o próximo passo evita que uma boa conversa fique sem continuidade.", tema: "Seguimento", referencia: "daniel" },
  { texto: "Escolhe hoje uma atitude que gostarias de ver repetida na tua equipa.", tema: "Exemplo", referencia: "jim" },
  { texto: "A consistência começa num compromisso pequeno que cabe no teu dia real.", tema: "Rotina", referencia: "ray" },
  { texto: "As ferramentas da equipa tornam a oportunidade mais fácil de explicar e partilhar.", tema: "Sistema simples", referencia: "eric" },
  { texto: "Levar o negócio a sério começa por cumprir os compromissos que assumes com as pessoas.", tema: "Confiança", referencia: "sandro" },
  { texto: "Escutar com atenção ajuda-te a perceber se a oportunidade faz sentido para aquela pessoa.", tema: "Necessidades", referencia: "daniel" },
  { texto: "O teu crescimento pessoal acompanha-te em cada conversa, decisão e relação profissional.", tema: "Crescimento", referencia: "jim" },
  { texto: "Voltar à rotina depois de uma pausa também faz parte da consistência.", tema: "Recomeçar", referencia: "ray" },
  { texto: "Treina a apresentação até conseguires explicar o essencial com naturalidade.", tema: "Competências", referencia: "eric" },
  { texto: "Uma comunidade profissional dá espaço para aprender, contribuir e assumir responsabilidade.", tema: "Comunidade", referencia: "sandro" },
  { texto: "Um seguimento útil retoma a necessidade da pessoa e esclarece a dúvida pendente.", tema: "Acompanhamento", referencia: "daniel" },
  { texto: "A qualidade do teu trabalho cresce com aquilo que estudas e pões em prática.", tema: "Evolução", referencia: "jim" },
  { texto: "Dedica atenção à atividade de hoje enquanto trabalhas pelos objetivos de amanhã.", tema: "Ação diária", referencia: "ray" },
  { texto: "Participar numa formação ganha valor quando aplicas uma aprendizagem no teu negócio.", tema: "Formação", referencia: "eric" },
  { texto: "A transparência em cada conversa protege a confiança que sustenta a tua rede.", tema: "Integridade", referencia: "sandro" },
  { texto: "Explicar com clareza ajuda o cliente a escolher com mais segurança.", tema: "Clareza", referencia: "daniel" },
  { texto: "Desenvolver-te como pessoa também é preparar-te para acompanhar melhor a tua equipa.", tema: "Desenvolvimento pessoal", referencia: "jim" },
  { texto: "Uma resposta negativa pode encerrar uma conversa sem encerrar o teu compromisso com o trabalho.", tema: "Resiliência", referencia: "ray" },
  { texto: "A duplicação começa quando ensinas um processo que outra pessoa consegue praticar.", tema: "Duplicação", referencia: "eric" },
  { texto: "Construir o teu projeto pede iniciativa própria e disponibilidade para aprender com a equipa.", tema: "Responsabilidade", referencia: "sandro" },
  { texto: "Respeitar o ritmo da decisão ajuda a manter uma relação profissional.", tema: "Respeito", referencia: "daniel" },
  { texto: "O que aprendes hoje pode melhorar a próxima decisão que tomas no negócio.", tema: "Aprender para agir", referencia: "jim" },
  { texto: "Cria uma rotina de contactos que consigas manter ao longo das semanas.", tema: "Prospeção", referencia: "ray" },
  { texto: "Apoiar o arranque de alguém é ensinar, praticar em conjunto e acompanhar.", tema: "Apoio à equipa", referencia: "eric" },
  { texto: "O profissionalismo vê-se na atenção que dedicas às pessoas, todos os dias.", tema: "Serviço", referencia: "sandro" },
  { texto: "Pratica uma conversa com a equipa antes de levares uma abordagem nova ao cliente.", tema: "Prática", referencia: "daniel" },
  { texto: "Dá aos teus objetivos o apoio de hábitos que consegues repetir.", tema: "Disciplina", referencia: "jim" },
  { texto: "Mantém o hábito de conhecer pessoas, mesmo quando a agenda já parece preenchida.", tema: "Relações novas", referencia: "ray" },
  { texto: "Uma rede desenvolve-se quando mais pessoas aprendem a convidar, apresentar e acompanhar.", tema: "Construir a rede", referencia: "eric" },
  { texto: "A mentoria ganha valor quando ajuda a pessoa a conduzir o próprio projeto.", tema: "Autonomia", referencia: "sandro" },
  { texto: "Troca a pressa de apresentar pela curiosidade de compreender quem tens à frente.", tema: "Escuta", referencia: "daniel" },
  { texto: "Reserva tempo para melhorar a pessoa que leva o teu negócio para a frente.", tema: "Investir em ti", referencia: "jim" },
  { texto: "Avalia a tua semana pelas ações que cumpriste e pelo que podes ajustar.", tema: "Melhoria contínua", referencia: "ray" },
  { texto: "O próximo convite é uma oportunidade para praticar a clareza da tua mensagem.", tema: "Comunicação", referencia: "eric" },
  { texto: "Uma equipa merece uma visão clara e acompanhamento que respeite cada percurso.", tema: "Visão de equipa", referencia: "sandro" },
  { texto: "Uma conversa bem preparada deixa espaço para ouvir algo que ainda não sabias.", tema: "Preparação", referencia: "daniel" },
  { texto: "Escolhe aprender com pessoas cujos hábitos te ajudam a melhorar os teus.", tema: "Aprender em equipa", referencia: "jim" },
  { texto: "Retoma hoje uma ação importante que ficou adiada; a rotina reconstrói-se na prática.", tema: "Iniciativa", referencia: "ray" },
];

const DIA_MS = 86_400_000;
const INICIO_ROTACAO = Date.UTC(2026, 9, 22);

export function obterFraseDoDia(agora = new Date()) {
  const data = dataLisboa(agora);
  const [ano, mes, dia] = data.split("-").map(Number);
  // Dias de calendário, para não saltar/repetir frases nas mudanças de hora.
  const dias = Math.floor((Date.UTC(ano!, mes! - 1, dia!) - INICIO_ROTACAO) / DIA_MS);
  const indice = ((dias % FRASES_DO_DIA.length) + FRASES_DO_DIA.length) % FRASES_DO_DIA.length;
  const frase = FRASES_DO_DIA[indice]!;
  return { data, ...frase, referencia: REFERENCIAS_FRASE_DO_DIA[frase.referencia] };
}
