"use client";

import { useState } from "react";
import { linkTestemunho, testemunhos } from "@/lib/testemunhos";
import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

type Destino = "comeca-aqui" | "calendario" | "leads" | "proximo-webinar" | "core-rank" | "testemunhos" | "objecoes" | "formacoes-gravadas" | "documentos";
type Recurso = { titulo: string; nota: string } & (
  { destino: Destino; url?: never; especial?: never } |
  { url: string; destino?: never; especial?: never } |
  { especial: "grupo" | "curso"; destino?: never; url?: never }
);
interface Fase {
  quando: string;
  titulo: string;
  objetivo: string;
  acoes: { titulo: string; texto: string }[];
  entrega: string;
  mentor: string;
  recursos: Recurso[];
  base: string;
}

const ACADEMY = "https://academy.icligo.com/lessons/";
const FASES: [Fase, ...Fase[]] = [
  {
    quando: "Primeiras 24 horas", titulo: "Sentir-se acompanhado e saber por onde começar",
    objetivo: "O novo consultor sabe quem o acompanha, onde encontrar ajuda e qual é o próximo passo.",
    acoes: [
      { titulo: "Receber uma orientação pessoal", texto: "Lê o e-mail de boas-vindas e confirma quem é o teu mentor. Envia-lhe uma mensagem e marca a primeira reunião para os próximos dias." },
      { titulo: "Preparar o dashboard", texto: "Entra com o teu e-mail, instala a app se te for útil e ativa as notificações. Localiza as formações, os documentos, o calendário e o acesso à comunidade." },
      { titulo: "Entrar na comunidade por iniciativa própria", texto: "Usa o convite do dashboard para entrar no Welcome Aboard. Consulta as descrições dos restantes grupos e adere aos relevantes, incluindo Promo e Marketing quando disponível." },
      { titulo: "Reservar tempo para aprender", texto: "Abre o Be a Travel Partner e agenda o primeiro bloco de estudo. Consulta as próximas sessões Welcome Aboard e reserva as duas na agenda, pela ordem indicada." },
    ],
    entrega: "Acesso ao dashboard confirmado, grupo encontrado, primeira reunião marcada e curso iniciado.",
    mentor: "Enviar boas-vindas personalizadas, confirmar o e-mail de onboarding e verificar os acessos. Se houver um bloqueio, resolvê-lo antes de acrescentar tarefas.",
    recursos: [
      { titulo: "Entrar no Welcome Aboard", nota: "Convite da tua equipa, definido no dashboard.", especial: "grupo" },
      { titulo: "Começar o Be a Travel Partner", nota: "Curso obrigatório da iCliGo Academy; requer a conta iCliGo.", especial: "curso" },
      { titulo: "Consultar o calendário", nota: "Confirmar horários, inscrições e próximas sessões.", destino: "calendario" },
    ],
    base: "Canva: Checklist do mentor — Novo Travel Partner, pp. 1–2 e e-mails 1–2 (p. 4); Tropa de Elite — Mentores, pp. 3–6.",
  },
  {
    quando: "Dias 1–3", titulo: "Definir um plano que cabe na tua vida",
    objetivo: "Transformar a decisão de começar num compromisso concreto com tempo, apoio e uma primeira ação.",
    acoes: [
      { titulo: "Fazer a primeira reunião com o mentor", texto: "Fala da tua motivação, experiência, disponibilidade e objetivo. Escolham uma primeira meta observável e marquem já a revisão dos dias 8–15. Exemplos: terminar o curso ou preparar e explicar um orçamento." },
      { titulo: "Criar uma semana possível", texto: "Bloqueia na agenda tempo para estudar, conversar com clientes e acompanhar pedidos. Sugestão a ajustar: três blocos de 30 minutos para formação e três de 20 minutos para prática. Se tens menos tempo, alonga o percurso." },
      { titulo: "Fazer um mapa simples dos acessos", texto: "Distingue dashboard da equipa, Academy e MyOffice. No MyOffice, localiza o perfil, as reservas, os links de consultor e os recursos de marketing. Aprende onde abrir um pedido de suporte e como acompanhar a resposta." },
      { titulo: "Começar a lista e escolher cinco conversas", texto: "Constrói a tua lista de contactos sem decidir por eles se têm interesse. Começa por cinco pessoas que já tenham falado contigo de viagens; prepara com o mentor uma conversa natural para perceber os planos de férias." },
    ],
    entrega: "Uma agenda semanal, um objetivo acordado, cinco contactos prioritários e capacidade de localizar os acessos sem depender do mentor.",
    mentor: "Ouvir antes de orientar. Pedir ao consultor que mostre onde encontra cada recurso e que prepare a sua própria primeira mensagem; dar feedback sem executar por ele.",
    recursos: [
      { titulo: "Abrir o MyOffice", nota: "Explorar os acessos da própria conta; confirmar os menus disponíveis.", url: "https://myoffice.icligo.com/" },
      { titulo: "Como abrir um ticket no MyOffice", nota: "Be a Travel Partner · Como Contactar a iCliGo.", url: ACADEMY + "aula-2-como-abrir-um-ticket-no-myoffice" },
      { titulo: "Como Gerir o Tempo e as Tarefas", nota: "Eric Worre · usar os blocos de atividade como ponto de partida.", url: "https://www.youtube.com/watch?v=Z_j7wLoSp_w" },
    ],
    base: "Canva: Checklist do mentor, pp. 2–4 (e-mails 2, 3 e 5); Mentores, pp. 5 e 9. Academy: Antes da Reserva. YouTube: Como Gerir o Tempo e as Tarefas. MyOffice: navegação recolhida em outubro de 2026.",
  },
  {
    quando: "Dias 4–7", titulo: "Aprender o essencial e fazer o primeiro exercício",
    objetivo: "Sair da formação com um pedido bem recolhido e uma proposta que consigas explicar.",
    acoes: [
      { titulo: "Concluir a formação inicial", texto: "Avança no Be a Travel Partner e aponta as dúvidas. Conclui o curso obrigatório antes de comercializar viagens. Participa na primeira sessão Welcome Aboard disponível e executa as tarefas trabalhadas." },
      { titulo: "Treinar o diagnóstico antes da pesquisa", texto: "Usa um caso de treino: destino, motivação, datas e flexibilidade, viajantes e idades, regime alimentar, alojamento e orçamento disponível. Completa com aeroporto de partida e necessidades específicas. Pergunta: “O que gostavas de viver nesta viagem?”" },
      { titulo: "Preparar um orçamento acompanhado", texto: "Escolhe com o mentor o motor adequado e compara duas ou três opções que respondam ao pedido. Explica preço total, serviços incluídos, bagagem, extras, condições e disponibilidade. Faz o exercício sem confirmar uma reserva ou pagamento." },
      { titulo: "Preparar a tua apresentação profissional", texto: "Revê a fotografia, a bio e a identificação como Travel Partner. Usa os materiais de marca e prepara um primeiro post e uma promoção com condições verificadas. Depois do curso concluído, anuncia às pessoas próximas que já podes ajudá-las com as viagens." },
    ],
    entrega: "Curso concluído ou data de conclusão acordada, um diagnóstico preenchido, orçamento de treino explicado e apresentação profissional revista.",
    mentor: "Pedir que explique por que escolheu cada opção. Rever o processo e esclarecer dúvidas; se a formação não terminou, manter os casos em treino e ajustar a cadência.",
    recursos: [
      { titulo: "Continuar o Be a Travel Partner", nota: "Antes da Reserva → Criar Orçamentos → Guardar, Enviar e Ajustar.", especial: "curso" },
      { titulo: "Como Enviar um Orçamento ao Cliente", nota: "Consultor(a) de Excelência · ligar cada opção ao pedido.", url: "https://www.youtube.com/watch?v=pYTWA9ckApM" },
      { titulo: "Consultar os documentos", nota: "Materiais e referências disponíveis na equipa.", destino: "documentos" },
    ],
    base: "Academy: Be a Travel Partner, Antes da Reserva e Criar Orçamentos. Canva: Welcome Aboard Sessão 1; 2 RESERVAS; 3 Redes Sociais. YouTube: Consultor(a) de Excelência.",
  },
  {
    quando: "Dias 8–15", titulo: "Acompanhar um pedido e corrigir cedo",
    objetivo: "Aplicar o processo numa situação real, com apoio, e perceber o que já consegues fazer sozinho.",
    acoes: [
      { titulo: "Conversar e acompanhar o primeiro pedido", texto: "Com a formação concluída, conversa com os contactos escolhidos e procura uma necessidade real. Apresenta as opções pelo canal preferido do cliente. Combina quando voltarão a falar; como ponto de partida, faz seguimento no dia seguinte e revê ao terceiro dia se fizer sentido." },
      { titulo: "Ensaiar a reserva e o pós-venda", texto: "Antes da primeira confirmação, revê com o mentor os dados dos viajantes e as condições. Aprende a localizar a reserva e a documentação, organizar o check-in, acompanhar a viagem e pedir feedback no regresso. Confirma o canal de ajuda e o procedimento de emergência na formação de suporte." },
      { titulo: "Trabalhar uma dúvida com um testemunho adequado", texto: "Treina uma objeção real: ouve, faz uma pergunta, esclarece e só depois escolhe uma história relevante. Usa a resolução de objeções e a biblioteca. Lê o contexto do relato e prepara uma pergunta de acompanhamento, em vez de enviar vários vídeos sem explicação." },
      { titulo: "Fazer a segunda reunião e a Sessão 2", texto: "Leva o que fizeste, as dúvidas e a próxima ação de cada contacto. Revê a experiência com o mentor. Participa na segunda sessão Welcome Aboard para compreender também a construção de equipa e decidir como essa vertente entra nos teus objetivos." },
    ],
    entrega: "Um pedido real acompanhado ou uma simulação completa, plano de pós-venda e segunda reunião feita com ações para a semana seguinte.",
    mentor: "Rever a qualidade da conversa, do orçamento e do seguimento. Separar falta de oportunidade de falta de competência. Demonstrar, fazer em conjunto e observar a repetição pelo consultor.",
    recursos: [
      { titulo: "Metodologia de Trabalho · Cátia Rafael", nota: "Formação interna · diagnóstico, follow-up e acompanhamento da viagem.", url: "https://www.youtube.com/watch?v=cnjnSxtbBpA" },
      { titulo: "Treinar a resolução de objeções", nota: "Respostas e sugestão de testemunho para o caso apresentado.", destino: "objecoes" },
      { titulo: "Explorar os testemunhos", nota: "Relatos YouTube e Instagram, pesquisáveis por tema.", destino: "testemunhos" },
    ],
    base: "Canva: Checklist do mentor, pp. 3–4; Mentores, pp. 7–10 e 14. Academy: Pós-Reserva; Como Contactar a iCliGo. Formação interna: Metodologia de Trabalho. Catálogo revisto de testemunhos.",
  },
  {
    quando: "Dias 16–30", titulo: "Ganhar rotina e conhecer as duas vertentes",
    objetivo: "Repetir um processo simples de clientes e conhecer o percurso de construção de equipa.",
    acoes: [
      { titulo: "Repetir o ciclo de consultoria", texto: "Mantém uma lista com necessidade, estado e próxima ação de cada pedido. Aprende a combinar conversas, pesquisa e acompanhamento. Escolhe a próxima formação pelo bloqueio que encontraste, por exemplo um destino ou motor de reservas específico." },
      { titulo: "Aprender a fazer um convite transparente", texto: "Para quem manifestou interesse na atividade, prepara um convite personalizado com o mentor. Usa o teu link pessoal nas Leads, combina a apresentação e acompanha a pessoa depois. Se fizer sentido envolver o mentor, combina primeiro com o convidado uma conversa a três." },
      { titulo: "Contar a tua história sem exagerar", texto: "Pratica em um minuto: de onde vens, o que procuravas, por que começaste e o que estás a aprender. Numa apresentação, usa os materiais existentes e pergunta o que a pessoa gostou e o que precisa de esclarecer." },
      { titulo: "Olhar para a atividade e ajustar", texto: "Usa o Core Rank para acompanhar a tua atividade. No dia 30, revê contactos, pedidos, propostas, follow-ups, reservas e, quando aplicável, apresentações. Define o plano seguinte com o mentor. A meta apresentada na formação Core Rank é 3 novos TPs + 3.000 € em vendas; ajustem o objetivo ao teu percurso, sem o tratar como resultado garantido." },
    ],
    entrega: "Uma rotina repetível, contactos com próxima ação definida e revisão de 30 dias com um objetivo e uma data de acompanhamento.",
    mentor: "Observar o consultor a conduzir a conversa e dar feedback específico. Acompanhar as primeiras apresentações e transferir gradualmente a condução. Não avaliar o onboarding apenas pelo volume vendido ou pelo número de entradas.",
    recursos: [
      { titulo: "Encontrar o meu link pessoal", nota: "No topo das Leads; acompanha depois cada interessado.", destino: "leads" },
      { titulo: "Ver a próxima apresentação", nota: "Próximo webinar e instruções de participação.", destino: "proximo-webinar" },
      { titulo: "Abrir o Core Rank", nota: "Registar a atividade; gravar progresso e fechar o dia são ações diferentes.", destino: "core-rank" },
    ],
    base: "Canva: Welcome Aboard 2 — versão final Core Rank, pp. 21–26 e 35–42; Exemplos de convites, pp. 1–4. Academy: Be a Pro e Be a Leader. YouTube: 7 Skills e gestão do tempo.",
  },
  {
    quando: "Dias 31–90", titulo: "Consolidar autonomia e aprender a acompanhar",
    objetivo: "Conseguir repetir o processo, encontrar apoio e ensinar os passos que já dominas.",
    acoes: [
      { titulo: "Aprofundar uma competência de cada vez", texto: "Escolhe com o mentor um foco quinzenal: diagnóstico, pesquisa, apresentação, acompanhamento ou fecho. Vê a formação indicada, aplica num caso e traz o resultado para revisão." },
      { titulo: "Construir acompanhamento de clientes", texto: "Organiza o pré-viagem, a assistência durante a estadia e o contacto no regresso. Pede feedback e recomendações quando adequado. Mantém registo das preferências para futuras viagens." },
      { titulo: "Repetir o acolhimento com um novo TP", texto: "Se iniciares alguém, aplica o mesmo processo: boas-vindas, dashboard, reunião, Academia, Welcome Aboard, primeiras ações e revisão. O mentor demonstra, fazem juntos, o novo consultor repete e, depois, ensina." },
      { titulo: "Rever aos 60 e 90 dias", texto: "Mostra o que já fazes de forma autónoma, onde ainda precisas de apoio e que atividade consegues manter. Ajusta o objetivo seguinte e escolhe formações e eventos relevantes para essa fase." },
    ],
    entrega: "Um processo de clientes organizado, autonomia demonstrada num caso completo e um plano para os próximos 30 dias.",
    mentor: "Reduzir a intervenção à medida que as competências aparecem. Continuar disponível para casos difíceis e rever o processo com base no que foi feito.",
    recursos: [
      { titulo: "Escolher a próxima formação", nota: "Biblioteca interna, vídeos YouTube e percursos iCliGo Academy.", destino: "formacoes-gravadas" },
      { titulo: "Erros ao iniciar um novo Travel Partner", nota: "Be a Pro · dar estrutura, dosear informação e promover autonomia.", url: ACADEMY + "aula-1-erros-mais-comuns-ao-iniciar-um-novo-travel-partner" },
      { titulo: "Planear as próximas sessões", nota: "Formação, comunidade e eventos no calendário da plataforma.", destino: "calendario" },
    ],
    base: "Canva: Tropa de Elite — Mentores, pp. 9–15; Welcome Aboard 2, p. 26. Academy: Be a Pro, Iniciar o Novo Travel Partner; Be a Leader. Formação interna: Metodologia de Trabalho.",
  },
];

