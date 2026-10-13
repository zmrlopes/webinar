import { NextResponse } from "next/server";
import { podeGravarProgressoCore } from "@/lib/core-rank";
import { buscarMembroEquipa } from "@/lib/equipa";
import { ErroCore, guardarDiaCore, lerDadosCore, marcarRelatorioLido } from "@/lib/core-rank-registos";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!email.includes("@")) return NextResponse.json({erro: "Identifica-te com o teu email de consultor."}, {status: 400});
  if (!corpo || !["consultar", "guardar", "gravar", "fechar", "ler-relatorio"].includes(corpo.acao)) return NextResponse.json({erro: "Pedido inválido."}, {status: 400});
  if (["gravar", "fechar"].includes(corpo.acao) && !podeGravarProgressoCore(email)) return NextResponse.json({erro: "Esta alteração está disponível apenas na conta de teste."}, {status: 403});
  try {
    const membro = await buscarMembroEquipa(email);
    if (!membro) return NextResponse.json({erro: "Conta não encontrada na equipa."}, {status: 403});
    if (["guardar", "gravar", "fechar"].includes(corpo.acao)) {
      if (typeof corpo.data !== "string") throw new ErroCore("Dia inválido.");
      await guardarDiaCore(email, membro.nome ?? "Consultor", corpo.data, corpo.registo, corpo.acao);
    }
    if (corpo.acao === "ler-relatorio") {
      if (typeof corpo.semana !== "string") throw new ErroCore("Relatório inválido.");
      await marcarRelatorioLido(email, corpo.semana);
    }
    return NextResponse.json({nome: membro.nome, ...await lerDadosCore(email)}, {headers: {"Cache-Control": "private, no-store"}});
  } catch (erro) {
    if (erro instanceof ErroCore) return NextResponse.json({erro: erro.message}, {status: erro.status});
    if (["guardar", "gravar", "fechar"].includes(corpo.acao) && erro instanceof Error && /inválid|quantidades|duas casas|caracteres|quantidade positiva/.test(erro.message)) return NextResponse.json({erro: erro.message}, {status: 400});
    console.error("Falha no Core Rank:", erro);
    return NextResponse.json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, {status: 500});
  }
}
