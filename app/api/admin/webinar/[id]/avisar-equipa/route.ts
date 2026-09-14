import { NextResponse } from "next/server";
import { criarEmailSender, notificarEquipaNovaSessao, reiniciarAvisoEquipa } from "@/lib/email";
import { buscarWebinar } from "@/lib/webinars";

export const maxDuration = 60;

/**
 * Quantas pessoas por chamada. Cada envio pela ActiveCampaign são três
 * pedidos à API deles (contacto, lista, automação), à volta de 1,5s por
 * pessoa — 20 cabem à vontade nos 60s da função, e o painel volta a chamar
 * esta rota até `restantes` chegar a zero.
 */
const POR_LOTE = 20;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as { reiniciar?: unknown } | null;

  const webinar = await buscarWebinar(id);
  if (!webinar) {
    return NextResponse.json({ erro: "sessão não encontrada" }, { status: 404 });
  }

  try {
    // Só no primeiro lote — a partir daí o registo é o que trava o reenvio
    // a quem já recebeu nesta mesma passagem.
    if (corpo?.reiniciar === true) {
      await reiniciarAvisoEquipa(id);
    }

    const resultado = await notificarEquipaNovaSessao(
      criarEmailSender(),
      {
        webinarId: webinar.id,
        titulo: webinar.titulo,
        tipo: webinar.tipo,
        sessaoExternaEm: webinar.sessaoExternaEm,
      },
      POR_LOTE,
    );
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("falha ao reenviar o aviso à equipa:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "não foi possível enviar" },
      { status: 500 },
    );
  }
}
