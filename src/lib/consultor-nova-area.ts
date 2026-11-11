import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";

/** Primeira migração real autorizada; não abrange a descendência da Ana. */
export const EMAIL_PILOTO_NOVA_AREA = "apensarnaproxima@gmail.com";

/** Esta área só será aberta às restantes contas por indicação explícita do utilizador. */
export function podeVerNovaArea(email: string): boolean {
  const conta = email.trim().toLowerCase();
  return conta === EMAIL_PAINEL_DEMONSTRACAO || conta === EMAIL_PILOTO_NOVA_AREA;
}

export function destinoEntradaNovaArea(email: string, pesquisa: string): string | null {
  return email.trim().toLowerCase() === EMAIL_PILOTO_NOVA_AREA && new URLSearchParams(pesquisa).get("area") !== "atual"
    ? "/consultor/nova-area" : null;
}

export function linkAreaAtual(email: string): string {
  return email.trim().toLowerCase() === EMAIL_PILOTO_NOVA_AREA ? "/consultor?area=atual" : "/consultor";
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
