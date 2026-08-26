import { NextResponse } from "next/server";
import {
  calcularTotalEvento,
  organizacaoEventoValida,
  registarInscricaoEvento,
} from "@/lib/eventos";

const TAMANHO_MAXIMO_COMPROVATIVO = 4 * 1024 * 1024; // 4MB — margem sob o limite de payload do Vercel
const TIPOS_ACEITES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

function inteiroValido(valor: FormDataEntryValue | null, minimo: number): number | null {
  if (typeof valor !== "string") return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= minimo ? n : null;
}

/**
 * Inscrição no evento "Teambuilding Tropa de Elite", a partir do backoffice.
 * multipart/form-data porque inclui o ficheiro do comprovativo de
 * pagamento, guardado diretamente na base de dados (sem serviço de storage
 * externo) — ver src/lib/eventos.ts.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();

    const nome = dados.get("nome");
    const telemovel = dados.get("telemovel");
    const email = dados.get("email");
    const organizacao = dados.get("organizacao");
    const comprovativo = dados.get("comprovativo");

    if (typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ erro: "nome é obrigatório" }, { status: 400 });
    }
    if (typeof telemovel !== "string" || !telemovel.trim()) {
      return NextResponse.json({ erro: "telemóvel é obrigatório" }, { status: 400 });
    }
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ erro: "email inválido" }, { status: 400 });
    }
    if (!organizacaoEventoValida(organizacao)) {
      return NextResponse.json({ erro: "organização inválida" }, { status: 400 });
    }
    const adultos = inteiroValido(dados.get("adultos"), 1);
    if (adultos === null) {
      return NextResponse.json({ erro: "número de adultos inválido" }, { status: 400 });
    }
    const criancasMais10 = inteiroValido(dados.get("criancasMais10"), 0);
    if (criancasMais10 === null) {
      return NextResponse.json({ erro: "número de crianças (+10 anos) inválido" }, { status: 400 });
    }
    const criancasMenos10 = inteiroValido(dados.get("criancasMenos10"), 0);
    if (criancasMenos10 === null) {
      return NextResponse.json({ erro: "número de crianças (-10 anos) inválido" }, { status: 400 });
    }
    if (!(comprovativo instanceof File) || comprovativo.size === 0) {
      return NextResponse.json({ erro: "comprovativo de pagamento é obrigatório" }, { status: 400 });
    }
    if (comprovativo.size > TAMANHO_MAXIMO_COMPROVATIVO) {
      return NextResponse.json({ erro: "o comprovativo não pode passar 4MB" }, { status: 400 });
    }
    if (!TIPOS_ACEITES.has(comprovativo.type)) {
      return NextResponse.json(
        { erro: "o comprovativo tem de ser uma imagem ou um PDF" },
        { status: 400 },
      );
    }

    const comprovativoBytes = Buffer.from(await comprovativo.arrayBuffer());

    await registarInscricaoEvento({
      nome: nome.trim(),
      telemovel: telemovel.trim(),
      email: email.trim().toLowerCase(),
      organizacao,
      adultos,
      criancasMais10,
      criancasMenos10,
      comprovativoBytes,
      comprovativoNome: comprovativo.name,
      comprovativoTipo: comprovativo.type,
    });

    return NextResponse.json({ total: calcularTotalEvento(adultos, criancasMais10) });
  } catch (erro) {
    console.error("falha ao registar inscrição no evento:", erro);
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `não foi possível concluir a inscrição (${mensagem})` }, { status: 500 });
  }
}
