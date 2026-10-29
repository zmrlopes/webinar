import { gravarConfig, lerConfig } from "@/lib/dashboard-negocio";
import { importarCoreDiretos, lerMembrosCoreExcel } from "@/lib/core-rank-diretos-importar";
import { construirCoreGrupo } from "@/lib/core-rank-grupo";
import type { DadosCoreDiretos, MembroCoreDiretos } from "@/lib/core-rank-diretos";
import { guardarAssociacaoCoreGrupo, guardarAtualizacaoCoreGrupo } from "@/lib/core-rank-grupo-servidor";

export const runtime = "nodejs";

/** Protegido pela Basic Auth de /api/admin/* no proxy. Dados privados só na BD. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const ficheiro = form?.get("ficheiro");
  if (!(ficheiro instanceof File) || !ficheiro.name.toLowerCase().endsWith(".xlsx") || ficheiro.size > 5 * 1024 * 1024) {
    return Response.json({ erro: "Escolhe uma exportação Excel (.xlsx) até 5 MB." }, { status: 400 });
  }
  const ambito = form?.get("ambito") === "grupo" ? "grupo" : "diretos";
  const emails = String(form?.get("contas") ?? "").split(/[\s,;]+/).filter(Boolean);
  if (ambito === "diretos" && (!emails.length || emails.length > 3 || emails.some(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))) {
    return Response.json({ erro: "Indica os emails de uma a três contas." }, { status: 400 });
  }
  let dados;
  let arvoreGrupo: MembroCoreDiretos[] | undefined;
  const anterior = ambito === "grupo" ? await lerConfig<DadosCoreDiretos>("core_rank_grupo") : null;
  if (ambito === "grupo" && !anterior?.grupo) return Response.json({ erro: "Ainda não foi confirmada a lista de membros do grupo." }, { status: 400 });
  try {
    const bytes = await ficheiro.arrayBuffer();
    const desde = String(form?.get("desde") ?? "");
    const ate = String(form?.get("ate") ?? "");
    if (ambito === "grupo") {
      const membros = await lerMembrosCoreExcel(bytes);
      dados = construirCoreGrupo(membros, anterior!.grupo!, desde, ate, ficheiro.name);
      arvoreGrupo = membros;
    } else dados = await importarCoreDiretos(bytes, emails, desde, ate, ficheiro.name);
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível ler a exportação." }, { status: 400 });
  }
  if (ambito === "grupo") {
    if (!await guardarAtualizacaoCoreGrupo(anterior!, dados, arvoreGrupo!)) return Response.json({ erro: "A lista mudou durante a importação. Atualiza a página e tenta novamente." }, { status: 409 });
  } else await gravarConfig("core_rank_diretos", dados);
  return Response.json({ ok: true, consultores: dados.consultores.length });
}

/** A mesma proteção Basic Auth de /api/admin/* aplica-se à associação manual. */
export async function PATCH(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.indice) || body.indice < 0 || typeof body.nome !== "string" || typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) {
    return Response.json({ erro: "Indica um email válido para este membro." }, { status: 400 });
  }
  try {
    const resultado = await guardarAssociacaoCoreGrupo(body.indice, body.nome, body.email);
    return Response.json({ ok: true, ...resultado });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível associar." }, { status: 400 });
  }
}
