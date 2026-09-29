/**
 * Relatório das respostas ao formulário de preparação do Teambuilding, lido a
 * 29 de setembro de 2026 (58 respostas de 77 inscritos). O texto é uma
 * fotografia desse dia — a versão viva está no doc do Claude. Só o retrato de
 * quem vai (patamares, faturação, acompanhantes) é calculado a cada visita.
 * Junta também o que fazia sentido do relatório anterior, de 12 de setembro
 * (35 respostas), que estava nos documentos do evento.
 */

import type { InscritoFaturacao } from "@/lib/teambuilding";
import { RetratoInscritos } from "./retrato-inscritos";

const LINK_DOC = "https://claude.ai/code/artifact/6789b4b6-cae0-4394-a4cc-c5619329be86";

const EXPECTATIVAS = [
  { tema: "Convívio, conhecer a equipa ao vivo", respostas: 38, citacao: "Conhecer as pessoas com quem troco mensagens todos os dias e que nunca vi ao vivo" },
  { tema: "Aprender, formação", respostas: 24, citacao: "Aprender, aprender muito" },
  { tema: "Ouvir quem já tem resultados", respostas: 18, citacao: "O método que usam: a conversa com o cliente, a organização" },
  { tema: "Diversão e atividades em grupo", respostas: 9, citacao: "Atividades diferentes e divertidas em grupo" },
  { tema: "Motivação, energia, inspiração", respostas: 9, citacao: "Estou a precisar de me rodear dos melhores novamente" },
  { tema: "Sair com plano e ferramentas práticas", respostas: 8, citacao: "Não só motivada, mas com um plano claro para aplicar no dia seguinte" },
];

const FORMACOES = [
  { tema: "Captar clientes, abordagem e vendas", respostas: 21, destaque: true },
  { tema: "Construir equipa e recrutar", respostas: 16, destaque: true },
  { tema: "Operadores, plataforma e ferramentas", respostas: 12 },
  { tema: "Redes sociais e conteúdos", respostas: 11 },
  { tema: "Mindset, confiança, lidar com o não", respostas: 11 },
  { tema: "Gestão do tempo e organização", respostas: 9 },
  { tema: "Acompanhar o cliente e pós-venda", respostas: 9 },
  { tema: "Sem preferência, um pouco de tudo", respostas: 6 },
  { tema: "Pontos, patamares e progressão", respostas: 3 },
  { tema: "Destinos e roteiros", respostas: 3 },
  { tema: "IA como apoio ao trabalho", respostas: 3 },
];

const DIVERGENCIAS = [
  { tema: "Construção de equipa e duplicação", junior: 0, experientes: 6 },
  { tema: "Liderança, progressão e motivação da equipa", junior: 0, experientes: 3 },
  { tema: "Faturação, patamares e comissões", junior: 0, experientes: 2 },
  { tema: "Onboarding e fundamentos para quem começa", junior: 5, experientes: 0 },
  { tema: "Captação, prospeção e abordagem", junior: 5, experientes: 5 },
  { tema: "Mindset e crenças limitantes", junior: 5, experientes: 1 },
  { tema: "Operadores turísticos e plataforma", junior: 4, experientes: 3 },
];

