import { NextResponse } from "next/server";
import { ErroFAQ } from "@/lib/operadores-atualizacao";
import { ErroReserva } from "@/lib/reservas";
import { analisarFAQ, estadoFAQs, iniciarRecolha, publicarRecolha, reverRecolha } from "@/lib/operadores-atualizacao-servidor";

export const runtime = "nodejs";
export const maxDuration = 180;
const resposta = (v: unknown) => NextResponse.json(v, {headers: {"Cache-Control": "private, no-store"}});
function falha(e: unknown) {
  if (e instanceof ErroFAQ || e instanceof ErroReserva) return NextResponse.json({erro: e.message}, {status: e.status});
  console.error("Atualização FAQs: falha", e instanceof Error ? e.name : "erro");
  return NextResponse.json({erro: "Não foi possível concluir. A versão publicada mantém-se."}, {status: 500});
}
export async function GET() {try {return resposta(await estadoFAQs());} catch (e) {return falha(e);}}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ErroFAQ("Origem não autorizada.", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 3600000) throw new ErroFAQ("Recolha demasiado grande.", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 3600000) throw new ErroFAQ("Recolha demasiado grande.", 413);
    const c = JSON.parse(raw);
    switch (c?.acao) {
      case "recolher": return resposta(await iniciarRecolha(c.paginas));
      case "analisar": return resposta(await analisarFAQ(c.id, c.etapa));
      case "rever": return resposta(await reverRecolha(c.id));
      case "publicar": return resposta(await publicarRecolha(c.id));
      default: throw new ErroFAQ("Ação inválida.");
    }
  } catch (e) {return falha(e);}
}
