import { NextResponse } from "next/server";
import { procurarContactoBrevo } from "@/lib/brevo-contatos";
import { guardarLinkConsultor, referenciaSemColisao } from "@/lib/consultor";
import { criarEmailSender } from "@/lib/email";
import { gerarSlug } from "@/lib/slug";
import { listarWebinarsFuturos } from "@/lib/webinars";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

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

    const nomeCompleto = [contacto.nome, contacto.apelido].filter(Boolean).join(" ").trim();
    const referenciaBase =
      gerarSlug(nomeCompleto) || gerarSlug(emailNormalizado.split("@")[0] ?? "");
    const referencia = referenciaSemColisao(referenciaBase);

    await guardarLinkConsultor(referencia, emailNormalizado, contacto.nome);

    const host = request.headers.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    const link = `${protocolo}://${host}/${referencia}`;

    await criarEmailSender().enviar({
      destinatario: emailNormalizado,
      assunto: `O teu link de inscrição para "${proximo.titulo}"`,
      corpoTexto:
        `Olá${contacto.nome ? ` ${contacto.nome}` : ""},\n\n` +
        `O teu link de inscrição para "${proximo.titulo}" (${formatarData(proximo.sessaoExternaEm)}):\n${link}\n\n` +
        `Partilha este link com os teus convidados — as inscrições feitas por ele ficam associadas a ti.`,
    });

    return NextResponse.json({ link, nome: contacto.nome });
  } catch (erro) {
    console.error("falha ao gerar link de consultor:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json(
      { erro: `não foi possível gerar o link (${mensagem})` },
      { status: 500 },
    );
  }
}
