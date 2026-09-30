import { NextResponse } from "next/server";
import {
  apagarConhecimento,
  catalogoFormacoes,
  gravarConhecimento,
  listarConhecimentoFormacoes,
  obterTranscricao,
  type GravarConhecimento,
} from "@/lib/formacoes-conhecimento";

/**
 * Base de conhecimento das formações (ver src/lib/formacoes-conhecimento.ts).
 * Protegida pela Basic Auth de /api/admin/* (ver proxy.ts). O conteúdo viaja
 * no corpo do pedido e vive só na base de dados, nunca no código público.
 *
 * GET              → catálogo de aulas + o que já está gravado (sem transcrições)
 * GET ?id=X        → a transcrição dessa aula
 * POST { itens }   → grava/atualiza aulas: { id, transcricao?, resumo?, temas? }
 * DELETE ?id=X     → apaga uma aula da base
 */
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const transcricao = await obterTranscricao(id);
    if (transcricao === null) return NextResponse.json({ erro: "sem transcrição" }, { status: 404 });
    return NextResponse.json({ id, transcricao });
  }
  const gravadas = await listarConhecimentoFormacoes();
  return NextResponse.json({ catalogo: catalogoFormacoes(), gravadas });
}

export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as { itens?: GravarConhecimento[] } | null;
  if (!corpo || !Array.isArray(corpo.itens)) {
    return NextResponse.json({ erro: "corpo precisa de 'itens'" }, { status: 400 });
  }
  const gravados: string[] = [];
  const erros: { id: string; erro: string }[] = [];
  for (const item of corpo.itens) {
    if (typeof item?.id !== "string") continue;
    try {
      await gravarConhecimento({
        id: item.id,
        transcricao: typeof item.transcricao === "string" ? item.transcricao : undefined,
        resumo: typeof item.resumo === "string" ? item.resumo : undefined,
        temas: Array.isArray(item.temas) ? item.temas.filter((t) => typeof t === "string") : undefined,
      });
      gravados.push(item.id);
    } catch (erro) {
      erros.push({ id: item.id, erro: String(erro) });
    }
  }
  return NextResponse.json({ ok: erros.length === 0, gravados: gravados.length, erros });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "falta ?id=" }, { status: 400 });
  await apagarConhecimento(id);
  return NextResponse.json({ ok: true });
}
