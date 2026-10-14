import { NextResponse } from "next/server";
import { carregarCategoriasGravadas } from "@/lib/formacoes-gravadas-servidor";
import { marcarAulaVista, verificarAcessoFormacoes } from "@/lib/formacoes-vistas";

/** Marca (vista: true) ou desmarca (vista: false) uma aula como vista. */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const aulaId = corpo?.aulaId;
  const vista = corpo?.vista;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof aulaId !== "string" ||
    typeof vista !== "boolean"
  ) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const acesso = await verificarAcessoFormacoes(emailNormalizado);
    if (acesso !== "ok") {
      return NextResponse.json({ erro: "sem acesso às formações gravadas" }, { status: 403 });
    }
    const categorias = await carregarCategoriasGravadas();
    const existe = categorias.some(c => c.disponivel && [...c.cursos, ...c.icligo.cursos].some(curso => curso.modulos.some(m => m.aulas.some(a => a.id === aulaId))));
    if (!existe) {
      return NextResponse.json({ erro: "aula não encontrada" }, { status: 404 });
    }

    await marcarAulaVista(emailNormalizado, aulaId, vista);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("falha ao gravar a aula vista:", erro);
    return NextResponse.json({ erro: "não foi possível guardar" }, { status: 500 });
  }
}
