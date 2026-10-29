import { NextResponse } from "next/server";
import { calcularDashboard } from "@/lib/dashboard-calcular";
import { gravarConfig, lerConfig } from "@/lib/dashboard-negocio";
import { CAMPANHA_BF, periodoBF } from "@/lib/blackfriday";
import { configuracaoBF } from "@/lib/blackfriday-servidor";
import type { DadosCoreDiretos } from "@/lib/core-rank-diretos";
import {
  guardarBruto,
  hojeLisboa,
  lerBruto,
  limparBruto,
  periodosAPedir,
  type Periodo,
} from "@/lib/dashboard-sincronizar";
import {
  anosReservasAPedir,
  calcularAno,
  juntarAnos,
  type ArvoreReservas,
  type DadosReservasMedias,
} from "@/lib/reservas-medias";

export const maxDuration = 300;

/**
 * Botão «Atualizar dashboard» (ver src/lib/dashboard-sincronizar.ts).
 * Protegida pela Basic Auth de /api/admin/* (ver proxy.ts).
 *
 * GET            → o plano: que períodos pedir ao MyOffice
 * GET ?bruto=1   → as respostas guardadas da última atualização
 * POST { acao: "inicio" }                       → apaga as respostas anteriores e devolve o plano
 * POST { acao: "calcular", gravar }             → recalcula os separadores (ver src/lib/dashboard-calcular.ts)
 * POST { acao: "parte", chave, corpo }          → guarda uma resposta do MyOffice
 */
async function plano(): Promise<{ hoje: string; periodos: Periodo[]; anosReservas: number[] }> {
  const hoje = hojeLisboa();
  const mapas = await lerConfig<{ ytd_through_idx?: number }>("mapas");
  // O último mês que o dashboard já tem pode ter ficado a meio: volta a pedir-se.
  const primeiroMes = (mapas?.ytd_through_idx ?? Number(hoje.slice(5, 7)) - 1) + 1;
  const reservas = await lerConfig<DadosReservasMedias>("reservas_medias");
  const anosReservas = anosReservasAPedir(reservas, Number(hoje.slice(0, 4)));
  const periodos = periodosAPedir(hoje, primeiroMes);
  const grupo = await lerConfig<DadosCoreDiretos>("core_rank_grupo");
  if (grupo?.grupo && grupo.desde <= hoje) periodos.push({ chave: "core-rank-grupo", inicio: grupo.desde, fim: grupo.ate < hoje ? grupo.ate : hoje });
  const bf = periodoBF(await configuracaoBF(), hoje);
  if (bf.fim >= bf.inicio) periodos.push({chave: `blackfriday-${CAMPANHA_BF}`, ...bf});
  return { hoje, periodos, anosReservas };
}

export async function GET(request: Request): Promise<Response> {
  if (new URL(request.url).searchParams.get("bruto")) {
    return NextResponse.json(await lerBruto());
  }
  return NextResponse.json(await plano());
}

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as {
    acao?: string;
    chave?: string;
    corpo?: unknown;
    periodos?: Periodo[];
    gravar?: boolean;
  } | null;

  try {
    if (corpo?.acao === "inicio") {
      await limparBruto();
      const p = await plano();
      await guardarBruto("plano", p);
      return NextResponse.json(p);
    }
    if (corpo?.acao === "calcular") {
      return NextResponse.json(await calcularDashboard(corpo.gravar === true));
    }
    if (corpo?.acao === "parte" && typeof corpo.chave === "string" && corpo.corpo !== undefined) {
      await guardarBruto(corpo.chave, corpo.corpo);
      // Cada ano das reservas médias grava-se logo: não fica à espera de
      // listas da equipa que o MyOffice pode demorar minutos a devolver.
      if (/^reservas-\d{4}$/.test(corpo.chave)) {
        const arvore = corpo.corpo as ArvoreReservas;
        if (arvore?.raiz && Array.isArray(arvore.nos)) {
          const ano = calcularAno(Number(corpo.chave.slice(-4)), arvore, hojeLisboa());
          const anterior = await lerConfig<DadosReservasMedias>("reservas_medias");
          await gravarConfig("reservas_medias", juntarAnos(anterior, [ano], hojeLisboa()));
        }
      }
      return NextResponse.json({ ok: true });
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
  return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
}
