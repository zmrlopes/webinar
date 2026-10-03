import { NextResponse } from "next/server";
import {
  buscarPedidoDoConsultor,
  guardarComprovativo,
  TAMANHO_MAXIMO_COMPROVATIVO,
  TIPOS_COMPROVATIVO,
} from "@/lib/bilhetes-convencao";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { buscarMembroEquipa } from "@/lib/equipa";

/**
 * O consultor envia o comprovativo de pagamento do bilhete da Convenção a
 * partir do separador Eventos do painel. Fica junto do pedido feito com o
 * mesmo email em /bilhetes-convencao (e um envio novo substitui o anterior).
 * `pagamento` = "2" é o comprovativo do restante, para quem paga em duas vezes.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const dados = await request.formData();
    const email = dados.get("email");
    const ficheiro = dados.get("ficheiro");
    const numero = dados.get("pagamento") === "2" ? 2 : 1;

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ erro: "email inválido" }, { status: 400 });
    }
    if (!(ficheiro instanceof File) || ficheiro.size === 0) {
      return NextResponse.json({ erro: "escolhe o ficheiro do comprovativo" }, { status: 400 });
    }
    if (!TIPOS_COMPROVATIVO.includes(ficheiro.type)) {
      return NextResponse.json({ erro: "o comprovativo tem de ser uma fotografia ou um PDF" }, { status: 400 });
    }
    if (ficheiro.size > TAMANHO_MAXIMO_COMPROVATIVO) {
      return NextResponse.json({ erro: "o ficheiro não pode passar 4MB" }, { status: 400 });
    }

    // O mesmo pedido que o cartão mostra: pelo email, ou pelo nome do membro da equipa.
    const emailNormalizado = email.trim().toLowerCase();
    const membro = await buscarMembroEquipa(emailNormalizado);
    const pedido = await buscarPedidoDoConsultor(emailNormalizado, membro?.nome ?? null);
    // O painel de demonstração tem um pedido de exemplo: aceita o envio sem gravar nada.
    if (!pedido && emailNormalizado === EMAIL_PAINEL_DEMONSTRACAO) {
      return NextResponse.json({ ok: true });
    }
    if (!pedido) {
      return NextResponse.json(
        { erro: "não encontrámos um pedido de bilhete com este email" },
        { status: 404 },
      );
    }
    await guardarComprovativo(pedido.id, numero, {
      nome: ficheiro.name || "comprovativo",
      tipo: ficheiro.type,
      bytes: Buffer.from(await ficheiro.arrayBuffer()),
    });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao guardar comprovativo da Convenção:", erro);
    return NextResponse.json({ erro: "não foi possível gravar — tenta outra vez" }, { status: 500 });
  }
}
