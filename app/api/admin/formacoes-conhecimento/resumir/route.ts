import { NextResponse } from "next/server";
import { aulasPorResumir, resumirAula } from "@/lib/formacoes-resumir";

export const maxDuration = 60;

/**
 * Destila o conhecimento das aulas que já têm transcrição mas ainda não têm
 * resumo, algumas de cada vez (em paralelo, para caber no limite de tempo).
 * Chamar repetidamente até `restam` chegar a 0. Corpo opcional: { ids: [...] }
 * para refazer aulas concretas.
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { ids?: unknown; quantas?: unknown } | null;
  const quantas = typeof corpo?.quantas === "number" ? Math.min(6, Math.max(1, corpo.quantas)) : 4;
  const ids = Array.isArray(corpo?.ids)
    ? corpo.ids.filter((i): i is string => typeof i === "string").slice(0, quantas)
    : await aulasPorResumir(quantas);

  const resultados = await Promise.allSettled(ids.map((id) => resumirAula(id)));
  const feitas = resultados.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const erros = resultados.flatMap((r, i) => (r.status === "rejected" ? [{ id: ids[i], erro: String(r.reason) }] : []));
  const restam = (await aulasPorResumir(1000)).length;
  return NextResponse.json({ feitas, erros, restam });
}
