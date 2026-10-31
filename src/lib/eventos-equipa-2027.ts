import type { AcontecimentoCalendario } from "./calendario-consultor";

// Calendário Tropa de Elite 2027, com as correções confirmadas pelo utilizador.
// Horas online em Lisboa: UTC no inverno, UTC+1 no verão.
const eventos = [
  ["01-08", "01-10", "Be a Rock", "Presencial · transmissão online"],
  ["01-15", null, "Kick-Off Elite 2027", "Online", "21:00"],
  ["02-05", "02-07", "Top Recruiters", "Presencial · 10 ou mais TPs em 2026"],
  ["02-12", null, "Recrutamento", "Online", "21:00"],
  ["02-20", null, "Mindset Elite", "Presencial · todos juntos · dia inteiro"],
  ["03-13", null, "Convenção iCliGo", "Presencial · Exponor"],
  ["03-14", null, "Brunch pós-Convenção", "Presencial · Porto"],
  ["03-19", null, "Da inspiração à ação", "Online", "21:00"],
  ["04-22", "04-25", "Team Building", "Presencial · quatro dias"],
  ["05-07", "05-09", "Be a Pro", "Presencial · Madrid"],
  ["05-21", null, "Duplicação do negócio", "Online", "20:00"],
  ["05-22", null, "Business Brunch Centro", "Presencial · manhã"],
  ["05-29", null, "Business Brunch Norte", "Presencial · manhã"],
  ["06-19", "06-20", "Tony Robbins / Top Leaders", "Presencial · Colónia · aberto a interessados"],
  ["07-10", null, "Summer Experience Norte", "Presencial · manhã / tarde"],
  ["07-17", null, "Summer Experience Sul", "Presencial · manhã / tarde"],
  ["07-23", null, "Balanço do semestre", "Online", "20:00"],
  ["09-03", "09-05", "InTravel Weekend", "Presencial · toda a comunidade InTravel"],
  ["09-17", null, "Back to Business", "Online", "20:00"],
  ["09-18", null, "Produtividade Norte", "Presencial · manhã"],
  ["09-25", null, "Produtividade Centro", "Presencial · manhã"],
  ["10-08", "10-10", "Be a Leader", "Presencial · Madrid"],
  ["10-15", null, "Lições de Madrid", "Online", "20:00"],
  ["10-23", null, "Black Friday · Evento geral", "Presencial · todos juntos · dia inteiro"],
  ["11-05", null, "Black Friday na prática", "Online", "21:00"],
  ["11-13", null, "Elite Awards & Natal", "Presencial · toda a equipa"],
  ["12-11", null, "Vision 2028 Centro", "Presencial · manhã"],
  ["12-17", null, "Fecho do ano Elite", "Online", "21:00"],
  ["12-18", null, "Vision 2028 Norte", "Presencial · manhã"],
] as const;

export function eventosEquipa2027(mes: string): AcontecimentoCalendario[] {
  const resultado: AcontecimentoCalendario[] = [];
  for (const evento of eventos) {
    const [inicio, fim, titulo, local] = evento;
    const horaUTC = evento.length === 5 ? evento[4] : null;
    const primeiro = `2027-${inicio}`;
    const ultimo = `2027-${fim ?? inicio}`;
    // Cada dia dos encontros de vários dias aparece na grelha e na agenda.
    for (let dia = primeiro; dia <= ultimo;) {
      if (dia.startsWith(mes)) resultado.push({
        id: inicio === "03-13" ? "convencao-2027" : `equipa-2027-${inicio}-${dia}`,
        titulo, categoria: "evento", comecaEm: horaUTC ? `${dia}T${horaUTC}:00.000Z` : dia,
        terminaEm: null, diaInteiro: !horaUTC, local,
        url: inicio === "03-13" ? "/bilhetes-convencao" : null,
      });
      const seguinte = new Date(`${dia}T12:00:00Z`);
      seguinte.setUTCDate(seguinte.getUTCDate() + 1);
      dia = seguinte.toISOString().slice(0, 10);
    }
  }
  return resultado;
}
