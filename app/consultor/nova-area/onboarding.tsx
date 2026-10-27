"use client";

import type { ReactNode } from "react";
import { TAREFAS_PRIMEIROS_PASSOS } from "@/lib/primeiros-passos";
import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

type Destino = "comeca-aqui" | "calendario" | "leads" | "proximo-webinar" | "core-rank" | "testemunhos" | "objecoes" | "formacoes-gravadas" | "documentos";
type Ligacao = { titulo: string } & (
  { destino: Destino; especial?: never } |
  { especial: "grupo" | "curso" | "reuniao-1" | "reuniao-2"; destino?: never }
);
interface PassoOnboarding {
  id: string;
  quando: string;
  titulo: string;
  texto: string;
  tarefas: { id: typeof TAREFAS_PRIMEIROS_PASSOS[number]; titulo: string }[];
  ligacoes?: Ligacao[];
}

// Síntese para o novo TP das 10 etapas em src/lib/mentor-checklist.ts.
const PASSOS: PassoOnboarding[] = [
  {
    id: "acessos-equipa", quando: "Para começar", titulo: "Liga-te à equipa",
    texto: "Lê o email de boas-vindas, explora o painel e instala a app com as notificações ativas. Através do painel, entra na comunidade WhatsApp e nos grupos Welcome Aboard e Promo e Marketing.",
    tarefas: [{ id: "acessos-equipa", titulo: "Preparar os acessos e entrar nos grupos" }],
    ligacoes: [{ titulo: "Entrar no Welcome Aboard", especial: "grupo" }],
  },
  {
    id: "primeira-reuniao", quando: "Primeiros dias", titulo: "Marca a primeira reunião com o teu upline",
    texto: "Combina uma data com o teu upline. Nessa reunião, partilha o que te trouxe até aqui e o tempo que tens disponível. Definam os teus objetivos e uma primeira tarefa simples.",
    tarefas: [{ id: "primeira-reuniao", titulo: "Marcar e fazer a primeira reunião" }],
    ligacoes: [{ titulo: "Preparar mensagem no WhatsApp", especial: "reuniao-1" }],
  },
  {
    id: "formacao-inicial", quando: "Ao teu ritmo, com orientação", titulo: "Faz a formação de arranque",
    texto: "Conclui o curso Be a Travel Partner na iCliGo Academy antes de fazeres orçamentos ou vendas. Participa também nas duas sessões Welcome Aboard, às quartas-feiras, e usa os tutoriais quando precisares.",
    tarefas: [
      { id: "curso", titulo: "Concluir o curso Be a Travel Partner" },
      { id: "sessao-1", titulo: "Participar na Sessão 1 Welcome Aboard" },
      { id: "sessao-2", titulo: "Participar na Sessão 2 Welcome Aboard" },
    ],
    ligacoes: [
      { titulo: "Ir para o curso", especial: "curso" },
      { titulo: "Ver as sessões no calendário", destino: "calendario" },
    ],
  },
  {
    id: "primeiras-acoes", quando: "Com o apoio do teu upline", titulo: "Passa à prática",
    texto: "Prepara a tua página profissional, publica a tua apresentação e uma primeira promoção. Faz uma lista de contactos e começa as primeiras conversas sobre viagens ou sobre a oportunidade, com orientação do teu upline.",
    tarefas: [{ id: "primeiras-acoes", titulo: "Preparar a página, publicar e iniciar conversas" }],
  },
  {
    id: "segunda-reuniao", quando: "Depois da formação e das primeiras ações", titulo: "Marca a segunda reunião com o teu upline",
    texto: "Contacta o teu upline para marcar a segunda reunião. Leva as tuas dúvidas e o que fizeste até aqui para reverem os contactos e os resultados. Combinem os próximos passos e uma rotina de formações e acompanhamento.",
    tarefas: [{ id: "segunda-reuniao", titulo: "Marcar e fazer a segunda reunião para definir os próximos passos" }],
    ligacoes: [
      { titulo: "Preparar mensagem no WhatsApp", especial: "reuniao-2" },
      { titulo: "Ver o calendário da equipa", destino: "calendario" },
      { titulo: "Abrir o Core Rank", destino: "core-rank" },
    ],
  },
];
const TAREFAS = PASSOS.flatMap(passo => passo.tarefas);

