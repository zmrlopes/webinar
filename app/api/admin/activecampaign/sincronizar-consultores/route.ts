import { NextResponse } from "next/server";
import { sincronizarConsultoresAtivosNaLista } from "@/lib/activecampaign";

export const maxDuration = 60;

export async function POST(): Promise<Response> {
  try {
    const resultado = await sincronizarConsultoresAtivosNaLista();
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao sincronizar consultores com a lista da ActiveCampaign:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível sincronizar" },
      { status: 500 },
    );
  }
}
