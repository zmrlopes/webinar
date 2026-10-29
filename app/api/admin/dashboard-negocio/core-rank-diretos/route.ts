import { gravarConfig, lerConfig } from "@/lib/dashboard-negocio";
import { importarCoreDiretos, importarCoreGrupo } from "@/lib/core-rank-diretos-importar";
import type { DadosCoreDiretos } from "@/lib/core-rank-diretos";

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
  const anterior = ambito === "grupo" ? await lerConfig<DadosCoreDiretos>("core_rank_grupo") : null;
  if (ambito === "grupo" && !anterior?.grupo) return Response.json({ erro: "Ainda não foi confirmada a lista de membros do grupo." }, { status: 400 });
  try {
    const bytes = await ficheiro.arrayBuffer();
    const desde = String(form?.get("desde") ?? "");
    const ate = String(form?.get("ate") ?? "");
    dados = ambito === "grupo" ? await importarCoreGrupo(bytes, anterior!.grupo!, desde, ate, ficheiro.name)
      : await importarCoreDiretos(bytes, emails, desde, ate, ficheiro.name);
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível ler a exportação." }, { status: 400 });
  }
  await gravarConfig(ambito === "grupo" ? "core_rank_grupo" : "core_rank_diretos", dados);
  return Response.json({ ok: true, consultores: dados.consultores.length });
}
