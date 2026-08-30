import { notFound } from "next/navigation";
import { listarInscricoesAdmin } from "@/lib/admin";
import { buscarWebinar } from "@/lib/webinars";
import { CancelarFormacao } from "./cancelar-formacao";
import { TabelaInscricoes } from "./tabela-inscricoes";

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

  const leadsInscricoes = inscricoes.filter((i) => !i.ehConsultor);
  const consultoresInscricoes = inscricoes.filter((i) => i.ehConsultor);
  const leadsAtivas = ativas.filter((i) => !i.ehConsultor);
  const consultoresAtivas = ativas.filter((i) => i.ehConsultor);

  const total = leadsAtivas.length;
  const presentes = leadsAtivas.filter((i) => i.presenca === "attended").length;
  const ausentes = leadsAtivas.filter((i) => i.presenca === "absent").length;
  const porConfirmar = total - presentes - ausentes;

  const comMinutos = leadsAtivas.filter(
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

  const totalConsultores = consultoresAtivas.length;
  const presentesConsultores = consultoresAtivas.filter((i) => i.presenca === "attended").length;
  const pctConsultores = (n: number) =>
    totalConsultores > 0 ? Math.round((n / totalConsultores) * 100) : 0;

  const porConsultor = new Map<string, { total: number; presentes: number }>();
  for (const i of leadsAtivas) {
    const chave = i.referencia ?? "(sem referência)";
    const atual = porConsultor.get(chave) ?? { total: 0, presentes: 0 };
    atual.total += 1;
    if (i.presenca === "attended") atual.presentes += 1;
    porConsultor.set(chave, atual);
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 1.25rem; }
        .ad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .ad-cartao {
          background: #f7f6f3;
          color: #000000;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
        }
        .ad-numero { font-size: 2rem; font-weight: 800; line-height: 1.1; color: #000000; }
        .ad-cartao-consultores { border-top: 3px solid #3a2f77; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }
        .ad-etiqueta {
          display: inline-block;
          background: #eef1e4;
          color: #4b5320;
          border: 1px solid #8a9a5b;
          border-radius: 999px;
          padding: 0.15rem 0.65rem;
          font-size: 0.75rem;
          white-space: nowrap;
          margin-left: 0.4rem;
        }
        .ad-tabela-wrap {
          margin-top: 0;
          border-radius: 10px;
          overflow-x: auto;
          border: 1px solid #000000;
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
          color: #000000;
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
        .ad-pagina button.ad-th-ordenar {
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          font: inherit;
          text-transform: inherit;
          letter-spacing: inherit;
          color: inherit;
          font-weight: inherit;
          border-radius: 0;
          cursor: pointer;
          white-space: nowrap;
        }
        .ad-pagina button.ad-th-ordenar:hover { color: #4b5320; }
        .ad-pagina button {
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .ad-pagina button:disabled { opacity: 0.55; cursor: default; }
      `}</style>

      <div className="ad-caixa">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.75rem" }}>
          <h1>{webinar.titulo}</h1>
          {webinar.tipo === "formacao" && (
            <CancelarFormacao webinarId={webinar.id} titulo={webinar.titulo} />
          )}
        </div>

        <div className="ad-grid">
          <div className="ad-cartao">
            <div className="ad-numero">{total}</div>
            <div className="ad-legenda">Leads inscritas</div>
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
          <div className="ad-cartao ad-cartao-consultores">
            <div className="ad-numero">{totalConsultores}</div>
            <div className="ad-legenda">
              Consultores inscritos
              {totalConsultores > 0 &&
                ` · ${presentesConsultores} assistiram (${pctConsultores(presentesConsultores)}%)`}
            </div>
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
                background: "#e5e5e5",
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
              <thead>
                <tr>
                  <th>Consultor</th>
                  <th>Inscritos</th>
                  <th>Presentes</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {[...porConsultor.entries()]
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([referencia, { total, presentes }]) => (
                    <tr key={referencia}>
                      <td>{referencia}</td>
                      <td>{total}</td>
                      <td>{presentes}</td>
                      <td>{total > 0 ? Math.round((presentes / total) * 100) : 0}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <TabelaInscricoes inscricoes={leadsInscricoes} mostrarConvidadoPor />

        {consultoresInscricoes.length > 0 && (
          <>
            <h2 style={{ color: "#3a2f77", fontSize: "1.1rem", margin: "2rem 0 0.75rem" }}>
              Consultores inscritos
            </h2>
            <p className="ad-legenda" style={{ marginBottom: "0.75rem" }}>
              Consultores que se inscreveram a si próprios nesta sessão — não são leads, ficam à
              parte das estatísticas de cima e não contam para nenhum consultor na tabela "Por
              consultor".
            </p>
            <TabelaInscricoes inscricoes={consultoresInscricoes} mostrarConvidadoPor={false} />
          </>
        )}

        <p className="ad-legenda" style={{ marginTop: "1.5rem" }}>
          O link pessoal de entrada nunca é mostrado aqui — é uma credencial, não um dado de
          gestão (secção 6 do guia).
        </p>
      </div>
    </main>
  );
}
