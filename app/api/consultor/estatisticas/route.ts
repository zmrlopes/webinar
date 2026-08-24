import { NextResponse } from "next/server";
import { procurarContactoBrevo } from "@/lib/brevo-contatos";
import { estatisticasConsultor, listarLeadsConsultor } from "@/lib/consultor";
import { buscarArvoreEquipa, buscarDescendentesEmails } from "@/lib/equipa";
import { buscarWebinar, buscarWebinarRelevante, listarWebinarsParaPainel } from "@/lib/webinars";

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const webinarId = corpo?.webinarId;

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

    const sessoesDisponiveis = await listarWebinarsParaPainel();
    const proximo =
      typeof webinarId === "string" ? await buscarWebinar(webinarId) : await buscarWebinarRelevante();
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
      webinar: { id: proximo.id, titulo: proximo.titulo, sessaoExternaEm: proximo.sessaoExternaEm },
      ...numeros,
      equipaTotal: descendentes.length,
      leads,
      equipa: arvoreEquipa,
      sessoesDisponiveis: sessoesDisponiveis.map((s) => ({
        id: s.id,
        titulo: s.titulo,
        sessaoExternaEm: s.sessaoExternaEm,
      })),
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
