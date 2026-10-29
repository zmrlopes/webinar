import { gravarConfig, lerConfig } from "@/lib/dashboard-negocio";
import { importarCoreDiretos, lerMembrosCoreExcel } from "@/lib/core-rank-diretos-importar";
import { associarMembroCoreEmail, construirCoreGrupo } from "@/lib/core-rank-grupo";
import type { DadosCoreDiretos, MembroCoreDiretos } from "@/lib/core-rank-diretos";
import { lerBruto } from "@/lib/dashboard-sincronizar";

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
    if (ambito === "grupo") {
      const membros = await lerMembrosCoreExcel(bytes);
      dados = construirCoreGrupo(membros, anterior!.grupo!, desde, ate, ficheiro.name);
      await gravarConfig("core_rank_grupo_arvore", membros);
    } else dados = await importarCoreDiretos(bytes, emails, desde, ate, ficheiro.name);
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível ler a exportação." }, { status: 400 });
  }
  await gravarConfig(ambito === "grupo" ? "core_rank_grupo" : "core_rank_diretos", dados);
  return Response.json({ ok: true, consultores: dados.consultores.length });
}

/** A mesma proteção Basic Auth de /api/admin/* aplica-se à associação manual. */
export async function PATCH(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.indice) || body.indice < 0 || typeof body.nome !== "string" || typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) {
    return Response.json({ erro: "Indica um email válido para este membro." }, { status: 400 });
  }
  const [dados, membros] = await Promise.all([
    lerConfig<DadosCoreDiretos>("core_rank_grupo"),
    lerConfig<MembroCoreDiretos[]>("core_rank_grupo_arvore"),
  ]);
  if (!dados?.grupo) return Response.json({ erro: "Ainda não existe a lista do grupo." }, { status: 400 });
  try {
    if (!membros) {
      const participante = dados.grupo.membros[body.indice];
      if (!participante || participante.nome !== body.nome || participante.username) throw new Error("A lista mudou. Atualiza a página.");
      const bruto = await lerBruto();
      const contas = new Map<string, string>();
      for (const [chave, valor] of Object.entries(bruto)) {
        if (!/^equipa:p\d+$/.test(chave)) continue;
        const pagina = valor.corpo as { list?: { content?: { user?: { email?: string; username?: string } }[] }; content?: { user?: { email?: string; username?: string } }[] };
        for (const a of pagina.list?.content ?? pagina.content ?? []) {
          if (a.user?.username && a.user.email?.trim().toLowerCase() === body.email.trim().toLowerCase()) contas.set(a.user.username.toLowerCase(), a.user.username);
        }
      }
      if (contas.size !== 1) throw new Error("Este email não identifica uma única conta nos dados guardados. Confirma o email ou usa a ferramenta Atualizar dados.");
      participante.username = [...contas.values()][0]!;
      delete participante.motivo;
      await gravarConfig("core_rank_grupo", dados);
      return Response.json({ ok: true, atualizar: true });
    }
    const resultado = associarMembroCoreEmail(dados, membros, body.indice, body.nome, body.email);
    await gravarConfig("core_rank_grupo", resultado);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Não foi possível associar." }, { status: 400 });
  }
}
