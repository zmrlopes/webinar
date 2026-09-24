import { gerarExcelParticipantesEvento, listarParticipantesEvento } from "@/lib/eventos";

/** Ficheiro Excel com todos os participantes do evento e a divisão adultos/crianças por idade — ver gerarExcelParticipantesEvento. */
export async function GET(): Promise<Response> {
  const participantes = await listarParticipantesEvento();
  const excel = await gerarExcelParticipantesEvento(participantes);

  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="participantes-teambuilding.xlsx"',
    },
  });
}
