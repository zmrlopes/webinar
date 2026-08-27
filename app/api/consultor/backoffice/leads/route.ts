import { NextResponse } from "next/server";
import { buscarDescendentesEmails, buscarMembroEquipa } from "@/lib/equipa";
import { listarLeadsConsolidado } from "@/lib/leads";
import { listarSessoesPublicasParaPainel } from "@/lib/webinars";

/**
 * A tabela consolidada da página "Webinares" do backoffice: uma linha por
 * pessoa, juntando todas as sessões públicas (do consultor + da equipa
 * descendente dele) em que apareceu como lead. `sessoesDisponiveis` serve
 * só para os separadores "por sessão" da página (cada um usa
 * /api/consultor/estatisticas, a mesma vista do painel /consultor).
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const membro = await buscarMembroEquipa(emailNormalizado);
    if (!membro) {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }

    const descendentes = await buscarDescendentesEmails(emailNormalizado);
    const referenciaEmails = [emailNormalizado, ...descendentes];

    const [resumo, sessoesDisponiveis] = await Promise.all([
      listarLeadsConsolidado(referenciaEmails, emailNormalizado),
      listarSessoesPublicasParaPainel(),
    ]);
    return NextResponse.json({
      ...resumo,
      sessoesDisponiveis: sessoesDisponiveis.map((s) => ({
        id: s.id,
        sessaoExternaEm: s.sessaoExternaEm,
      })),
    });
  } catch (erro) {
    console.error("falha ao listar leads consolidados:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível obter as leads (${mensagem})` }, { status: 500 });
  }
}