const FONTES = [
  ["Checklist do mentor — Novo Travel Partner", "https://www.canva.com/design/DAHYF8IxxuU/view", "Primeiras ações, duas reuniões e sequência de acompanhamento por e-mail."],
  ["Tropa de Elite — Mentores", "https://www.canva.com/design/DAHYF_FLtzk/view", "Responsabilidades, primeiros 15 dias e transferência de autonomia."],
  ["Welcome Aboard 2 · versão final Core Rank", "https://www.canva.com/design/DAHXaofaDuA/view", "Duas vertentes, método de acompanhamento e duplicação."],
  ["Welcome Aboard · Sessão 1", "https://www.canva.com/design/DAHFtW1nA5w/view", "Lista de contactos, apresentação profissional e primeiros pedidos."],
  ["2 RESERVAS", "https://www.canva.com/design/DAHOKX1ihK0/view", "Diagnóstico, propostas, seguimento e gestão da relação com o cliente."],
  ["Exemplos de convites", "https://www.canva.com/design/DAHF1hIzJp4/view", "Exemplos para adaptar a cada pessoa e situação."],
];

function Seta() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function OnboardingProposta({ linkGrupo, linkCurso, abrir }: {
  linkGrupo: string | null; linkCurso: string; abrir: (destino: Destino) => void;
}) {
  const [etapa, setEtapa] = useState(0);
  const fase = FASES[etapa] ?? FASES[0];
  const ludmila = testemunhos.find(t => t.id === "instagram:DJzXOySKJGI");

  return <section id="onboarding-proposta" aria-label="onboarding codex">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>PROPOSTA · SEPARADOR TEMPORÁRIO</span>
      <h1>onboarding codex<span>.</span></h1>
      <p>Um arranque acompanhado nos primeiros 15 dias, uma rotina no primeiro mês e autonomia até aos 90 dias. Proposta construída a partir das apresentações Canva, da Academy, das formações internas e YouTube e dos testemunhos da equipa.</p>
    </div>

    <div className={css.principios}>
      <div><strong>Uma ação de cada vez</strong><p>Aprender o essencial, aplicar num caso e receber feedback antes de avançar.</p></div>
      <div><strong>Mentor presente desde o início</strong><p>Primeira reunião nos primeiros dias e segunda nos dias 8–15, depois da formação e das primeiras tarefas.</p></div>
      <div><strong>Autonomia como resultado</strong><p>O consultor aprende a servir clientes, acompanhar interessados e encontrar ajuda. O ritmo ajusta-se à disponibilidade.</p></div>
    </div>

    <p className={css.notaInicial}>As datas são uma sugestão de ritmo. Os horários e as inscrições das sessões devem ser consultados no calendário. Esta proposta é para revisão e não regista tarefas concluídas.</p>
    <nav aria-label="Etapas do onboarding" className={css.percurso}>
      <ol>{FASES.map((f, i) => <li key={f.quando}>
        <button type="button" aria-pressed={etapa === i} aria-controls="onboarding-etapa" onClick={() => setEtapa(i)}>
          <span className={css.indice}>{i + 1}</span><span><strong>{f.quando}</strong><span>{f.titulo}</span></span>
        </button>
      </li>)}</ol>
    </nav>

    <article id="onboarding-etapa" className={css.fase} aria-labelledby="onboarding-etapa-titulo">
      <div className={css.faseCabecalho}>
        <span className={css.faseNumero} aria-hidden="true">{etapa + 1}</span>
        <div><span className={css.quando}>{fase.quando} · Etapa {etapa + 1} de {FASES.length}</span><h2 id="onboarding-etapa-titulo">{fase.titulo}</h2></div>
      </div>
      <p className={css.objetivo}>{fase.objetivo}</p>
      <ol className={css.acoes}>{fase.acoes.map(acao => <li key={acao.titulo} className={css.acao}>
        <h3>{acao.titulo}</h3><p>{acao.texto}</p>
      </li>)}</ol>
      <p className={css.marco}><strong>Resultado a demonstrar:</strong> {fase.entrega}</p>
      <p className={css.upline}><strong>O mentor confirma e acompanha:</strong> {fase.mentor}</p>
      <div className={css.materiais}>
        <h3>Materiais para esta etapa</h3>
        <ul>{fase.recursos.map(recurso => {
          const url = recurso.especial === "grupo" ? linkGrupo : recurso.especial === "curso" ? linkCurso : recurso.url;
          return <li key={recurso.titulo}>
            {recurso.destino ? <button type="button" className={css.ligacao} onClick={() => abrir(recurso.destino)}>{recurso.titulo}<Seta /></button>
              : url ? <a className={css.ligacao} href={url} target="_blank" rel="noopener noreferrer">{recurso.titulo}<Seta /></a>
              : <strong>{recurso.titulo} · convite ainda indisponível</strong>}
            <span>{recurso.nota}</span>
          </li>;
        })}</ul>
      </div>
      <details className={css.fonteEtapa} key={etapa}><summary>Em que se baseia esta etapa</summary><p>{fase.base}</p></details>
      <div className={css.navegacao}>
        <button type="button" disabled={etapa === 0} onClick={() => setEtapa(i => i - 1)}>Etapa anterior</button>
        <span aria-live="polite">{etapa + 1} de {FASES.length}</span>
        <button type="button" disabled={etapa === FASES.length - 1} onClick={() => setEtapa(i => i + 1)}>Etapa seguinte</button>
      </div>
    </article>

    <div className={css.comparacao}>
      <h2>Como o mentor acompanha este percurso</h2>
      <dl>
        <div><dt>Dia 0 · Receber</dt><dd>Boas-vindas e orientação para o dashboard. Confirmar que a pessoa consegue entrar e sabe qual é a primeira ação.</dd></div>
        <div><dt>Dias 1–3 · Conhecer</dt><dd>Motivação, disponibilidade, objetivo e primeira tarefa. Apoiar o início da Academia e a inscrição no Welcome Aboard.</dd></div>
        <div><dt>Dias 3–7 · Desbloquear</dt><dd>Perguntar o que já tentou, esclarecer uma dúvida concreta e acompanhar a primeira prática.</dd></div>
        <div><dt>Dias 8–15 · Rever</dt><dd>Segunda reunião: evidências das tarefas, dificuldades, feedback e plano da semana seguinte.</dd></div>
        <div><dt>Dias 30, 60 e 90 · Ajustar</dt><dd>Rever atividade e autonomia. Escolher a próxima competência a desenvolver e combinar novo acompanhamento.</dd></div>
      </dl>
      <p className={css.nota}>Cadência sugerida a partir da checklist e dos e-mails do mentor no Canva. Estas mensagens são orientações para acompanhamento pessoal; este separador não envia e-mails ou notificações.</p>
    </div>

    <div className={css.comparacao}>
      <h2>Exercício: usar um testemunho com contexto</h2>
      <p className={css.objetivo}>“Tenho receio de começar porque o dinheiro está apertado.” Antes do vídeo, pergunta o que preocupa a pessoa e esclarece a informação de que precisa para decidir.</p>
      <p className={css.upline}>O relato da Ludmila Mira pode criar identificação com a hesitação inicial. Conta o que ela efetivamente partilha: vivia com o salário mínimo e ponderou a decisão durante cerca de um ano. O excerto não demonstra rendimentos obtidos; evita apresentá-lo como promessa de recuperação do investimento.</p>
      {ludmila && <a className={css.ligacao} href={linkTestemunho(ludmila)} target="_blank" rel="noopener noreferrer">Ver o testemunho da Ludmila Mira<Seta /></a>}
      <p className={css.upline}><strong>Depois de assistir:</strong> “Identificaste-te com alguma parte da história? Que informação ainda te falta para perceberes se faz sentido para ti?” Respeita o contexto financeiro e a decisão da pessoa.</p>
      <button type="button" className={css.ligacao} onClick={() => abrir("testemunhos")}>Escolher outra história na biblioteca<Seta /></button>
    </div>

    <details className={css.comparacao}>
      <summary className={css.resumoFontes}>Materiais que orientam esta proposta</summary>
      <p className={css.upline}>A ordem e os prazos são uma sugestão de organização. A seleção cruza os materiais recentes de mentoria com as formações de vendas, equipa e acompanhamento já recolhidas. As referências por etapa permitem rever a proposta com as fontes.</p>
      <ul className={css.fontes}>{FONTES.map(([titulo, url, nota]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{titulo}</a><span>{nota}</span></li>)}</ul>
      <p className={css.nota}>Os links Canva e Academy dependem das permissões da tua conta. Horários, condições comerciais e campanhas devem ser confirmados nos canais atuais. Os exemplos de atividade não são garantias de vendas ou rendimento.</p>
      <button type="button" className={css.ligacao} onClick={() => abrir("formacoes-gravadas")}>Consultar a biblioteca de formações<Seta /></button>
    </details>
    <p className={css.nota}>Proposta temporária disponível na nova área da conta de teste. Os cinco primeiros passos atuais continuam disponíveis em <button type="button" className={css.linkTexto} onClick={() => abrir("comeca-aqui")}>Começa aqui</button>.</p>
  </section>;
}
