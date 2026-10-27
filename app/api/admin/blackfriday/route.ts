import {NextResponse} from "next/server";
import {dadosBF, guardarConfigBF, reverReservaBF, ErroBF} from "@/lib/blackfriday-servidor";
export const runtime = "nodejs";
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});
function falha(e: unknown) {
  if (e instanceof ErroBF) return json({erro: e.message}, e.status);
  console.error("Admin Black Friday", e instanceof Error ? e.name : "erro");
  return json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, 500);
}
// /api/admin/* está protegido pela autenticação do proxy.ts.
export async function GET() {try {return json(await dadosBF());} catch (e) {return falha(e);}}
export async function POST(request: Request) {
  try {
    const corpo = await request.json().catch(() => null);
    if (corpo?.acao === "configurar") await guardarConfigBF(corpo.config);
    else if (corpo?.acao === "rever") await reverReservaBF(corpo.id, corpo.estado, corpo.motivo);
    else return json({erro: "Pedido inválido."}, 400);
    return json(await dadosBF());
  } catch (e) {return falha(e);}
}
