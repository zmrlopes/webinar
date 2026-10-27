import { NextResponse } from "next/server";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import {
  listarInscricoesEventoDoEmail,
  substituirComprovativoEvento,
  TAMANHO_MAXIMO_COMPROVATIVO_EVENTO,
  TIPOS_COMPROVATIVO_EVENTO,
  type InscricaoEventoConsultor,
} from "@/lib/eventos";

const ID_DEMONSTRACAO = "demonstracao";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O painel de demonstração vê uma inscrição de exemplo quando não tem nenhuma. */
function inscricaoDemonstracao(): InscricaoEventoConsultor {
  return {
    id: ID_DEMONSTRACAO,
    adultos: 2,
    criancasMais10: 1,
    criancasMenos10: 1,
    totalPagar: 0,
    comprovativoNome: "comprovativo-exemplo.pdf",
    criadoEm: new Date().toISOString(),
  };
}

async function inscricoesDe(email: string): Promise<InscricaoEventoConsultor[]> {
  const inscricoes = await listarInscricoesEventoDoEmail(email);
  if (inscricoes.length === 0 && email === EMAIL_PAINEL_DEMONSTRACAO) return [inscricaoDemonstracao()];
  return inscricoes;
}

/**
 * Cartão do Teambuilding no separador Eventos: sem ficheiro devolve as
 * inscrições deste email; com `inscricaoId` + `ficheiro` substitui o
 * comprovativo dessa inscrição (só se for do mesmo email) e devolve a lista
 * atualizada. multipart/form-data por causa do ficheiro.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();
    const email = dados.get("email");
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ erro: "email inválido" }, { status: 400 });
    }
    const emailNormalizado = email.trim().toLowerCase();

    const ficheiro = dados.get("ficheiro");
    const inscricaoId = dados.get("inscricaoId");
    if (ficheiro === null) {
      return NextResponse.json({ inscricoes: await inscricoesDe(emailNormalizado) });
    }

    if (!(ficheiro instanceof File) || ficheiro.size === 0) {
      return NextResponse.json({ erro: "escolhe o ficheiro do comprovativo" }, { status: 400 });
    }
    if (!TIPOS_COMPROVATIVO_EVENTO.includes(ficheiro.type)) {
      return NextResponse.json({ erro: "o comprovativo tem de ser uma fotografia ou um PDF" }, { status: 400 });
    }
    if (ficheiro.size > TAMANHO_MAXIMO_COMPROVATIVO_EVENTO) {
      return NextResponse.json({ erro: "o ficheiro não pode passar 4MB" }, { status: 400 });
    }

    // A inscrição de exemplo do painel de demonstração aceita o envio sem gravar nada.
    if (inscricaoId === ID_DEMONSTRACAO && emailNormalizado === EMAIL_PAINEL_DEMONSTRACAO) {
      const exemplo = { ...inscricaoDemonstracao(), comprovativoNome: ficheiro.name || "comprovativo" };
      return NextResponse.json({ inscricoes: [exemplo] });
    }
    if (typeof inscricaoId !== "string" || !UUID.test(inscricaoId)) {
      return NextResponse.json({ erro: "inscrição inválida" }, { status: 400 });
    }

    const gravado = await substituirComprovativoEvento(inscricaoId, emailNormalizado, {
      bytes: Buffer.from(await ficheiro.arrayBuffer()),
      nome: ficheiro.name || "comprovativo",
      tipo: ficheiro.type,
    });
    if (!gravado) {
      return NextResponse.json({ erro: "não encontrámos esta inscrição com o teu email" }, { status: 404 });
    }
    return NextResponse.json({ inscricoes: await inscricoesDe(emailNormalizado) });
  } catch (erro) {
    console.error("falha ao trocar o comprovativo do Teambuilding:", erro);
    return NextResponse.json({ erro: "não foi possível gravar — tenta outra vez" }, { status: 500 });
  }
}
