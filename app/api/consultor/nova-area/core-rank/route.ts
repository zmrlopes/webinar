import { NextResponse } from "next/server";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";
import { buscarMembroEquipa } from "@/lib/equipa";
import { ErroCore, guardarDiaCore, lerDadosCore, marcarRelatorioLido } from "@/lib/core-rank-registos";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return NextResponse.json({erro: "Esta área ainda está em preparação."}, {status: 403});
  if (!corpo || !["consultar", "guardar", "ler-relatorio"].includes(corpo.acao)) return NextResponse.json({erro: "Pedido inválido."}, {status: 400});
  try {
    const membro = await buscarMembroEquipa(email);
    if (!membro) return NextResponse.json({erro: "Conta não encontrada."}, {status: 403});
    if (corpo.acao === "guardar") {
      if (typeof corpo.data !== "string") throw new ErroCore("Dia inválido.");
      await guardarDiaCore(email, membro.nome ?? "Consultor", corpo.data, corpo.registo);
    }
    if (corpo.acao === "ler-relatorio") {
      if (typeof corpo.semana !== "string") throw new ErroCore("Relatório inválido.");
      await marcarRelatorioLido(email, corpo.semana);
    }
    return NextResponse.json(await lerDadosCore(email), {headers: {"Cache-Control": "private, no-store"}});
  } catch (erro) {
    if (erro instanceof ErroCore) return NextResponse.json({erro: erro.message}, {status: erro.status});
    if (corpo.acao === "guardar" && erro instanceof Error && /inválid|quantidades|duas casas|caracteres|quantidade positiva/.test(erro.message)) return NextResponse.json({erro: erro.message}, {status: 400});
    console.error("Falha no Core Rank:", erro);
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
