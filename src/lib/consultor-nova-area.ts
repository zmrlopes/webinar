import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";

/** Esta área só será aberta à equipa por indicação explícita do utilizador. */
export function podeVerNovaArea(email: string): boolean {
  return email.trim().toLowerCase() === EMAIL_PAINEL_DEMONSTRACAO;
}

/** Convite do grupo Welcome Aboard fornecido pelo utilizador. */
export const LINK_GRUPO_WELCOME_ABOARD = "https://chat.whatsapp.com/ECXPKjkgn0X3xW1eYlUSAy";
export const LINK_CURSO_TRAVEL_PARTNER = "https://academy.icligo.com/courses/be-a-travel-consultant-2";

export interface DadosNovaArea {
  nome: string;
  upline: { nome: string | null; email: string } | null;
  welcomeAboard: { sessao1Concluida: boolean; sessao2Concluida: boolean } | null;
  proximaSessao: { id: string; comecaEm: string } | null;
  inscritoWelcomeAboard: boolean;
}