function Seta() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function mensagemWhatsApp(nome: string, segunda: boolean) {
  const mensagem = segunda
    ? `Olá! Sou ${nome}. Já fiz a formação e as primeiras ações e gostava de marcar a nossa segunda reunião para revermos as dúvidas, os resultados e os próximos passos. Quando tens disponibilidade?`
    : `Olá! Sou ${nome}. Gostava de marcar a nossa primeira reunião para nos conhecermos e combinarmos os meus objetivos e a primeira tarefa. Quando tens disponibilidade?`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
}

export function ComecaAqui({ linkGrupo, linkCurso, abrir, nome, nomeUpline, feitos, alternar, aGuardar, erro, sessaoWelcomeAboard }: {
  linkGrupo: string | null; linkCurso: string; abrir: (destino: Destino) => void;
  nome: string; nomeUpline?: string | null; feitos: number[]; alternar: (numero: number) => void;
  aGuardar: number | null; erro: string; sessaoWelcomeAboard?: ReactNode;
}) {
  const total = TAREFAS.length;
  const feitas = TAREFAS_PRIMEIROS_PASSOS.filter((_, i) => feitos.includes(i + 1));
  return <section id="comeca-aqui" aria-label="Começa aqui">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>BEM-VINDO À EQUIPA</span>
      <h1>Começa aqui<span>.</span></h1>
      <p>Segue estes cinco passos para começares com o apoio do teu upline. Marca as tarefas à medida que as concluis. <strong aria-live="polite">{feitas.length} de {total} tarefas concluídas.</strong></p>
      {aGuardar !== null && <p role="status">A guardar a tarefa…</p>}
      {erro && <p role="alert" className={estilos.erroOrganizacao}>{erro}</p>}
    </div>

    <div className={estilos.passos}>
      {PASSOS.map((passo, i) => {
        const concluido = passo.tarefas.every(tarefa => feitas.includes(tarefa.id));
        return <article id={`passo-${i + 1}`} key={passo.id} className={`${estilos.passo} ${concluido ? estilos.passoFeito : ""}`} aria-labelledby={`onboarding-passo-${i + 1}`}>
          <div className={estilos.passoCabecalho}>
            <span className={estilos.numero} aria-label={`Passo ${i + 1}`}>{concluido ? "✓" : i + 1}</span>
            <div><span className={css.quando}>{passo.quando}</span><h2 id={`onboarding-passo-${i + 1}`}>{passo.titulo}</h2></div>
          </div>
          <div className={estilos.passoConteudo}>
            <p>{passo.texto}</p>
            {(passo.id === "primeira-reuniao" || passo.id === "segunda-reuniao") && nomeUpline && <p className={estilos.upline}>O teu upline é <strong>{nomeUpline}.</strong></p>}
            {passo.ligacoes && <div className={css.ligacoes}>{passo.ligacoes.map(ligacao => {
              const url = ligacao.especial === "grupo" ? linkGrupo : ligacao.especial === "curso" ? linkCurso
                : ligacao.especial === "reuniao-1" || ligacao.especial === "reuniao-2" ? mensagemWhatsApp(nome, ligacao.especial === "reuniao-2") : null;
              return ligacao.destino ? <button key={ligacao.titulo} type="button" className={css.ligacao} onClick={() => abrir(ligacao.destino)}>{ligacao.titulo} <Seta /></button>
                : url ? <a key={ligacao.titulo} className={css.ligacao} href={url} target="_blank" rel="noopener noreferrer">{ligacao.titulo} <Seta /></a>
                : <span key={ligacao.titulo} className={css.pendente}>Convite disponível em breve</span>;
            })}</div>}
            {passo.id === "formacao-inicial" && sessaoWelcomeAboard}
            <div className={estilos.passoRodape}>
              <ul className={css.tarefas}>{passo.tarefas.map(tarefa => {
                const numero = TAREFAS_PRIMEIROS_PASSOS.findIndex(id => id === tarefa.id) + 1;
                const feita = feitos.includes(numero);
                return <li key={tarefa.id}>
                  <button type="button" className={estilos.concluir} aria-pressed={feita} disabled={aGuardar !== null} onClick={() => alternar(numero)}>
                    <span className={`${estilos.checkbox} ${css.checkbox}`} aria-hidden="true">{feita && "✓"}</span>
                    <span className={feita ? css.tarefaFeita : css.tarefaTitulo}>{tarefa.titulo}</span>
                  </button>
                </li>;
              })}</ul>
            </div>
          </div>
        </article>;
      })}
    </div>

    <p className={css.nota}>Podes desmarcar qualquer tarefa a qualquer momento. O progresso fica guardado na tua conta.</p>
  </section>;
}
