import { NextResponse } from "next/server";
import { apagarGravacaoAdmin, ErroGravacao, guardarGravacaoAdmin, listarGravacoesAdmin } from "@/lib/formacoes-gravadas-servidor";
import { processarNotificacoesGravadas } from "@/lib/formacoes-gravadas-notificacoes";

export const runtime = "nodejs";
export const maxDuration = 60;
const resposta = (dados: unknown) => NextResponse.json(dados, {headers: {"Cache-Control": "private, no-store"}});
function falha(erro: unknown) {
  if (erro instanceof ErroGravacao) return NextResponse.json({erro: erro.message}, {status: erro.status});
  console.error("Falha na gestão de formações gravadas", erro instanceof Error ? erro.name : "erro");
  return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
}
export async function GET() {
  try {return resposta({gravacoes: await listarGravacoesAdmin()});} catch (erro) {return falha(erro);}
}
export async function POST(request: Request) {
  try {
    const gravacao = await guardarGravacaoAdmin(await request.json().catch(() => null));
    if (gravacao.visivel) await processarNotificacoesGravadas({gravacaoId: gravacao.id}).catch(() => console.error("Notificações da gravação pendentes; serão retomadas automaticamente."));
    return resposta({gravacao});
  } catch (erro) {return falha(erro);}
}
export async function DELETE(request: Request) {
  try {const corpo = await request.json().catch(() => null); await apagarGravacaoAdmin(corpo?.id); return resposta({ok: true});} catch (erro) {return falha(erro);}
}
