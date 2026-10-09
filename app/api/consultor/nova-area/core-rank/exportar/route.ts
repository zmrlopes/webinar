import { NextResponse } from "next/server";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";
import { buscarMembroEquipa } from "@/lib/equipa";
import { lerDadosCore } from "@/lib/core-rank-registos";
import { exportarExcelCore, exportarPdfCore } from "@/lib/core-rank-exportar";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return NextResponse.json({erro: "Esta área ainda está em preparação."}, {status: 403});
  if (!["pdf","xlsx"].includes(corpo?.formato)) return NextResponse.json({erro: "Escolhe PDF ou Excel."}, {status: 400});
  try {
    const membro = await buscarMembroEquipa(email); if (!membro) return NextResponse.json({erro: "Conta não encontrada."}, {status: 403});
    const dados = await lerDadosCore(email), pdf = corpo.formato === "pdf";
    const ficheiro = pdf ? await exportarPdfCore(dados,membro.nome) : await exportarExcelCore(dados,membro.nome);
    return new Response(ficheiro as Uint8Array<ArrayBuffer>, {headers: {"Content-Type": pdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="core-rank-historico.${pdf ? "pdf" : "xlsx"}"`, "Cache-Control": "private, no-store"}});
  } catch (erro) {console.error("Falha ao exportar Core Rank:",erro); return NextResponse.json({erro: "Não foi possível exportar o histórico. Tenta novamente."}, {status: 500});}
}
