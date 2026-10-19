"use client";

import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

/**
 * Proposta de onboarding (temporária) para substituir os 5 primeiros passos.
 * Só leitura: serve para o utilizador avaliar a sugestão antes de decidir.
 * Cada ação indica as aulas da base de conhecimento das formações em que se baseia.
 */

type Destino = "leads" | "proximo-webinar" | "core-rank" | "calculadoras" | "eventos-presenciais" | "testemunhos";

interface Acao {
  titulo: string;
  texto: string;
  base: string;
  destino?: [Destino, string];
  externo?: "grupo" | "curso";
}

interface Fase {
  quando: string;
  titulo: string;
  marco: string;
  acoes: Acao[];
  upline: string;
}

const FASES: Fase[] = [
  {
    quando: "Dia 1",
    titulo: "Bem-vindo à equipa",
    marco: "Estás no grupo, começaste o curso obrigatório e tens o Welcome Aboard e a chamada de arranque marcados.",
    acoes: [
      { titulo: "Entra no grupo Welcome Aboard", texto: "É o ponto de encontro da equipa. Antes de perguntares, procura no grupo: muitas respostas já lá estão.", base: "Integração de um novo afiliado › Ações n.º 1 e n.º 2", externo: "grupo" },
      { titulo: "Começa hoje o curso Be a Travel Partner", texto: "É obrigatório para poderes vender, por isso vem antes de tudo o resto. Termina-o nos primeiros dias: nenhum orçamento ou venda antes de o concluíres.", base: "Be a Travel Partner (iCliGo Academy)", externo: "curso" },
      { titulo: "Inscreve-te no Welcome Aboard desta quarta-feira", texto: "Vai à Sessão 1 já na primeira quarta-feira (21:20) e à Sessão 2 na quarta seguinte. Quanto mais cedo, mais depressa arrancas acompanhado.", base: "Integração › Ação primordial: participar nas formações semanais" },
      { titulo: "Marca a chamada de arranque com o teu upline", texto: "Uma chamada de 45 minutos, nos dois primeiros dias. Não é só para se conhecerem: sais dela com objetivo, lista e o primeiro convite feito.", base: "Be a Pro › Os 5 passos essenciais para iniciar um novo Travel Partner" },
    ],
    upline: "Dá as boas-vindas no grupo e numa story, valida a decisão e confirma que o curso e o Welcome Aboard ficaram tratados.",
  },
  {
    quando: "Dias 2–3",
    titulo: "Chamada de arranque",
    marco: "Sais da chamada com o teu primeiro objetivo, a lista feita e o primeiro convite enviado.",
    acoes: [
      { titulo: "Expectativas reais", texto: "Isto é uma competência, não magia: vais ouvir “não”, vais sentir desconforto e os resultados vêm da consistência.", base: "Be a Pro › Erros mais comuns ao iniciar · Eric Worre › Estabelecer expectativas reais" },
      { titulo: "O teu porquê e o primeiro objetivo", texto: "Qual é o teu sonho e o que queres que isto mude na tua vida? Depois, um primeiro objetivo mensurável: a primeira reserva, os primeiros 1.000 € em vendas ou as primeiras 3 apresentações. Combinem também o ritmo de acompanhamento: todos os dias, de dois em dois dias ou uma vez por semana.", base: "Be a Leader › 1.ª sessão · Integração › Fundamentos e objetivo da integração" },
      { titulo: "Define as tuas horas sagradas", texto: "Quantas horas por semana e em que dias, como num emprego. Blocos de 15 minutos também contam. Usa-os para convidar, apresentar e fazer follow-up; estudar fica fora destas horas.", base: "Eric Worre › Como gerir o tempo e as tarefas" },
      { titulo: "Lista de 100 nomes, sem filtrar", texto: "Feita durante a chamada: mercado quente (família, amigos), morno (conhecidos, vizinhos, colegas) e frio (redes sociais). Não decidas por ninguém. Se não há lista, não há negócio.", base: "Be a Pro › Lista inicial: mercado quente, morno e frio · Be a Travel Partner › Como atrair os primeiros clientes" },
      { titulo: "O primeiro convite, feito por ti, em direto", texto: "Convidas alguém da lista para o webinar com o teu link pessoal, com o upline a orientar. O convite abre a porta; não explica o negócio.", base: "Be a Leader › 1.ª sessão (passo 6) · Be a Pro › O convite serve para abrir porta", destino: ["leads", "Ver o meu link nas Leads"] },
    ],
    upline: "Orienta, mas não convida por ti. No fim, feedback em três partes: o que correu bem, o que melhorar e a próxima ação.",
  },
  {
    quando: "Semana 1",
    titulo: "Curso concluído, Sessão 1 e anúncio",
    marco: "Curso Be a Travel Partner concluído, Sessão 1 feita, história contada e primeiros pedidos de orçamento.",
    acoes: [
      { titulo: "Conclui o Be a Travel Partner", texto: "Se ainda não terminaste, é a prioridade da semana: só depois dele podes vender. Usa já o que aprendeste em “Antes da Reserva” (as 7 perguntas) e “Criar Orçamentos”.", base: "Be a Travel Partner (iCliGo Academy)", externo: "curso" },
      { titulo: "Welcome Aboard: Sessão 1", texto: "Na primeira quarta-feira, às 21:20, com os líderes. Foco em começar e fazer as primeiras reservas.", base: "Integração › Ação primordial: participar nas formações semanais" },
      { titulo: "Prepara o teu perfil", texto: "Foto tua (não um logótipo), nome igual em todas as redes, bio com o que fazes como Consultor(a) Independente iCliGo e o teu link pessoal de consultor.", base: "Profissionalizar os perfis online · Canva › Encontra os teus links de consultor" },
      { titulo: "Escreve a tua história", texto: "Em quatro partes: quem eras, o que não gostavas, o que encontraste e como vês o futuro. A parte mais importante é a segunda. Conta-a ao teu upline.", base: "Eric Worre › Conta a tua história · 7 Skills › A importância da tua história" },
      { titulo: "Anuncia que és Travel Partner e pede apoio", texto: "Com o curso concluído, aos 10 contactos mais próximos: “Comecei a fazer consultoria de viagens. Ajudas-me com a tua próxima viagem?” Dá sempre uma saída e envia o teu link de pedido de orçamento.", base: "Be a Travel Partner › Como começar a atrair os teus primeiros clientes · Eric Worre › Ganhar o teu primeiro cliente" },
    ],
    upline: "Confirma que o curso ficou concluído e que esteve na Sessão 1, e revê a história contigo.",
  },
  {
    quando: "Semana 2",
    titulo: "Primeiros resultados, com apoio",
    marco: "Sessão 2 feita, primeiro orçamento enviado e primeiras apresentações feitas a três.",
    acoes: [
      { titulo: "Welcome Aboard: Sessão 2", texto: "Na quarta-feira seguinte à Sessão 1, às 21:20. Foco no crescimento e em atingir o patamar de Sénior.", base: "Integração › Ação primordial: participar nas formações semanais" },
      { titulo: "O teu primeiro orçamento", texto: "Faz as 7 perguntas antes de abrir o motor de pesquisa, envia 2 ou 3 opções explicadas e faz follow-up às 24 h e às 72 h.", base: "Be a Travel Partner › Antes da Reserva e Como enviar o orçamento · Metodologia de Trabalho (Cátia Rafael)" },
      { titulo: "Primeiras apresentações a três", texto: "O convidado vê o webinar e a conversa a seguir é contigo e com o teu upline. Tu não explicas o negócio: és o mensageiro, a ferramenta explica. Começa por “O que gostaste mais?”.", base: "Be a Pro › Os 5 passos (passos 3 e 4) · Be a Leader › 2.ª, 3.ª e 4.ª sessões", destino: ["proximo-webinar", "Ver o próximo webinar"] },
      { titulo: "Regista a tua atividade todos os dias", texto: "Contactos, convites e follow-ups no Core Rank. Os números mostram o que está a funcionar.", base: "Be a Leader › Checklist do mentor (consciência das métricas)", destino: ["core-rank", "Abrir o Core Rank"] },
    ],
    upline: "Conduz as primeiras chamadas a três e vai passando o controlo, até ficares só a observar.",
  },
  {
    quando: "Dia 30",
    titulo: "Objetivo e ritmo",
    marco: "Tens um objetivo para o mês seguinte e um evento na agenda.",
    acoes: [
      { titulo: "Segunda chamada com o upline", texto: "Revêem os números do mês e definem o objetivo do Core Rank: 3.000 € em reservas e 3 novos Travel Partners, cada um a chegar aos 1.000 €.", base: "Be a Pro › Core Rank e metas iniciais · Masterclass › Definição de objetivos", destino: ["calculadoras", "Planear nas Calculadoras"] },
      { titulo: "Inscreve-te no próximo evento", texto: "Os eventos aceleram a crença mais do que qualquer outra coisa: dão-te contexto, comunidade e visão.", base: "Be a Pro › Os 5 passos (passo 5) · Porque devem os Travel Partners participar num evento", destino: ["eventos-presenciais", "Ver eventos presenciais"] },
      { titulo: "Torna o objetivo público", texto: "Partilha-o no grupo da equipa. O compromisso público aumenta a responsabilidade e o apoio que recebes.", base: "Eric Worre › Como te asseguras que tens 20 em 30 dias · Masterclass › Poder dos números" },
    ],
    upline: "Confirma as métricas e deixa a semente: “Quando estiveres pronto, ajudo-te a arrancar a tua primeira pessoa.”",
  },
];