const FITA_DO_TEMPO = [
  { hora: "09:30", bloco: "Receção e café", oQue: "Check-in, crachás, café", respondeA: "Convívio" },
  { hora: "10:00", bloco: "Abertura: rumo aos 30 milhões", oQue: "Apresentar o objetivo de 30 milhões e o que as 4 semanas de Black Friday valem para lá chegar; apresentar a árvore genealógica da equipa (em mural na sala); explicar os desafios do dia", respondeA: "Pertencer à equipa, motivação" },
  { hora: "10:20", bloco: "Quebra-gelo", oQue: "Atividade em grupos mistos (novos + experientes, de uplines diferentes)", respondeA: "Conhecer quem ainda não conhecem" },
  { hora: "10:50", bloco: "Captar clientes para a Black Friday", oQue: "Abordar conhecidos sem vender, criar uma lista de interessados antes das promoções, converter orçamentos em reservas, valor e não só preço, porquê nós e não o Booking", respondeA: "Formação n.º 1 (21)", destaque: "Sofia Pinheiro, pelos números que está a ter na captação de leads" },
  { hora: "11:40", bloco: "20 contactos, já", oQue: "Em pares upline/downline, com modelos de mensagem, cada um avisa 20 contactos que vêm aí os melhores preços do ano e pergunta que viagem sonham fazer", respondeA: "Sair com ação iniciada" },
  { hora: "12:00", bloco: "Redes sociais nas 4 semanas", oQue: "Calendário de publicações da Black Friday, exemplos reais de conteúdos e stories que trouxeram reservas", respondeA: "Redes sociais (11)", destaque: "a escolher: quem mais reservas tem vindo das redes sociais" },
  { hora: "12:45", bloco: "Almoço", oQue: "Mesas misturadas", respondeA: "Convívio" },
  { hora: "14:15", bloco: "Operadores e plataforma: encontrar as promoções", oQue: "Onde estão as campanhas de cada operador, como pesquisar depressa os melhores preços, reservas sem erros; perguntas recolhidas antes", respondeA: "Operadores e plataforma (12)", destaque: "a escolher: quem mais reservas faz com operadores e cruzeiros" },
  { hora: "15:05", bloco: "Fazer as contas", oQue: "Pontos e patamares com casos: quanto preciso de faturar nas 4 semanas para o próximo patamar e para os incentivos; onde ver tudo no backoffice", respondeA: "Pontos e progressão", destaque: "a escolher: quem subiu de patamar mais depressa este ano" },
  { hora: "15:45", bloco: "Pausa", oQue: "Café", respondeA: "Convívio" },
  { hora: "16:15", bloco: "Construir equipa", oQue: "A Black Friday como momento para apresentar a oportunidade, a objeção do investimento, quando o interessado deixa de responder", respondeA: "Formação n.º 2 (16)", destaque: "a escolher: quem mais pessoas novas trouxe para a equipa" },
  { hora: "16:55", bloco: "O que aprendi na Black Friday passada", oQue: "Mesa redonda: o que resultou, o que correu mal, como lidar com o “não” e com semanas sem vendas", respondeA: "Mindset (11)" },
  { hora: "17:30", bloco: "O meu plano para as 4 semanas", oQue: "Cada um escreve a meta de faturação, as horas por semana e a lista de clientes a contactar, e partilha com o upline", respondeA: "Tempo e organização (9)" },
  { hora: "18:00", bloco: "Troféus e incentivos", oQue: "Entrega de troféus, prémios dos desafios do dia, lançamento dos incentivos da Black Friday e da Convenção Nacional", respondeA: "Reconhecimento" },
];

