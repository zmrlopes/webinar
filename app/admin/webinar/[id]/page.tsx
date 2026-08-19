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

  const porConsultor = new Map<string, number>();
  for (const i of inscricoes) {
    const chave = i.referencia ?? "(sem referência)";
    porConsultor.set(chave, (porConsultor.get(chave) ?? 0) + 1);
  }

  return (
    <main style={{ maxWidth: 900 }}>
      <h1>{webinar.titulo}</h1>

      {porConsultor.size > 0 && (
        <div className="cartao">
          <strong>Por consultor</strong>
          <table>
            <tbody>
              {[...porConsultor.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([referencia, total]) => (
                  <tr key={referencia}>
                    <td>{referencia}</td>
                    <td>{total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telemóvel</th>
            <th>Email</th>
            <th>Referência</th>
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
                {i.nome}
                {i.cancelada && <span className="etiqueta"> cancelada</span>}
              </td>
              <td>{i.telemovel ?? "—"}</td>
              <td>{i.email}</td>
              <td>{i.referencia ?? "—"}</td>
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
