import { notFound } from "next/navigation";
import { buscarWebinar } from "@/lib/webinars";
import { FormularioInscricao } from "./formulario-inscricao";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function PaginaWebinar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const webinar = await buscarWebinar(id);
  if (!webinar) notFound();

  return (
    <main>
      <h1>{webinar.titulo}</h1>
      <p className="mudo">
        {formatarData(webinar.sessaoExternaEm)} · {webinar.duracaoMinutos} min
      </p>
      <FormularioInscricao webinarId={webinar.id} />
    </main>
  );
}
