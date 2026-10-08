import { NextResponse } from "next/server";
import { sincronizarForumIcligo } from "@/lib/forum-icligo";

export const maxDuration = 60;
/** Protegida pela autenticação de /api/admin no proxy. */
export async function POST(): Promise<Response> {
  try {
    const meses = await sincronizarForumIcligo(true);
    const aviso = meses.find(m => m.aviso)?.aviso;
    if (aviso) return NextResponse.json({ erro: aviso, meses }, { status: 502 });
    if (!meses.some(m => m.atualizadoEm)) return NextResponse.json({ erro: "É preciso ligar uma sessão do fórum iCliGo antes da primeira importação." }, { status: 409 });
    return NextResponse.json({ meses, quantidade: meses.reduce((total, m) => total + m.quantidade, 0) });
  } catch { return NextResponse.json({ erro: "Não foi possível atualizar as formações do fórum." }, { status: 500 }); }
}
