import {NextResponse} from "next/server";
import {ErroConsultorAdmin} from "@/lib/consultores-admin";
import {enviarEmailTesteConsultor} from "@/lib/consultor-email-teste";

export const runtime = "nodejs";
export const maxDuration = 60;
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {
  status, headers: {"Cache-Control": "private, no-store", ...(status === 429 ? {"Retry-After": "60"} : {})},
});

/** Protegido pela autenticação de /api/admin/* em proxy.ts. Só envia após clique explícito. */
export async function POST(request: Request) {
  try {
    return json(await enviarEmailTesteConsultor(await request.json().catch(() => null)));
  } catch (erro) {
    if (erro instanceof ErroConsultorAdmin) return json({erro: erro.message}, erro.status);
    console.error("Falha ao pedir email de teste", erro instanceof Error ? erro.name : "erro");
    return json({erro: "Não foi possível concluir o pedido. Verifica o estado antes de repetir o teste."}, 500);
  }
}
