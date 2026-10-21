"use client";

import { useEffect, useState } from "react";
import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

type Destino = "comeca-aqui" | "calendario" | "leads" | "proximo-webinar" | "core-rank" | "testemunhos" | "objecoes" | "formacoes-gravadas" | "documentos";
type Ligacao = { titulo: string } & (
  { destino: Destino; especial?: never } |
  { especial: "grupo" | "curso"; destino?: never }
);
interface Tarefa { id: string; titulo: string; ligacao?: Ligacao }
interface PassoOnboarding {
  quando: string;
  titulo: string;
  texto: string;
  tarefas: Tarefa[];
}

const CHAVE_TAREFAS = "consultor-nova-area:onboarding-codex:v1";
const PASSOS: PassoOnboarding[] = [
  {
    quando: "Dia 1", titulo: "Entra na equipa",
    texto: "O grupo Welcome Aboard é o teu ponto de encontro para começares acompanhado.",
    tarefas: [{ id: "grupo", titulo: "Entrar no grupo Welcome Aboard", ligacao: { titulo: "Entrar no grupo", especial: "grupo" } }],
  },
  {
    quando: "Primeiros dias", titulo: "Começa o curso e conhece o teu upline",
    texto: "O curso é obrigatório e tem de estar concluído antes de fazeres orçamentos ou vendas. Na primeira reunião, tu e o teu upline conhecem-se e combinam o arranque.",
    tarefas: [
      { id: "curso", titulo: "Fazer o curso obrigatório Be a Travel Partner", ligacao: { titulo: "Ir para o curso", especial: "curso" } },
      { id: "reuniao-1", titulo: "Fazer a 1.ª reunião com o upline" },
    ],
  },
  {
    quando: "Primeiras quartas-feiras", titulo: "Vai às duas sessões Welcome Aboard",
    texto: "Quartas-feiras às 21:20: a Sessão 1 na primeira quarta e a Sessão 2 na semana seguinte.",
    tarefas: [
      { id: "sessao-1", titulo: "Participar na Sessão 1", ligacao: { titulo: "Ver no calendário", destino: "calendario" } },
      { id: "sessao-2", titulo: "Participar na Sessão 2" },
    ],
  },
  {
    quando: "Depois das sessões", titulo: "Faz a 2.ª reunião com o upline",
    texto: "Leva o que já exploraste na plataforma. Saem da reunião com objetivos e tarefas definidos.",
    tarefas: [
      { id: "objetivos", titulo: "Definir os teus objetivos" },
      { id: "duvidas", titulo: "Tirar dúvidas sobre o que já exploraste na plataforma" },
      { id: "tarefas", titulo: "Definir as tuas próximas tarefas" },
    ],
  },
  {
    quando: "Dias 30, 60 e 90", titulo: "Regista a atividade e revê com o upline",
    texto: "Usa o Core Rank para acompanhar o que fazes e revê com o teu upline o que já fazes sozinho.",
    tarefas: [
      { id: "core-rank", titulo: "Registar a atividade no Core Rank", ligacao: { titulo: "Abrir o Core Rank", destino: "core-rank" } },
      { id: "revisao", titulo: "Fazer as revisões dos 30, 60 e 90 dias" },
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
  const total = PASSOS.reduce((soma, passo) => soma + passo.tarefas.length, 0);

  useEffect(() => {
    try {
      const guardadas: unknown = JSON.parse(localStorage.getItem(CHAVE_TAREFAS) ?? "[]");
      if (Array.isArray(guardadas)) setFeitas(guardadas.filter((id): id is string => typeof id === "string"));
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
      <p>Os primeiros 90 dias em cinco passos. Os detalhes de cada um são combinados nas reuniões com o teu upline. <strong>{feitas.length} de {total} tarefas feitas.</strong></p>
    </div>

    <div className={estilos.passos}>
      {PASSOS.map((passo, i) => {
        const concluido = passo.tarefas.every(t => feitas.includes(t.id));
        return <article key={passo.titulo} className={`${estilos.passo} ${concluido ? estilos.passoFeito : ""}`} aria-labelledby={`onboarding-passo-${i + 1}`}>
          <div className={estilos.passoCabecalho}>
            <span className={estilos.numero} aria-label={`Passo ${i + 1}`}>{concluido ? "✓" : i + 1}</span>
            <div><span className={css.quando}>{passo.quando}</span><h2 id={`onboarding-passo-${i + 1}`}>{passo.titulo}</h2></div>
          </div>
          <div className={estilos.passoConteudo}>
            <p>{passo.texto}</p>
            <ul className={css.tarefas}>{passo.tarefas.map(tarefa => {
              const feita = feitas.includes(tarefa.id);
              const ligacao = tarefa.ligacao;
              const url = ligacao?.especial === "grupo" ? linkGrupo : ligacao?.especial === "curso" ? linkCurso : null;
              return <li key={tarefa.id} className={css.tarefa}>
                <button type="button" className={estilos.concluir} aria-pressed={feita} onClick={() => alternar(tarefa.id)}>
                  <span className={estilos.checkbox} aria-hidden="true">{feita && "✓"}</span>
                  <span className={feita ? css.tarefaFeita : css.tarefaTitulo}>{tarefa.titulo}</span>
                </button>
                {ligacao?.destino ? <button type="button" className={css.ligacao} onClick={() => abrir(ligacao.destino)}>{ligacao.titulo} <Seta /></button>
                  : url ? <a className={css.ligacao} href={url} target="_blank" rel="noopener noreferrer">{ligacao?.titulo} <Seta /></a>
                  : ligacao ? <span className={css.pendente}>Convite disponível em breve</span> : null}
              </li>;
            })}</ul>
          </div>
        </article>;
      })}
    </div>

    <p className={css.nota}>Proposta temporária disponível na nova área da conta de teste; as tarefas marcadas ficam guardadas neste navegador. Os primeiros passos atuais continuam em <button type="button" className={css.linkTexto} onClick={() => abrir("comeca-aqui")}>Começa aqui</button>.</p>
  </section>;
}
