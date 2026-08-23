import { NextResponse } from "next/server";
import { procurarContactoBrevo } from "@/lib/brevo-contatos";
import { estatisticasConsultor, listarLeadsConsultor } from "@/lib/consultor";
import { buscarArvoreEquipa, buscarDescendentesEmails } from "@/lib/equipa";
import { listarWebinarsFuturos } from "@/lib/webinars";

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

    const webinars = await listarWebinarsFuturos();
    const proximo = webinars[0];
    if (!proximo) {
      return NextResponse.json({ erro: "não há sessões agendadas de momento" }, { status: 404 });
    }

    const descendentes = await buscarDescendentesEmails(emailNormalizado);
    const referenciaEmails = [emailNormalizado, ...descendentes];

    const [numeros, leads, arvoreEquipa] = await Promise.all([
      estatisticasConsultor(proximo.id, referenciaEmails),
      listarLeadsConsultor(proximo.id, emailNormalizado, referenciaEmails, proximo.duracaoMinutos),
      descendentes.length > 0 ? buscarArvoreEquipa(proximo.id, emailNormalizado) : null,
    ]);

    return NextResponse.json({
      webinar: { titulo: proximo.titulo, sessaoExternaEm: proximo.sessaoExternaEm },
      ...numeros,
      equipaTotal: descendentes.length,
      leads,
      equipa: arvoreEquipa,
    });
  } catch (erro) {
    console.error("falha ao calcular estatísticas do consultor:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json(
      { erro: `não foi possível obter os números (${mensagem})` },
      { status: 500 },
    );
  }
}
