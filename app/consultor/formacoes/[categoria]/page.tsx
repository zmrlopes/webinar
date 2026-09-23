import { CategoriaPagina } from "./categoria-pagina";

export const dynamic = "force-dynamic";

export default async function PaginaCategoriaFormacoes({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  return <CategoriaPagina categoriaId={categoria} />;
}
