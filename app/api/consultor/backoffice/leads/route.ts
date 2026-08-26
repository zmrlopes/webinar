import { NextResponse } from "next/server";
import { procurarContactoBrevo } from "@/lib/brevo-contatos";
import { buscarDescendentesEmails } from "@/lib/equipa";
import { listarLeadsConsolidado } from "@/lib/leads";

/**
 * A tabela consolidada da página "Webinares" do backoffice: uma linha por
 * pessoa, juntando todas as sessões públicas (do consultor + da equipa
 * descendente dele) em que apareceu como lead.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const contacto = await procurarContactoBrevo(emailNormalizado);
    if (!contacto) {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }

    const descendentes = await buscarDescendentesEmails(emailNormalizado);
    const referenciaEmails = [emailNormalizado, ...descendentes];

    const resumo = await listarLeadsConsolidado(referenciaEmails, emailNormalizado);
    return NextResponse.json(resumo);
  } catch (erro) {
    console.error("falha ao listar leads consolidados:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível obter as leads (${mensagem})` }, { status: 500 });
  }
}
