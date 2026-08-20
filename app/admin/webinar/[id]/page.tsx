import { notFound } from "next/navigation";
import { listarInscricoesAdmin } from "@/lib/admin";
import { buscarWebinar } from "@/lib/webinars";
import { CorrecaoPresenca } from "./correcao-presenca";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";
const COR_AUSENTE = "#d03b3b";
const COR_POR_CONFIRMAR = "#c3c2b7";

export default async function AdminWebinar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const webinar = await buscarWebinar(id);
  if (!webinar) notFound();

  const inscricoes = await listarInscricoesAdmin(id);
  const ativas = inscricoes.filter((i) => !i.cancelada);

  const total = ativas.length;
  const presentes = ativas.filter((i) => i.presenca === "attended").length;
  const ausentes = ativas.filter((i) => i.presenca === "absent").length;
  const porConfirmar = total - presentes - ausentes;

  const comMinutos = ativas.filter(
    (i) => i.presenca === "attended" && i.presencaMinutos !== null,
  );
  const mediaAssistencia =
    comMinutos.length > 0 && webinar.duracaoMinutos > 0
      ? Math.min(
          100,
          Math.round(
            (comMinutos.reduce((soma, i) => soma + (i.presencaMinutos ?? 0), 0) /
              comMinutos.length /
              webinar.duracaoMinutos) *
              100,
          ),
        )
      : null;

  const porConsultor = new Map<string, number>();
  for (const i of ativas) {
    const chave = i.referencia ?? "(sem referência)";
    porConsultor.set(chave, (porConsultor.get(chave) ?? 0) + 1);
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <main style={{ maxWidth: 900 }}>
      <h1>{webinar.titulo}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="cartao">
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{total}</div>
          <div className="mudo">Inscritos</div>
        </div>
        <div className="cartao">
          <div style={{ fontSize: "2rem", fontWeight: 800, color: COR_PRESENTE }}>
            {presentes}
            <span style={{ fontSize: "1rem", fontWeight: 600 }}> ({pct(presentes)}%)</span>
          </div>
          <div className="mudo">Assistiram</div>
        </div>
        <div className="cartao">
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>
            {mediaAssistencia !== null ? `${mediaAssistencia}%` : "—"}
          </div>
          <div className="mudo">Média de assistência</div>
        </div>
      </div>

      {total > 0 && (
        <div className="cartao" style={{ marginBottom: "1.5rem" }}>
          <strong>Presença</strong>
          <div
            style={{
              display: "flex",
              height: 14,
              borderRadius: 7,
              overflow: "hidden",
              marginTop: "0.75rem",
              background: "#f0efec",
            }}
          >
            {presentes > 0 && (
              <div
                style={{ width: `${pct(presentes)}%`, background: COR_PRESENTE }}
                title={`Presentes: ${presentes}`}
              />
            )}
            {ausentes > 0 && (
              <div
                style={{
                  width: `${pct(ausentes)}%`,
                  background: COR_AUSENTE,
                  marginLeft: presentes > 0 ? 2 : 0,
                }}
                title={`Ausentes: ${ausentes}`}
              />
            )}
            {porConfirmar > 0 && (
              <div
                style={{
                  width: `${pct(porConfirmar)}%`,
                  background: COR_POR_CONFIRMAR,
                  marginLeft: presentes + ausentes > 0 ? 2 : 0,
                }}
                title={`Por confirmar: ${porConfirmar}`}
              />
            )}
          </div>
          <div
            className="mudo"
            style={{ display: "flex", gap: "1.25rem", marginTop: "0.6rem", fontSize: "0.85rem" }}
          >
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: COR_PRESENTE,
                  marginRight: 6,
                }}
              />
              Presentes: {presentes}
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: COR_AUSENTE,
                  marginRight: 6,
                }}
              />
              Ausentes: {ausentes}
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: COR_POR_CONFIRMAR,
                  marginRight: 6,
                }}
              />
              Por confirmar: {porConfirmar}
            </span>
          </div>
        </div>
      )}

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
            <th>Apelido</th>
            <th>Telemóvel</th>
            <th>Email</th>
            <th>Referência</th>
            <th>Link</th>
            <th>Erro do link</th>
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
              <td>{i.apelido}</td>
              <td>{i.telemovel ?? "—"}</td>
              <td>{i.email}</td>
              <td>{i.referencia ?? "—"}</td>
              <td>
                <span className="etiqueta">{i.linkEstado}</span>
              </td>
              <td style={{ maxWidth: 260, fontSize: "0.85rem" }}>
                {i.linkUltimoErro
                  ? `(${i.linkTentativas}x) ${i.linkUltimoErro}`
                  : "—"}
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
