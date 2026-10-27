import {NextResponse} from "next/server";
import {dadosBF, guardarConfigBF, reverReservaBF, limparSimulacaoBF, ErroBF} from "@/lib/blackfriday-servidor";
export const runtime = "nodejs";
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});
function falha(e: unknown) {
  if (e instanceof ErroBF) return json({erro: e.message}, e.status);
  console.error("Admin Black Friday", e instanceof Error ? e.name : "erro");
  return json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, 500);
}
// /api/admin/* está protegido pela autenticação do proxy.ts.
export async function GET(request: Request) {
  try {
    const modo = new URL(request.url).searchParams.get("modo");
    if (modo && !["real", "simulacao"].includes(modo)) return json({erro: "Modo inválido."}, 400);
    return json(await dadosBF(undefined, modo === "simulacao"));
  } catch (e) {return falha(e);}
}
export async function POST(request: Request) {
  try {
    const corpo = await request.json().catch(() => null);
    if (corpo?.simulacao !== undefined && typeof corpo.simulacao !== "boolean") return json({erro: "Modo inválido."}, 400);
    const simulacao = corpo?.simulacao === true;
    if (corpo?.acao === "configurar" && !simulacao) await guardarConfigBF(corpo.config);
    else if (corpo?.acao === "rever") await reverReservaBF(corpo.id, corpo.estado, corpo.motivo, simulacao);
    else if (corpo?.acao === "limpar-simulacao" && simulacao) await limparSimulacaoBF();
    else return json({erro: "Pedido inválido."}, 400);
    return json(await dadosBF(undefined, simulacao));
  } catch (e) {return falha(e);}
}
