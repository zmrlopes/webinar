import Link from "next/link";
import { notFound } from "next/navigation";
import { listarInscricoesAdmin } from "@/lib/admin";
import { buscarWebinar } from "@/lib/webinars";
import { CorrecaoPresenca } from "./correcao-presenca";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";
const COR_AUSENTE = "#d03b3b";
const COR_POR_CONFIRMAR = "#8a887f";

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
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: linear-gradient(160deg, #1c1a16, #000);
          color: #e8e6df;
          margin: -2rem -1.25rem;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 980px; margin: 0 auto; }
        .ad-voltar { color: #d4af37; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-pagina h1 { color: #fff; font-size: 1.5rem; margin: 0.75rem 0 1.25rem; }
        .ad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .ad-cartao {
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
        }
        .ad-numero { font-size: 2rem; font-weight: 800; line-height: 1.1; color: #15130f; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-etiqueta {
          display: inline-block;
          background: #f1e6c9;
          color: #4a3c10;
          border: 1px solid #e2cf94;
          border-radius: 999px;
          padding: 0.15rem 0.65rem;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .ad-tabela-wrap {
          margin-top: 0;
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #eae7de;
        }
        .ad-tabela {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          background: #f7f6f3;
        }
        .ad-pagina table:not(.ad-tabela) {
          width: 100%;
          border-collapse: collapse;
        }
        .ad-tabela th, .ad-tabela td,
        .ad-pagina table:not(.ad-tabela) th, .ad-pagina table:not(.ad-tabela) td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          color: #15130f;
          border-bottom: 1px solid #eae7de;
          font-size: 0.9rem;
        }
        .ad-tabela th {
          color: #6b6a63;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ad-tabela tr:last-child td { border-bottom: none; }
        .ad-pagina button {
          background: linear-gradient(135deg, #e8c96a, #b8902f);
          color: #1a1712;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .ad-pagina button:disabled { opacity: 0.55; cursor: default; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Sessões
        </Link>
        <h1>{webinar.titulo}</h1>

        <div className="ad-grid">
          <div className="ad-cartao">
            <div className="ad-numero">{total}</div>
            <div className="ad-legenda">Inscritos</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero" style={{ color: COR_PRESENTE }}>
              {presentes}
              <span style={{ fontSize: "1rem", fontWeight: 600 }}> ({pct(presentes)}%)</span>
            </div>
            <div className="ad-legenda">Assistiram</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-numero">{mediaAssistencia !== null ? `${mediaAssistencia}%` : "—"}</div>
            <div className="ad-legenda">Média de assistência</div>
          </div>
        </div>

        {total > 0 && (
          <div className="ad-cartao" style={{ marginBottom: "1.5rem" }}>
            <strong>Presença</strong>
            <div
              style={{
                display: "flex",
                height: 14,
                borderRadius: 7,
                overflow: "hidden",
                marginTop: "0.75rem",
                background: "#eae7de",
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
              className="ad-legenda"
              style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginTop: "0.6rem" }}
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
          <div className="ad-cartao" style={{ marginBottom: "1.5rem" }}>
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

        <div className="ad-tabela-wrap">
          <table className="ad-tabela">
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
                    {i.cancelada && <span className="ad-etiqueta"> cancelada</span>}
                  </td>
                  <td>{i.apelido}</td>
                  <td>{i.telemovel ?? "—"}</td>
                  <td>{i.email}</td>
                  <td>{i.referencia ?? "—"}</td>
                  <td>
                    <span className="ad-etiqueta">{i.linkEstado}</span>
                  </td>
                  <td style={{ maxWidth: 260, fontSize: "0.85rem" }}>
                    {i.linkUltimoErro ? `(${i.linkTentativas}x) ${i.linkUltimoErro}` : "—"}
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
        </div>
        <p className="ad-legenda" style={{ marginTop: "1.5rem" }}>
          O link pessoal de entrada nunca é mostrado aqui — é uma credencial, não um dado de
          gestão (secção 6 do guia).
        </p>
      </div>
    </main>
  );
}
