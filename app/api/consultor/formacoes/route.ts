import { NextResponse } from "next/server";
import { CATEGORIAS_FORMACOES, contarAulas, contarCursos, procurarCategoria } from "@/lib/formacoes-gravadas";
import { listarAulasVistas, verificarAcessoFormacoes } from "@/lib/formacoes-vistas";

/**
 * Formações gravadas do painel do consultor. Sem `categoria`, devolve o
 * resumo para os cards de /consultor/formacoes (com `completo: true`, também
 * todas as categorias por inteiro e as aulas vistas, para a pesquisa geral);
 * com `categoria`, devolve os cursos e aulas dessa categoria mais as aulas
 * que este consultor já viu.
 * Os dados só saem daqui depois de validar o email — por isso não vão no
 * código que o browser descarrega (os ids dos vídeos são de vídeos não listados).
 */
export async function POST(request: Request): Promise<Response> {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = corpo?.email;
  const categoriaId = corpo?.categoria;
  const completo = corpo?.completo === true;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ erro: "email inválido" }, { status: 400 });
  }
  if (categoriaId !== undefined && typeof categoriaId !== "string") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  try {
    const acesso = await verificarAcessoFormacoes(emailNormalizado);
    if (acesso === "indisponivel") {
      return NextResponse.json(
        { erro: "as formações gravadas ainda não estão disponíveis" },
        { status: 403 },
      );
    }
    if (acesso === "desconhecido") {
      return NextResponse.json(
        { erro: "não encontrámos esse email na equipa — confirma se está certo" },
        { status: 404 },
      );
    }

    if (categoriaId === undefined) {
      const disponiveis = CATEGORIAS_FORMACOES.filter((c) => c.disponivel);
      const extra = completo
        ? {
            completas: disponiveis,
            vistas: await listarAulasVistas(emailNormalizado).catch((erro) => {
              console.error("falha ao ler as aulas vistas:", erro);
              return [] as string[];
            }),
          }
        : {};
      return NextResponse.json({
        ...extra,
        categorias: CATEGORIAS_FORMACOES.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          descricao: c.descricao,
          disponivel: c.disponivel,
          totalCursos: contarCursos(c),
          totalAulas: contarAulas(c),
        })),
      });
    }

    const categoria = procurarCategoria(categoriaId);
    if (!categoria || !categoria.disponivel) {
      return NextResponse.json({ erro: "categoria não encontrada" }, { status: 404 });
    }

    // Se a migração 040 ainda não correu (ou a base de dados falhar), a
    // página continua a abrir — só não mostra o que já foi visto.
    const vistas = await listarAulasVistas(emailNormalizado).catch((erro) => {
      console.error("falha ao ler as aulas vistas:", erro);
      return [] as string[];
    });

    return NextResponse.json({ categoria, vistas });
  } catch (erro) {
    console.error("falha ao carregar as formações gravadas:", erro);
    return NextResponse.json({ erro: "não foi possível carregar as formações" }, { status: 500 });
  }
}
