"use client";

import estilos from "./nova-area.module.css";
import css from "./onboarding.module.css";

type Destino = "comeca-aqui" | "calendario" | "leads" | "proximo-webinar" | "core-rank" | "testemunhos" | "objecoes" | "formacoes-gravadas" | "documentos";
type Ligacao = { titulo: string } & (
  { destino: Destino; especial?: never } |
  { especial: "grupo" | "curso"; destino?: never }
);
interface PassoOnboarding {
  quando: string;
  titulo: string;
  texto: string;
  ligacao: Ligacao;
}

const PASSOS: PassoOnboarding[] = [
  {
    quando: "Dia 1", titulo: "Entra na equipa e fala com o teu upline",
    texto: "Entra no grupo Welcome Aboard e marca a primeira reunião com o teu upline. É nessa conversa que combinam objetivos, agenda e próximos passos.",
    ligacao: { titulo: "Entrar no Welcome Aboard", especial: "grupo" },
  },
  {
    quando: "Dia 1", titulo: "Começa o curso Be a Travel Partner",
    texto: "É obrigatório e tem de estar concluído antes de fazeres orçamentos ou vendas. Reserva já tempo na agenda para o fazer.",
    ligacao: { titulo: "Ir para o curso", especial: "curso" },
  },
  {
    quando: "Primeiras quartas-feiras", titulo: "Vai ao Welcome Aboard — Sessão 1 e Sessão 2",
    texto: "Quartas-feiras às 21:20: a Sessão 1 na primeira quarta e a Sessão 2 na semana seguinte.",
    ligacao: { titulo: "Ver no calendário", destino: "calendario" },
  },
  {
    quando: "Dias 8–30", titulo: "Acompanha o teu primeiro pedido real",
    texto: "Com o curso concluído, fala com quem já te pediu ajuda com viagens. Prepara o orçamento e o seguimento com o apoio do teu upline.",
    ligacao: { titulo: "Abrir as Leads", destino: "leads" },
  },
  {
    quando: "Dias 30, 60 e 90", titulo: "Regista a atividade e revê com o upline",
    texto: "Usa o Core Rank para acompanhar o que fazes. Aos 30, 60 e 90 dias revês com o teu upline o que já fazes sozinho e o objetivo seguinte.",
    ligacao: { titulo: "Abrir o Core Rank", destino: "core-rank" },
  },
];

function Seta() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function OnboardingProposta({ linkGrupo, linkCurso, abrir }: {
  linkGrupo: string | null; linkCurso: string; abrir: (destino: Destino) => void;
}) {
  return <section id="onboarding-proposta" aria-label="onboarding codex">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>PROPOSTA · SEPARADOR TEMPORÁRIO</span>
      <h1>onboarding codex<span>.</span></h1>
      <p>Os primeiros 90 dias em cinco passos. Os detalhes de cada um são combinados nas reuniões com o teu upline.</p>
    </div>

    <div className={estilos.passos}>
      {PASSOS.map((passo, i) => {
        const url = passo.ligacao.especial === "grupo" ? linkGrupo : passo.ligacao.especial === "curso" ? linkCurso : null;
        return <article key={passo.titulo} className={estilos.passo} aria-labelledby={`onboarding-passo-${i + 1}`}>
          <div className={estilos.passoCabecalho}>
            <span className={estilos.numero} aria-label={`Passo ${i + 1}`}>{i + 1}</span>
            <div><span className={css.quando}>{passo.quando}</span><h2 id={`onboarding-passo-${i + 1}`}>{passo.titulo}</h2></div>
          </div>
          <div className={estilos.passoConteudo}>
            <p>{passo.texto}</p>
            {passo.ligacao.destino ? <button type="button" className={estilos.botao} onClick={() => abrir(passo.ligacao.destino!)}>{passo.ligacao.titulo} <Seta /></button>
              : url ? <a className={estilos.botao} href={url} target="_blank" rel="noopener noreferrer">{passo.ligacao.titulo} <Seta /></a>
              : <p className={estilos.nota}>Convite disponível em breve.</p>}
          </div>
        </article>;
      })}
    </div>

    <p className={css.nota}>Proposta temporária, só de leitura, disponível na nova área da conta de teste. Os primeiros passos atuais continuam em <button type="button" className={css.linkTexto} onClick={() => abrir("comeca-aqui")}>Começa aqui</button>.</p>
  </section>;
}
