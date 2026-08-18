import { notFound } from "next/navigation";
import { listarInscricoesAdmin } from "@/lib/admin";
import { buscarWebinar } from "@/lib/webinars";
import { CorrecaoPresenca } from "./correcao-presenca";

export const dynamic = "force-dynamic";

export default async function AdminWebinar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const webinar = await buscarWebinar(id);
  if (!webinar) notFound();

  const inscricoes = await listarInscricoesAdmin(id);

  return (
    <main style={{ maxWidth: 900 }}>
      <h1>{webinar.titulo}</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Link</th>
            <th>Presença</th>
            <th>Minutos</th>
            <th>Corrigir</th>
          </tr>
        </thead>
        <tbody>
          {inscricoes.map((i) => (
            <tr key={i.id}>
              <td>
                {i.nome} {i.apelido}
                {i.cancelada && <span className="etiqueta"> cancelada</span>}
              </td>
              <td>{i.email}</td>
              <td>
                <span className="etiqueta">{i.linkEstado}</span>
              </td>
              <td>{i.presenca}</td>
              <td>{i.presencaMinutos ?? "—"}</td>
              <td>
                <CorrecaoPresenca registrationId={i.id} presencaAtual={i.presenca} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mudo" style={{ marginTop: "1.5rem" }}>
        O link pessoal de entrada nunca é mostrado aqui — é uma credencial, não um dado de
        gestão (secção 6 do guia).
      </p>
    </main>
  );
}
