import { NextResponse } from "next/server";
import { adicionarConsultorAdmin, alterarConsultorAdmin, apagarConsultorAdmin, ErroConsultorAdmin } from "@/lib/consultores-admin";

const SEM_CACHE = {"Cache-Control": "no-store"};

function falha(erro: unknown, acao: string): Response {
  if (erro instanceof ErroConsultorAdmin) return NextResponse.json({erro: erro.message}, {status: erro.status});
  console.error(`Falha ao ${acao} consultor:`, erro);
  return NextResponse.json({erro: `Não foi possível ${acao} o consultor. Tenta novamente.`}, {status: 500});
}

/** Protegido pela autenticação de /api/admin/* em proxy.ts. */
export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  try {
    const consultor = await adicionarConsultorAdmin(corpo);
    return NextResponse.json({consultor}, {status: 201, headers: SEM_CACHE});
  } catch (erro) {
    return falha(erro, "adicionar");
  }
}

/** Muda nome e/ou email: {emailAtual, nome, email}. */
export async function PATCH(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  try {
    const consultor = await alterarConsultorAdmin(corpo);
    return NextResponse.json({consultor}, {headers: SEM_CACHE});
  } catch (erro) {
    return falha(erro, "alterar");
  }
}

/** Tira o acesso: {email}. */
export async function DELETE(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  try {
    await apagarConsultorAdmin(corpo);
    return NextResponse.json({ok: true}, {headers: SEM_CACHE});
  } catch (erro) {
    return falha(erro, "apagar");
  }
}
