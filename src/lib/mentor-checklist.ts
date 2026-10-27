import {limparPrimeirosPassos} from "./primeiros-passos";

/** Transcrição das páginas 1, 2 e 4 de docs/Checklist do mentor — Novo Travel Partner.pdf. */
export const ETAPAS_MENTOR = [
  {id: "boas-vindas", titulo: "Boas-vindas", tarefas: [
    {id: "mensagem-boas-vindas", texto: "Enviar uma mensagem personalizada ao TP."},
    {id: "email-onboarding", texto: "Confirmar a leitura do e-mail de onboarding."},
  ]},
  {id: "dashboard", titulo: "Dashboard", tarefas: [
    {id: "acesso-dashboard", texto: "Pedir ao TP para aceder a https://webinar.viajareviver.net/consultor."},
    {id: "instalar-app", texto: "Confirmar que instalou a app."},
    {id: "ativar-notificacoes", texto: "Confirmar que ativou as notificações."},
    {id: "explicar-dashboard", texto: "Explicar que o Dashboard é o ponto central com tudo o que precisa, incluindo acesso à comunidade WhatsApp, formação, inscrições e recursos."},
    {id: "explorar-dashboard", texto: "Destacar que o Dashboard está constantemente a ser melhorado, por isso convém explorá-lo regularmente."},
  ]},
  {id: "comunidade", titulo: "Comunidade WhatsApp", tarefas: [
    {id: "acesso-comunidade", texto: "Confirmar que o TP acedeu à comunidade WhatsApp por si próprio através do Dashboard — NINGUÉM ADICIONA NINGUÉM aos grupos."},
    {id: "grupo-welcome-aboard", texto: "Confirmar que aderiu ao separador/grupo Welcome Aboard."},
    {id: "permanencia-welcome-aboard", texto: "Explicar que o TP PERMANECE NO WELCOME ABOARD ATÉ ATINGIR 15.000€ EM RESERVAS."},
    {id: "apoio-sara", texto: "Informar que a Sara está sempre nesse grupo disponível para ajudar."},
    {id: "grupo-promo-marketing", texto: "Confirmar que aderiu também ao grupo Promo e Marketing."},
    {id: "outros-grupos", texto: "Pedir ao TP para consultar a informação/descrição de cada um dos outros grupos e aderir aos que fizerem sentido."},
  ]},
  {id: "primeira-reuniao", titulo: "Primeira reunião individual", tarefas: [
    {id: "realizar-primeira-reuniao", texto: "Marcar e realizar a primeira reunião individual."},
    {id: "conhecer-sonhos", texto: "Conhecer os sonhos do TP."},
    {id: "conhecer-objetivos", texto: "Conhecer os objetivos do TP."},
    {id: "conhecer-motivacao", texto: "Conhecer a motivação do TP."},
    {id: "conhecer-disponibilidade", texto: "Conhecer o tempo disponível do TP."},
    {id: "definir-metas", texto: "Definir metas concretas."},
    {id: "definir-primeira-tarefa", texto: "Definir a primeira tarefa."},
  ]},
  {id: "formacao", titulo: "Formação", tarefas: [
    {id: "curso-travel-partner", texto: "Iniciar o curso Be a Travel Partner na iCliGo Academy."},
    {id: "sessoes-welcome-aboard", texto: "Participar nas duas sessões Welcome Aboard às quartas-feiras."},
    {id: "recursos-tutoriais", texto: "Consultar os recursos e tutoriais."},
  ]},
  {id: "primeira-acao", titulo: "Primeira ação", tarefas: [
    {id: "pagina-profissional", texto: "Preparar a página profissional."},
    {id: "publicar-apresentacao", texto: "Publicar a apresentação."},
    {id: "primeira-promocao", texto: "Partilhar a primeira promoção."},
    {id: "lista-contactos", texto: "Fazer uma lista de contactos."},
    {id: "conversas-clientes", texto: "Começar a conversar com clientes."},
    {id: "conversas-oportunidade", texto: "Começar a conversar com pessoas interessadas na oportunidade."},
  ]},
  {id: "integracao", titulo: "Integração", tarefas: [
    {id: "formacoes-equipa", texto: "Explicar as formações de equipa às segundas."},
    {id: "formacoes-empresa", texto: "Explicar as formações da empresa terças e quintas."},
    {id: "cafe-online", texto: "Explicar o Café Online quinzenal."},
    {id: "sessoes-core-rank", texto: "Explicar as sessões Core Rank."},
    {id: "eventos", texto: "Explicar os eventos."},
  ]},
  {id: "segunda-reuniao", titulo: "Segunda reunião", tarefas: [
    {id: "avaliar-acoes", texto: "Após a formação e as tarefas, avaliar as ações realizadas."},
    {id: "avaliar-contactos", texto: "Avaliar os contactos realizados."},
    {id: "esclarecer-duvidas", texto: "Esclarecer dúvidas."},
    {id: "avaliar-resultados", texto: "Avaliar resultados."},
    {id: "proximos-passos", texto: "Definir os próximos passos."},
  ]},
  {id: "duplicacao", titulo: "Duplicação", tarefas: [
    {id: "ensinar-duplicacao", texto: "Ensinar o TP a repetir o mesmo processo com futuros novos TPs."},
    {id: "objetivo-core-rank", texto: "Registar: Core Rank = 3 novos TPs + 3.000€ em vendas."},
  ]},
  {id: "compromisso", titulo: "Compromisso", tarefas: [
    {id: "compromisso-mentor", texto: "O mentor acompanha e ensina; não faz as tarefas pelo TP."},
  ]},
] as const;

