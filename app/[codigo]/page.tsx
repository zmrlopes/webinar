import { notFound, redirect } from "next/navigation";
import { procurarLinkConsultor } from "@/lib/consultor";
import { listarWebinarsFuturos } from "@/lib/webinars";

export const dynamic = "force-dynamic";

/**
 * Link curto de consultor: "/joao-silva" em vez de
 * "/webinar/<uuid>?ref=joao-silva&refEmail=...". Resolve o código gravado
 * por POST /api/consultor/link e redireciona para a sessão futura mais
 * próxima, com os mesmos parâmetros de sempre — o resto do fluxo
 * (formulário, tracking de cliques, notificação ao consultor) não muda.
 */
export default async function LinkCurtoConsultor({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;

  const link = await procurarLinkConsultor(codigo);
  if (!link) notFound();

  const webinars = await listarWebinarsFuturos();
  const proximo = webinars[0];
  if (!proximo) notFound();

  const parametros = new URLSearchParams({ ref: codigo, refEmail: link.referenciaEmail });
  redirect(`/webinar/${proximo.id}?${parametros.toString()}`);
}