export function RelatorioRespostas({
  inscritos,
  emailsResponderam,
}: {
  inscritos: InscritoFaturacao[];
  emailsResponderam: Set<string>;
}) {
  const responderam = inscritos.filter((i) => emailsResponderam.has(i.email)).length;

  const maxFormacoes = Math.max(...FORMACOES.map((f) => f.respostas));

  return (
    <details className="rr-caixa">
      <style>{`
        .rr-caixa {
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 0 1.5rem;
          margin-top: 0.75rem;
        }
        .rr-caixa > summary {
          cursor: pointer;
          padding: 1rem 0;
          font-weight: 700;
          list-style-position: outside;
        }
        .rr-caixa > summary span { color: #6b6a63; font-weight: 400; font-size: 0.85rem; margin-left: 0.4rem; }
        .rr-corpo { padding-bottom: 1.5rem; max-width: 900px; line-height: 1.55; font-size: 0.92rem; }
        .rr-corpo h3 { color: #4b5320; font-size: 1rem; margin: 1.75rem 0 0.5rem; }
        .rr-corpo p { margin: 0.5rem 0; }
        .rr-corpo ul, .rr-corpo ol { margin: 0.5rem 0; padding-left: 1.3rem; }
        .rr-corpo li { margin: 0.3rem 0; }
        .rr-nota { color: #6b6a63; font-size: 0.8rem; }
        .rr-nota a { color: #4b5320; }
        .rr-tabela-wrap { overflow-x: auto; border: 1px solid #d8d5cb; border-radius: 8px; margin: 0.75rem 0; background: #ffffff; }
        .rr-tabela { width: 100%; border-collapse: collapse; }
        .rr-tabela th, .rr-tabela td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eae7de; font-size: 0.85rem; vertical-align: top; }
        .rr-tabela th { color: #6b6a63; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .rr-tabela tr:last-child td { border-bottom: none; }
        .rr-num { text-align: right; font-weight: 700; white-space: nowrap; }
        .rr-barra-linha { display: flex; align-items: center; gap: 0.75rem; margin: 0.35rem 0; }
        .rr-barra-etiqueta { flex: 0 0 min(260px, 45%); font-size: 0.85rem; text-align: right; color: #6b6a63; }
        .rr-barra-etiqueta.rr-forte { color: #000000; font-weight: 700; }
        .rr-barra-fundo { flex: 1; height: 14px; }
        .rr-barra { height: 100%; border-radius: 3px; background: #c9c6ba; }
        .rr-barra.rr-forte { background: linear-gradient(90deg, #5d6b2a, #4b5320); }
        .rr-destaque {
          margin-top: 0.4rem;
          padding: 0.3rem 0.55rem;
          border-left: 3px solid #4b5320;
          background: #f2f1ec;
          font-size: 0.82rem;
        }
        .rr-barra-numero { flex: 0 0 2rem; font-weight: 700; font-size: 0.85rem; }
      `}</style>
      <summary>
        Relatório das respostas ao formulário de preparação
        <span>
          {responderam} de {inscritos.length} responderam
        </span>
      </summary>

      <div className="rr-corpo">
        <p className="rr-nota">
          O texto e as contagens por tema são das 58 respostas lidas a 29 de setembro; só o retrato de quem vai se atualiza
          sozinho.{" "}
          <a href={LINK_DOC} target="_blank" rel="noreferrer">
            Abrir o documento completo
          </a>
        </p>

        <h3>Resumo</h3>
        <p>
          A 29 de setembro tinham respondido 58 dos 77 inscritos (75%). A mensagem é clara: querem sobretudo <strong>estar juntos ao vivo</strong>{" "}
          e <strong>aprender com quem já tem resultados</strong>, com formações práticas de onde saiam com ferramentas
          para usar no dia seguinte.
        </p>
        <ul>
          <li>
            <strong>Convívio e conhecer a equipa</strong> é a expectativa n.º 1 (cerca de 40 das 58 respostas).
          </li>
          <li>
            <strong>Captar clientes e vender</strong> é a formação mais pedida (cerca de 20), logo seguida de{" "}
            <strong>construir equipa / recrutar</strong> (cerca de 15).
          </li>
          <li>
            Há uma procura forte por <strong>partilha real de experiências</strong>, incluindo o que correu mal, e não
            só histórias de sucesso.
          </li>
          <li>
            Muitos estão a começar (pelo menos 9 dizem que é o primeiro evento), e várias dúvidas repetem-se:{" "}
            <strong>operadores turísticos, plataforma iCliGo, pontos e patamares</strong>.
          </li>
        </ul>
        <p>
          O dia coincide com o arranque da Black Friday do turismo (cerca de 4 semanas com os melhores preços do ano) e
          com a apresentação do objetivo de 30 milhões de faturação. Por isso a fita do tempo pega nos temas pedidos e
          aplica-os todos à preparação dessas 4 semanas.
        </p>

        <RetratoInscritos inscritos={inscritos} emailsResponderam={emailsResponderam} />

        <h3>O que esperam do dia</h3>
        <p>
          Dois terços vêm sobretudo para conhecer ao vivo as pessoas com quem falam todos os dias por WhatsApp e Zoom.
          Contagens por tema: cada resposta pode cair em mais do que um.
        </p>
        <div className="rr-tabela-wrap">
          <table className="rr-tabela">
            <thead>
              <tr>
                <th>Expectativa</th>
                <th className="rr-num">Respostas (de 58)</th>
                <th>Como dizem</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTATIVAS.map((e) => (
                <tr key={e.tema}>
                  <td>{e.tema}</td>
                  <td className="rr-num">{e.respostas}</td>
                  <td>“{e.citacao}”</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Há um recado explícito sobre o formato: “os eventos passam por mostrar que a pessoa X teve sucesso; gostava
          mais de saber <em>como</em> fazem”. Dois pedem também que se fale do que <strong>não</strong> resultou e das
          dificuldades ultrapassadas.
        </p>

        <h3>Formações mais pedidas</h3>
        <p>
          O pedido n.º 1 é aprender a trazer clientes (21 respostas), seguido de construir equipa (16). Juntos, aparecem
          em mais de metade das respostas.
        </p>
        <div style={{ margin: "0.75rem 0" }}>
          {FORMACOES.map((f) => (
            <div className="rr-barra-linha" key={f.tema}>
              <span className={f.destaque ? "rr-barra-etiqueta rr-forte" : "rr-barra-etiqueta"}>{f.tema}</span>
              <div className="rr-barra-fundo">
                <div
                  className={f.destaque ? "rr-barra rr-forte" : "rr-barra"}
                  style={{ width: `${(f.respostas / maxFormacoes) * 100}%` }}
                />
              </div>
              <span className="rr-barra-numero">{f.respostas}</span>
            </div>
          ))}
          <p className="rr-nota">Respostas que pedem cada tema, de 58 (uma resposta pode pedir vários).</p>
        </div>
        <p>
          Dentro de “captar clientes”, os pedidos concretos são: como abordar conhecidos sem parecer venda, converter
          seguidores e orçamentos em reservas, comunicar valor e não preço, e diferenciar-nos do Booking. Em “construir
          equipa”, pedem sobretudo como apresentar a oportunidade, responder à objeção do investimento inicial e o que
          fazer quando alguém interessado deixa de responder.
        </p>

        <h3>Onde os novos e os experientes divergem</h3>
        <p className="rr-nota">Do relatório anterior, com as 35 respostas de 12 de setembro cruzadas com o patamar de quem respondeu.</p>
        <div className="rr-tabela-wrap">
          <table className="rr-tabela">
            <thead>
              <tr>
                <th>Tema</th>
                <th className="rr-num">JUNIOR</th>
                <th className="rr-num">SENIOR e acima</th>
              </tr>
            </thead>
            <tbody>
              {DIVERGENCIAS.map((d) => (
                <tr key={d.tema}>
                  <td>{d.tema}</td>
                  <td className="rr-num">{d.junior}</td>
                  <td className="rr-num">{d.experientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Os JUNIOR pedem fundamentos e perder o medo de abordar: “como fazer” e “o que a plataforma tem”. Os patamares
          acima já resolveram isso e pedem o passo seguinte: como ensinar o que sabem à sua equipa, perceber e explicar
          patamares e comissões, e manter a consistência. Por isso os exercícios práticos do dia fazem-se em{" "}
          <strong>pares upline/downline</strong>: cada líder ajuda o seu downline nos básicos e treina, ao mesmo tempo,
          a forma de ensinar.
        </p>
        <p>
          Captar clientes é o único tema pedido por igual pelos dois lados, o que confirma a escolha de abrir as
          formações com ele.
        </p>

        <h3>Dúvidas recorrentes e outras sugestões</h3>
        <p>
          As dúvidas são quase todas operacionais e repetem-se; dá para responder a muitas numa só sessão de perguntas e
          respostas.
        </p>
        <p>
          <strong>Dúvidas que aparecem mais de uma vez</strong>
        </p>
        <ul>
          <li>
            <strong>Operadores turísticos</strong> (“tudo sobre operadores, formação intensiva”): 6 respostas.
          </li>
          <li>
            <strong>Plataforma iCliGo</strong>: onde estão promoções de última hora, como encontrar os melhores preços,
            cruzeiros MSC que demoram a aparecer.
          </li>
          <li>
            <strong>Pontos, patamares e faturação</strong>: onde vejo os meus pontos, quantos me faltam, como ler os
            gráficos da equipa.
          </li>
          <li>
            <strong>Medo de falhar numa reserva</strong> para destinos que não conhecem, e como lidar com emergências e
            clientes difíceis.
          </li>
          <li>
            <strong>Objeções</strong>: “faço tudo sozinho online” (clientes) e o investimento inicial (recrutamento).
          </li>
          <li>
            Casos pontuais: como declarar os rendimentos, seguros que cobrem ou não, instalação do Mattermost. Não
            justificam tempo de palco: resolvem-se num <strong>balcão de apoio</strong> durante os intervalos.
          </li>
        </ul>
        <p>
          <strong>Sugestões para o dia</strong>
        </p>
        <ul>
          <li>
            <strong>Reconhecimento</strong>: entregar troféus (incluindo o de Júnior a quem ainda não tem) e reconhecer
            quem subiu de nível; uma pessoa espera o prémio dos 250.000 €.
          </li>
          <li>
            <strong>Desafios com prémios simples e alcançáveis</strong>, para todos sentirem que podem ganhar.
          </li>
          <li>
            <strong>Troca de prendas diferente do amigo secreto</strong>, já que é o jantar de Natal da equipa.
          </li>
          <li>
            <strong>Árvore genealógica da equipa</strong>, incluindo o topo: melhor como mural exposto na sala o dia
            todo, apresentado na abertura.
          </li>
          <li>
            <strong>Algo para as crianças</strong> que vão.
          </li>
          <li>
            <strong>Lançar já a Convenção Nacional</strong> para criar expectativa.
          </li>
          <li>
            Depois do dia: uma reunião mensal para partilhar dificuldades, e um documento de procedimentos com as dúvidas
            mais frequentes.
          </li>
        </ul>

        <h3>O que considero relevante</h3>
        <p>
          O dia tem de servir dois públicos na mesma sala: quem está a começar e precisa de confiança e básicos, e quem
          já vende e quer crescer em equipa. A forma de o fazer sem dividir por patamares é escolher temas que servem a
          todos e trabalhá-los com exemplos reais.
        </p>
        <p>
          <strong>A Black Friday é o fio condutor.</strong> Os temas mais pedidos (captar clientes, redes sociais,
          operadores e plataforma) são exatamente o que decide umas 4 semanas de promoções, e duas respostas já pedem
          ferramentas para a Black Friday e o Blue Monday. Dar cada formação com esse foco torna-a concreta para quem
          começa e urgente para quem já vende, e liga o dia ao objetivo dos 30 milhões.
        </p>
        <ol>
          <li>
            <strong>Menos palco, mais “como”.</strong> Os testemunhos devem mostrar o método (mensagens, rotinas,
            ferramentas) e incluir um erro ou dificuldade. Pedir a cada orador que traga um exemplo concreto no ecrã.
          </li>
          <li>
            <strong>Prática dentro da sala.</strong> Uma das respostas propõe escolher 20 contactos e enviar a primeira
            mensagem ali mesmo; é fácil de fazer com todos juntos e responde ao pedido de “sair com ação iniciada”.
          </li>
          <li>
            <strong>Fazer as contas.</strong> Pontos e patamares aparecem várias vezes como dúvida. Um exercício com casos
            (“com X € de faturação, onde chego?”) serve iniciantes e líderes ao mesmo tempo.
          </li>
          <li>
            <strong>Operadores e plataforma merecem um bloco próprio</strong> em formato de perguntas e respostas.
            Recolher as perguntas antes (por exemplo no WhatsApp) poupa tempo no dia.
          </li>
          <li>
            <strong>Mindset sem ser abstrato.</strong> O que pedem é lidar com o “não”, com a frustração de não vender e
            com o medo de errar numa reserva. Ligar este tema a compromissos concretos (horas por semana, ações) fecha bem
            o dia.
          </li>
          <li>
            <strong>Reconhecimento pesa.</strong> Entregar os troféus no próprio dia foi pedido explicitamente e dá um
            objetivo visível a quem está a começar.
          </li>
          <li>
            <strong>Espaço para conviver.</strong> Sendo esta a expectativa n.º 1, os intervalos não devem ser encurtados
            para caber mais formação, e uma atividade de grupo logo de manhã quebra o gelo.
          </li>
        </ol>
        <p>
          Os bloqueios que aparecem são de dois tipos: falta de conhecimento técnico (plataforma, operadores, produto) e
          falta de confiança (medo de falhar, frustração, consistência). O segundo não desaparece com a experiência, só
          muda de forma: nos JUNIOR é o medo de começar, em dois COORDENADORES é manter o ritmo e organizar o tempo.
        </p>
        <p>
          <strong>O que fica fora do palco:</strong> dúvidas técnicas de uma só pessoa (balcão de apoio nos
          intervalos), a troca de prendas (decide-se com quem organiza o jantar) e a gestão financeira pessoal
          aprofundada (melhor num vídeo ou PDF depois do dia).
        </p>
        <p>
          Ainda há inscritos por responder; as tendências dificilmente mudam, mas vale a pena reenviar o lembrete antes
          de fechar o programa.
        </p>

        <h3>Proposta de fita do tempo</h3>
        <p>
          Um dia único para todos, das 09:30 às 18:45, pensado como a preparação da Black Friday do turismo, que arranca
          nessa semana. Cada formação pedida é aplicada às 4 semanas de promoções e ao objetivo dos 30 milhões, e cada
          bloco termina com algo feito na sala. Cada formação é dada por 2 ou 3 Travel Partners com resultados, que
          mostram o método e um erro que cometeram.
        </p>
        <div className="rr-tabela-wrap">
          <table className="rr-tabela" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Hora</th>
                <th>Bloco</th>
                <th>O que acontece</th>
                <th>Responde a</th>
              </tr>
            </thead>
            <tbody>
              {FITA_DO_TEMPO.map((b, i) => (
                <tr key={b.hora}>
                  <td>{i + 1}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{b.hora}</td>
                  <td>
                    <strong>{b.bloco}</strong>
                  </td>
                  <td>
                    {b.oQue}
                    {"destaque" in b && (
                      <div className="rr-destaque">
                        <strong>10 min em palco:</strong> {b.destaque}
                      </div>
                    )}
                  </td>
                  <td>{b.respondeA}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>Destaques em palco.</strong> Cada formação reserva 10 minutos, dentro do próprio bloco, para chamar ao
          palco alguém que se esteja a destacar nesse tema e que conta, com os números, o que está a fazer. Na captação
          de clientes é a Sofia Pinheiro; para as outras formações fica o critério de escolha, falta pôr os nomes.
        </p>
        <p>
          Ao longo do dia correm desafios simples com prémio (por exemplo, mais respostas aos 20 contactos, melhor
          pergunta sobre operadores), entregues no bloco 14. Os incentivos só são revelados no fecho, para o dia acabar
          em alta e os planos do bloco 13 já estarem escritos. Falta definir o que fazer com as crianças durante as
          formações; um espaço com monitor junto à sala resolve o pedido. A troca de prendas fica para o jantar de Natal.
        </p>
      </div>
    </details>
  );
}
