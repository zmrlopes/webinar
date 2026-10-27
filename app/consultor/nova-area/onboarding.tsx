"use client";

import { useEffect, useState } from "react";
import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

type Destino = "comeca-aqui" | "calendario" | "leads" | "proximo-webinar" | "core-rank" | "testemunhos" | "objecoes" | "formacoes-gravadas" | "documentos";
type Ligacao = { titulo: string } & (
  { destino: Destino; especial?: never } |
  { especial: "grupo" | "curso"; destino?: never }
);
interface PassoOnboarding {
  id: string;
  quando: string;
  titulo: string;
  texto: string;
  confirmacao: string;
  ligacoes?: Ligacao[];
}

// Os checks antigos ficam preservados em v1: não confirmam estes passos mais abrangentes.
const CHAVE_TAREFAS = "consultor-nova-area:onboarding-codex:v2";
// Síntese para o novo TP das 10 etapas em src/lib/mentor-checklist.ts.
const PASSOS: PassoOnboarding[] = [
  {
    id: "acessos-equipa", quando: "Para começar", titulo: "Liga-te à equipa",
    texto: "Lê o email de boas-vindas, explora o painel e instala a app com as notificações ativas. Através do painel, entra na comunidade WhatsApp e nos grupos Welcome Aboard e Promo e Marketing.",
    confirmacao: "Já tenho os acessos e entrei nos grupos",
    ligacoes: [{ titulo: "Entrar no Welcome Aboard", especial: "grupo" }],
  },
  {
    id: "primeira-reuniao", quando: "Primeiros dias", titulo: "Combina o arranque com o teu upline",
    texto: "Na primeira reunião, partilha o que te trouxe até aqui e o tempo que tens disponível. Definam os teus objetivos e uma primeira tarefa simples.",
    confirmacao: "Já fiz a primeira reunião e sei por onde começar",
  },
  {
    id: "formacao-inicial", quando: "Ao teu ritmo, com orientação", titulo: "Faz a formação de arranque",
    texto: "Conclui o curso Be a Travel Partner na iCliGo Academy antes de fazeres orçamentos ou vendas. Participa também nas duas sessões Welcome Aboard, às quartas-feiras, e usa os tutoriais quando precisares.",
    confirmacao: "Já concluí o curso e participei nas duas sessões",
    ligacoes: [
      { titulo: "Ir para o curso", especial: "curso" },
      { titulo: "Ver as sessões no calendário", destino: "calendario" },
    ],
  },
  {
    id: "primeiras-acoes", quando: "Com o apoio do teu upline", titulo: "Passa à prática",
    texto: "Prepara a tua página profissional, publica a tua apresentação e uma primeira promoção. Faz uma lista de contactos e começa as primeiras conversas sobre viagens ou sobre a oportunidade, com orientação do teu upline.",
    confirmacao: "Já preparei a página, publiquei e iniciei conversas",
  },
  {
    id: "segunda-reuniao", quando: "Depois da formação e das primeiras ações", titulo: "Revê e escolhe os próximos passos",
    texto: "Na segunda reunião, revê as ações, os contactos e os resultados, e tira as tuas dúvidas. Combina os próximos passos e uma rotina de formações e acompanhamento; regista a tua atividade no Core Rank.",
    confirmacao: "Já fiz a segunda reunião e combinei os próximos passos",
    ligacoes: [
      { titulo: "Ver o calendário da equipa", destino: "calendario" },
      { titulo: "Abrir o Core Rank", destino: "core-rank" },
    ],
  },
];

function Seta() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function OnboardingProposta({ linkGrupo, linkCurso, abrir }: {
  linkGrupo: string | null; linkCurso: string; abrir: (destino: Destino) => void;
}) {
  const [feitas, setFeitas] = useState<string[]>([]);
  const total = PASSOS.length;

  useEffect(() => {
    try {
      const guardadas: unknown = JSON.parse(localStorage.getItem(CHAVE_TAREFAS) ?? "[]");
      if (Array.isArray(guardadas)) setFeitas(PASSOS.filter(passo => guardadas.includes(passo.id)).map(passo => passo.id));
    } catch { /* Sem acesso ao armazenamento, a lista começa vazia. */ }
  }, []);

  function alternar(id: string) {
    setFeitas(atuais => {
      const atualizadas = atuais.includes(id) ? atuais.filter(t => t !== id) : [...atuais, id];
      try { localStorage.setItem(CHAVE_TAREFAS, JSON.stringify(atualizadas)); } catch { /* Fica apenas nesta visita. */ }
      return atualizadas;
    });
  }

  return <section id="onboarding-proposta" aria-label="onboarding codex">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>PROPOSTA · SEPARADOR TEMPORÁRIO</span>
      <h1>onboarding codex<span>.</span></h1>
      <p>O teu arranque em cinco passos, com um check por passo. O teu upline acompanha-te nos detalhes. <strong aria-live="polite">{feitas.length} de {total} passos concluídos.</strong></p>
    </div>

    <div className={estilos.passos}>
      {PASSOS.map((passo, i) => {
        const concluido = feitas.includes(passo.id);
        return <article key={passo.id} className={`${estilos.passo} ${concluido ? estilos.passoFeito : ""}`} aria-labelledby={`onboarding-passo-${i + 1}`}>
          <div className={estilos.passoCabecalho}>
            <span className={estilos.numero} aria-label={`Passo ${i + 1}`}>{concluido ? "✓" : i + 1}</span>
            <div><span className={css.quando}>{passo.quando}</span><h2 id={`onboarding-passo-${i + 1}`}>{passo.titulo}</h2></div>
          </div>
          <div className={estilos.passoConteudo}>
            <p>{passo.texto}</p>
            {passo.ligacoes && <div className={css.ligacoes}>{passo.ligacoes.map(ligacao => {
              const url = ligacao.especial === "grupo" ? linkGrupo : ligacao.especial === "curso" ? linkCurso : null;
              return ligacao.destino ? <button key={ligacao.titulo} type="button" className={css.ligacao} onClick={() => abrir(ligacao.destino)}>{ligacao.titulo} <Seta /></button>
                : url ? <a key={ligacao.titulo} className={css.ligacao} href={url} target="_blank" rel="noopener noreferrer">{ligacao.titulo} <Seta /></a>
                : <span key={ligacao.titulo} className={css.pendente}>Convite disponível em breve</span>;
            })}</div>}
            <div className={estilos.passoRodape}>
              <button type="button" className={estilos.concluir} aria-pressed={concluido} onClick={() => alternar(passo.id)}>
                <span className={`${estilos.checkbox} ${css.checkbox}`} aria-hidden="true">{concluido && "✓"}</span>
                <span className={concluido ? css.tarefaFeita : css.tarefaTitulo}>{passo.confirmacao}</span>
              </button>
              {concluido && <span className={estilos.desfazer}>Clica para desmarcar</span>}
            </div>
          </div>
        </article>;
      })}
    </div>

    <p className={css.nota}>Marca cada passo quando estiver concluído; podes desmarcar a qualquer momento. O progresso fica guardado neste navegador. Para os primeiros passos atuais, abre <button type="button" className={css.linkTexto} onClick={() => abrir("comeca-aqui")}>Começa aqui</button>.</p>
  </section>;
}