export const TAREFAS_MENTOR = ETAPAS_MENTOR.flatMap(e => [...e.tarefas]);
export const TOTAL_TAREFAS_MENTOR = TAREFAS_MENTOR.length;
export function tarefaMentorValida(id: unknown): id is string {
  return typeof id === "string" && TAREFAS_MENTOR.some(t => t.id === id);
}
export function limparTarefasMentor(valor: unknown): string[] {
  return Array.isArray(valor) ? TAREFAS_MENTOR.filter(t => valor.includes(t.id)).map(t => t.id) : [];
}
type OrigemAutomatica = "tp" | "welcome-aboard";
/** Só confirma factos cobertos pelo check do TP; nunca infere as ações do mentor. */
const TAREFAS_POR_CHECK_TP: Partial<Record<number, readonly string[]>> = {
  1: ["email-onboarding", "acesso-dashboard", "instalar-app", "ativar-notificacoes", "acesso-comunidade", "grupo-welcome-aboard", "grupo-promo-marketing"],
  2: ["realizar-primeira-reuniao"],
  3: ["curso-travel-partner"],
  6: ["pagina-profissional", "publicar-apresentacao", "primeira-promocao", "lista-contactos"],
  7: ["proximos-passos"],
};
export const CHECKS_TP_MENTOR = [
  "Acessos e grupos", "Primeira reunião", "Curso Be a Travel Partner", "Sessão 1 Welcome Aboard",
  "Sessão 2 Welcome Aboard", "Primeiras publicações e conversas", "Segunda reunião e próximos passos",
];

export function comporProgressoMentor(manual: unknown, progressoTP: unknown, sessao1 = false, sessao2 = false) {
  const feitosMentor = limparTarefasMentor(manual), feitosTP = limparPrimeirosPassos(progressoTP);
  const origens = new Map<string, OrigemAutomatica>();
  for (const check of feitosTP) for (const tarefa of TAREFAS_POR_CHECK_TP[check] ?? []) origens.set(tarefa, "tp");
  const sessao1Concluida = sessao1 || feitosTP.includes(4), sessao2Concluida = sessao2 || feitosTP.includes(5);
  if (sessao1Concluida && sessao2Concluida) origens.set("sessoes-welcome-aboard", feitosTP.includes(4) && feitosTP.includes(5) ? "tp" : "welcome-aboard");
  return {
    feitos: limparTarefasMentor([...feitosMentor, ...origens.keys()]), feitosMentor,
    automaticos: [...origens].map(([tarefa, origem]) => ({tarefa, origem})),
    progressoTP: {feitos: feitosTP, sessao1Concluida, sessao2Concluida},
  };
}
export interface TPMentorado {
  email: string; nome: string; dataRegisto: string | null; estado: string;
  feitos: string[]; atualizadoEm: string | null;
  feitosMentor: string[];
  automaticos: {tarefa: string; origem: OrigemAutomatica}[];
  progressoTP: {feitos: number[]; sessao1Concluida: boolean; sessao2Concluida: boolean; atualizadoEm: string | null};
}
