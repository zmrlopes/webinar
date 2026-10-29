import { gravarConfig } from "@/lib/dashboard-negocio";
import { importarCoreDiretos } from "@/lib/core-rank-diretos-importar";

export const runtime = "nodejs";

/** Protegido pela Basic Auth de /api/admin/* no proxy. Dados privados só na BD. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const ficheiro = form?.get("ficheiro");
  if (!(ficheiro instanceof File) || !ficheiro.name.toLowerCase().endsWith(".xlsx") || ficheiro.size > 5 * 1024 * 1024) {
    return Response.json({ erro: "Escolhe uma exportação Excel (.xlsx) até 5 MB." }, { status: 400 });
  }
  const emails = String(form?.get("contas") ?? "").split(/[\s,;]+/).filter(Boolean);
  if (!emails.length || emails.length > 3 || emails.some(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) {
    return Response.json({ erro: "Indica os emails de uma a três contas." }, { status: 400 });
  }
  let dados;
  try {
    dados = await importarCoreDiretos(await ficheiro.arrayBuffer(), emails,
      String(form?.get("desde") ?? ""), String(form?.get("ate") ?? ""), ficheiro.name);
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível ler a exportação." }, { status: 400 });
  }
  await gravarConfig("core_rank_diretos", dados);
  return Response.json({ ok: true, consultores: dados.consultores.length });
}
