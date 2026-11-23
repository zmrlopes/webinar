import { BE_A_ROCK, type ZonaBeARock } from "./be-a-rock";
import { CRUZEIRO_TROPA_ELITE, perguntaDividirCabine, type VotoCruzeiroTropaElite } from "./cruzeiro-tropa-elite";
import type { AvisoInicio } from "./consultor-nova-area";

function eventoTerminou(fim: string, agora: Date): boolean {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return hoje > fim;
}

export function avisoSondagemBeARock(voto: ZonaBeARock | null, agora = new Date()): AvisoInicio | null {
  if (voto || eventoTerminou(BE_A_ROCK.fim, agora)) return null;
  return { id: "sondagem-be-a-rock", categoria: "sondagem", icone: "questionario",
    titulo: BE_A_ROCK.titulo, texto: "Como vais assistir ao Be a Rock? Responde à sondagem do encontro.",
    href: "/consultor/nova-area?seccao=eventos-presenciais" };
}

export function avisoSondagemCruzeiro(voto: VotoCruzeiroTropaElite | null, agora = new Date()): AvisoInicio | null {
  const faltaCabine = voto && perguntaDividirCabine(voto.opcao, voto.acompanhantes) && voto.dispostoDividirCabine === null;
  if ((voto && !faltaCabine) || eventoTerminou(CRUZEIRO_TROPA_ELITE.fim, agora)) return null;
  return { id: "sondagem-cruzeiro-tropa-elite", categoria: "sondagem", icone: "questionario",
    titulo: CRUZEIRO_TROPA_ELITE.titulo,
    texto: faltaCabine ? "Falta indicar se estás disposto a dividir uma cabine." : "Como queres participar? Responde à sondagem do cruzeiro e Barcelona.",
    href: "/consultor/nova-area?seccao=eventos-presenciais" };
}

export type AtualizarAvisoSondagem = (id: string, aviso: AvisoInicio | null) => void;
