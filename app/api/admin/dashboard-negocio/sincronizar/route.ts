import { NextResponse } from "next/server";
import { lerConfig } from "@/lib/dashboard-negocio";
import {
  faturacaoMetabase,
  guardarBruto,
  hojeLisboa,
  lerBruto,
  limparBruto,
  periodosAPedir,
  type Periodo,
} from "@/lib/dashboard-sincronizar";

export const maxDuration = 300;

/**
 * Botão «Atualizar dashboard» (ver src/lib/dashboard-sincronizar.ts).
 * Protegida pela Basic Auth de /api/admin/* (ver proxy.ts).
 *
 * GET            → o plano: que períodos pedir ao MyOffice
 * GET ?bruto=1   → as respostas guardadas da última atualização
 * POST { acao: "inicio" }                       → apaga as respostas anteriores
 * POST { acao: "parte", chave, corpo }          → guarda uma resposta do MyOffice
 * POST { acao: "metabase", iframeUrl, periodos } → faturação de cada período
 */
export async function GET(request: Request): Promise<Response> {
  if (new URL(request.url).searchParams.get("bruto")) {
    return NextResponse.json(await lerBruto());
  }
  const hoje = hojeLisboa();
  const mapas = await lerConfig<{ ytd_through_idx?: number }>("mapas");
  // O último mês que o dashboard já tem pode ter ficado a meio: volta a pedir-se.
  const primeiroMes = (mapas?.ytd_through_idx ?? Number(hoje.slice(5, 7)) - 1) + 1;
  return NextResponse.json({ hoje, periodos: periodosAPedir(hoje, primeiroMes) });
}

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as {
    acao?: string;
    chave?: string;
    corpo?: unknown;
    iframeUrl?: string;
    periodos?: Periodo[];
  } | null;

  try {
    if (corpo?.acao === "inicio") {
      await limparBruto();
      return NextResponse.json({ ok: true });
    }
    if (corpo?.acao === "parte" && typeof corpo.chave === "string" && corpo.corpo !== undefined) {
      await guardarBruto(corpo.chave, corpo.corpo);
      return NextResponse.json({ ok: true });
    }
    if (corpo?.acao === "metabase" && typeof corpo.iframeUrl === "string" && Array.isArray(corpo.periodos)) {
      const valores: Record<string, number | string> = {};
      for (const p of corpo.periodos) {
        try {
          valores[p.chave] = await faturacaoMetabase(corpo.iframeUrl, p.inicio, p.fim);
        } catch (erro) {
          valores[p.chave] = erro instanceof Error ? erro.message : String(erro);
        }
      }
      await guardarBruto("metabase", valores);
      return NextResponse.json({ valores });
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
  return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
}
