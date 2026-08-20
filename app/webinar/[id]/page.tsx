import { notFound } from "next/navigation";
import { procurarLinkConsultor } from "@/lib/consultor";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const { ref } = await searchParams;
  const webinar = await buscarWebinar(id);
  if (!webinar) notFound();

  const link = ref ? await procurarLinkConsultor(ref) : null;
  const convidadoPor = link?.nome ?? null;

  return (
    <main className="wf-pagina">
      <style>{`
        .wf-pagina {
          background: #f7f6f3;
          border: 1px solid #eae7de;
          border-radius: 16px;
          padding: 2.25rem 2rem;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .wf-kicker {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          font-weight: 700;
          color: #a67c1e;
          margin: 0 0 0.5rem;
        }
        .wf-convite {
          display: inline-block;
          background: #f1e6c9;
          color: #4a3c10;
          border: 1px solid #e2cf94;
          border-radius: 999px;
          padding: 0.3rem 0.85rem;
          font-size: 0.85rem;
          margin: 0 0 0.9rem;
        }
        .wf-convite strong { font-weight: 700; }
        .wf-pagina h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #15130f;
          margin: 0 0 0.35rem;
        }
        .wf-data {
          color: #6b6a63;
          font-size: 0.9rem;
          margin: 0 0 1.5rem;
        }
        .wf-pagina label {
          display: block;
          font-weight: 700;
          color: #15130f;
          margin-top: 1.1rem;
          margin-bottom: 0.35rem;
        }
        .wf-pagina input:not([type="checkbox"]) {
          display: block;
          width: 100%;
          box-sizing: border-box;
          padding: 0.65rem 0.85rem;
          border: 1px solid #ddd9cd;
          border-radius: 8px;
          font-size: 1rem;
          background: #fff;
          color: #15130f;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .wf-pagina input:not([type="checkbox"]):focus {
          outline: none;
          border-color: #b8902f;
          box-shadow: 0 0 0 3px rgba(184, 144, 47, 0.18);
        }
        .wf-consentimento {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          margin-top: 1.5rem;
          font-weight: 400 !important;
          color: #3a382f;
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .wf-consentimento input {
          width: auto;
          margin-top: 0.2rem;
          accent-color: #b8902f;
        }
        .wf-consentimento a {
          color: #96731f;
          font-weight: 700;
          text-decoration: underline;
        }
        .wf-pagina button[type="submit"] {
          margin-top: 1.5rem;
          width: 100%;
          padding: 0.85rem 1.4rem;
          background: linear-gradient(135deg, #201d18, #000);
          color: #d4af37;
          border: 1px solid #2c2820;
          border-radius: 8px;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: filter 0.15s, box-shadow 0.15s;
        }
        .wf-pagina button[type="submit"]:hover:not(:disabled) {
          filter: brightness(1.2);
          box-shadow: 0 4px 14px rgba(184, 144, 47, 0.25);
        }
        .wf-pagina button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .wf-pagina .erro { color: #b3261e; margin-top: 0.75rem; }
        .wf-pagina .sucesso { color: #1e7a34; font-weight: 600; }
      `}</style>

      {convidadoPor && (
        <p className="wf-convite">
          Convite de <strong>{convidadoPor}</strong>
        </p>
      )}
      <p className="wf-kicker">Reserva o teu lugar</p>
      <h1>{webinar.titulo}</h1>
      <p className="wf-data">
        {formatarData(webinar.sessaoExternaEm)} · {webinar.duracaoMinutos} min
      </p>
      <FormularioInscricao webinarId={webinar.id} />
    </main>
  );
}
