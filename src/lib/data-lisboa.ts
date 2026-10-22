const formato = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
});

export function dataLisboa(agora = new Date()): string {
  const partes = formato.formatToParts(agora);
  return ["year", "month", "day"].map(tipo => partes.find(p => p.type === tipo)!.value).join("-");
}
