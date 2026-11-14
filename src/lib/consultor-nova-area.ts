import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";

/** Primeira migração real autorizada; não abrange a descendência da Ana. */
export const EMAIL_PILOTO_NOVA_AREA = "apensarnaproxima@gmail.com";

/**
 * Por indicação explícita do utilizador, a nova área está publicada para
 * todos os consultores da equipa e abre por defeito ao entrar em /consultor.
 * Passar a `false` volta a limitá-la à conta de teste e à Ana.
 */
export const NOVA_AREA_PARA_TODOS = true;

/** Contas que já tinham a nova área antes da publicação geral (teste e Ana). */
export function ehContaPilotoNovaArea(email: string): boolean {
  const conta = email.trim().toLowerCase();
  return conta === EMAIL_PAINEL_DEMONSTRACAO || conta === EMAIL_PILOTO_NOVA_AREA;
}

/**
 * Verificação rápida, também usada no browser. Com a publicação geral aceita
 * qualquer email: o servidor confirma sempre que a conta é da equipa
 * (ver temAcessoNovaArea em consultor-nova-area-servidor.ts).
 */
export function podeVerNovaArea(email: string): boolean {
  if (NOVA_AREA_PARA_TODOS) return email.includes("@");
  return ehContaPilotoNovaArea(email);
}

/** Ao entrar em /consultor, os consultores da equipa seguem para a nova área; `?area=atual` mantém a versão anterior. */
export function destinoEntradaNovaArea(email: string, pesquisa: string, ehConsultorEquipa = false): string | null {
  const conta = email.trim().toLowerCase();
  const entraNaNova = conta === EMAIL_PILOTO_NOVA_AREA || (NOVA_AREA_PARA_TODOS && ehConsultorEquipa);
  return entraNaNova && new URLSearchParams(pesquisa).get("area") !== "atual" ? "/consultor/nova-area" : null;
}

export function linkAreaAtual(email: string): string {
  return NOVA_AREA_PARA_TODOS || email.trim().toLowerCase() === EMAIL_PILOTO_NOVA_AREA ? "/consultor?area=atual" : "/consultor";
}

/** Convite do grupo Welcome Aboard fornecido pelo utilizador. */
export const LINK_GRUPO_WELCOME_ABOARD = "https://chat.whatsapp.com/ECXPKjkgn0X3xW1eYlUSAy";
export const LINK_CURSO_TRAVEL_PARTNER = "https://academy.icligo.com/courses/be-a-travel-consultant-2";

export interface ProximoWebinarNovaArea {
  id: string;
  titulo: string;
  comecaEm: string;
  duracaoMinutos: number;
  inscrito: boolean;
}

export interface DadosNovaArea {
  nome: string;
  linkGrupoWelcomeAboard: string;
  linkPartilha: string | null;
  upline: { nome: string | null; email: string } | null;
  welcomeAboard: { sessao1Concluida: boolean; sessao2Concluida: boolean } | null;
  proximaSessao: { id: string; comecaEm: string } | null;
  inscritoWelcomeAboard: boolean;
  proximoWebinar: ProximoWebinarNovaArea | null;
  proximasFormacoes: FormacaoNovaArea[];
  primeirosPassos: { feitos: number[]; guardado: boolean };
  avisos: AvisoInicio[];
  erroAvisos: boolean;
  /** Participa no desafio BLACKFRIDAY (equipa de uma líder com bingo) ou é conta piloto. */
  acessoBlackfriday: boolean;
}

export interface AvisoInicio {
  id: string;
  categoria: "evento" | "equipa";
  icone: "questionario" | "trofeu" | "hotel";
  titulo: string;
  texto: string;
  href: string;
  anonimo?: boolean;
}

export type FormacaoNovaArea = {
  id: string; titulo: string; comecaEm: string;
} & ({ tipo: "interna"; duracaoMinutos: number; inscrito: boolean } | { tipo: "externa"; link: string });

export interface DadosEventosPresenciais {
  teambuilding: {
    titulo: string; data: string; local: string; precoAdulto: number; precoCrianca: number; inscricoesAbertas: boolean;
  };
  convencao: {
    titulo: string; data: string; erroPedido: boolean;
    pedido: {
      bilhetes: number; pagamento: string; comprovativoNome: string | null; comprovativoEm: string | null;
      comprovativo2Nome: string | null; comprovativo2Em: string | null;
    } | null;
  };
}
