import { gerarExcelRespostasHotel, listarRespostasHotel } from "@/lib/hotel";

/** Ficheiro Excel a sério (Tabela nativa) com as respostas do questionário do hotel — ver gerarExcelRespostasHotel. */
export async function GET(): Promise<Response> {
  const respostas = await listarRespostasHotel();
  const excel = await gerarExcelRespostasHotel(respostas);

  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="quartos-hotel-teambuilding.xlsx"',
    },
  });
}