const COMPARACAO: [string, string][] = [
  ["Grupo WhatsApp Welcome Aboard", "Fica, no dia 1."],
  ["1.ª videochamada com o upline", "Passa a chamada de arranque: expectativas, objetivo, lista de 100 e primeiro convite em direto."],
  ["Curso Be a Travel Partner", "Começa no dia 1 e conclui-se na semana 1, antes de qualquer venda: é obrigatório para vender."],
  ["Welcome Aboard — Sessão 1 e Sessão 2", "O mais cedo possível: inscrição no dia 1, Sessão 1 na primeira quarta-feira e Sessão 2 na seguinte."],
  ["2.ª videochamada (objetivos)", "Passa ao dia 30, com os números do mês e o objetivo do Core Rank."],
];

const NOVO = ["Perfil profissional", "Lista de 100 nomes", "A tua história", "Primeiros clientes no círculo próximo", "Horas sagradas", "Apresentações a três", "Registo no Core Rank", "Evento na agenda"];

function Seta() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function OnboardingProposta({ linkGrupo, linkCurso, abrir }: {
  linkGrupo: string | null; linkCurso: string; abrir: (destino: Destino) => void;
}) {
  return <section id="onboarding-proposta" aria-label="Proposta de onboarding">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>PROPOSTA · SEPARADOR TEMPORÁRIO</span>
      <h1>Onboarding<span>.</span></h1>
      <p>Uma sugestão para substituir os 5 primeiros passos, construída a partir das 541 aulas da base de conhecimento das formações. Os primeiros 30 dias, em 5 fases.</p>
    </div>

    <div className={css.principios}>
      <div><strong>Estrutura, não motivação</strong><p>Poucos passos, por ordem. Informação a mais paralisa quem está a começar.</p></div>
      <div><strong>Agir logo</strong><p>A lista e o primeiro convite fazem-se na primeira chamada, não “quando estiver preparado”.</p></div>
      <div><strong>Um objetivo a 30 dias</strong><p>O Core Rank é o primeiro marco: prova que funciona e cria confiança.</p></div>
    </div>

    <ol className={css.fases}>
      {FASES.map((fase, i) => <li key={fase.titulo} className={css.fase} aria-labelledby={`fase-${i + 1}`}>
        <div className={css.faseCabecalho}>
          <span className={css.faseNumero} aria-hidden="true">{i + 1}</span>
          <div>
            <span className={css.quando}>{fase.quando}</span>
            <h2 id={`fase-${i + 1}`}>{fase.titulo}</h2>
          </div>
        </div>
        <p className={css.marco}><strong>Marco:</strong> {fase.marco}</p>
        <ul className={css.acoes}>
          {fase.acoes.map(acao => <li key={acao.titulo} className={css.acao}>
            <h3>{acao.titulo}</h3>
            <p>{acao.texto}</p>
            {acao.externo === "grupo" && (linkGrupo
              ? <a className={css.ligacao} href={linkGrupo} target="_blank" rel="noopener noreferrer">Entrar no grupo <Seta /></a>
              : <span className={css.base}>Convite do grupo disponível em breve.</span>)}
            {acao.externo === "curso" && <a className={css.ligacao} href={linkCurso} target="_blank" rel="noopener noreferrer">Ir para o curso <Seta /></a>}
            {acao.destino && <button type="button" className={css.ligacao} onClick={() => abrir(acao.destino![0])}>{acao.destino[1]} <Seta /></button>}
            <span className={css.base}>Base: {acao.base}</span>
          </li>)}
        </ul>
        <p className={css.upline}><strong>O papel do upline:</strong> {fase.upline}</p>
      </li>)}
    </ol>

    <div className={css.comparacao}>
      <h2>O que muda face aos primeiros passos atuais</h2>
      <dl>
        {COMPARACAO.map(([atual, proposta]) => <div key={atual}><dt>{atual}</dt><dd>{proposta}</dd></div>)}
      </dl>
      <p className={css.novoTitulo}>Entra de novo:</p>
      <ul className={css.novo}>{NOVO.map(item => <li key={item}>{item}</li>)}</ul>
      <p className={css.nota}>Separador temporário, só na conta de teste. Os consultores continuam a ver os primeiros passos atuais até decidires substituí-los.</p>
    </div>
  </section>;
}
