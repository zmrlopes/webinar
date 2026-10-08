import { precisaResponderTeambuilding } from "./teambuilding";
import { precisaResponderTrofeus } from "./trofeus";
import { precisaResponderHotel } from "./hotel";
import { questionariosPendentes } from "./questionarios";
import type { AvisoInicio } from "./consultor-nova-area";

export async function obterAvisosConsultor(email: string): Promise<AvisoInicio[]> {
  const [teambuilding, trofeus, hotel, questionarios] = await Promise.all([
    precisaResponderTeambuilding(email), precisaResponderTrofeus(email),
    precisaResponderHotel(email), questionariosPendentes(email),
  ]);
  const avisos: AvisoInicio[] = [];
  if (teambuilding) avisos.push({ id: "teambuilding", categoria: "evento", icone: "questionario",
    titulo: "Preparação do Teambuilding", texto: "Conta-nos o que esperas do dia e as formações que gostarias de ter.",
    href: "/consultor/teambuilding" });
  if (trofeus) avisos.push({ id: "trofeus", categoria: "evento", icone: "trofeu",
    titulo: "Troféus a entregar", texto: "Indica os troféus que queres receber e os que já tens.",
    href: "/consultor/trofeus" });
  if (hotel) avisos.push({ id: "hotel", categoria: "evento", icone: "hotel",
    titulo: "Quarto no hotel", texto: "Diz-nos se precisas de quarto, o tipo e as noites da tua estadia.",
    href: "/consultor/hotel" });
  avisos.push(...questionarios.map(q => ({ id: q.slug, categoria: "equipa" as const, icone: "questionario" as const,
    titulo: q.titulo, texto: q.chamada, href: `/consultor/questionario/${q.slug}`, anonimo: true })));
  return avisos;
}
