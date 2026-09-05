import Link from "next/link";
import { db } from "@/lib/db";
import { BotaoCorrigir } from "./botao";

export const dynamic = "force-dynamic";

const EMAILS = ["lourencorafaela@gmail.com", "info.oriah@gmail.com"];

interface LinhaDiagnostico {
  email: string;
  webinarId: string;
  webinarTitulo: string;
  criadoEm: Date;
  canceladaEm: Date | null;
  presenca: string;
  ehConsultor: boolean;
}

async function buscarDiagnostico(): Promise<{
  registos: LinhaDiagnostico[];
  estados: { leadEmail: string; estado: string }[];
}> {
  const { rows: registos } = await db().query<{
    email: string;
    webinar_id: string;
    titulo: string;
    criado_em: Date;
    cancelada_em: Date | null;
    presenca: string;
    eh_consultor: boolean;
  }>(
    `select r.email, r.webinar_id, w.titulo, r.criado_em, r.cancelada_em, r.presenca,
            exists(select 1 from links_consultor lcp where lcp.referencia_email = r.email) as eh_consultor
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.email = any($1::text[])
     order by r.criado_em desc`,
    [EMAILS],
  );

  const { rows: estados } = await db().query<{ lead_email: string; estado: string }>(
    `select lead_email, estado from estados_lead where lead_email = any($1::text[])`,
    [EMAILS],
  );

  return {
    registos: registos.map((r) => ({
      email: r.email,
      webinarId: r.webinar_id,
      webinarTitulo: r.titulo,
      criadoEm: r.criado_em,
      canceladaEm: r.cancelada_em,
      presenca: r.presenca,
      ehConsultor: r.eh_consultor,
    })),
    estados: estados.map((e) => ({ leadEmail: e.lead_email, estado: e.estado })),
  };
}

export default async function CorrigirLeadsSofiaPagina() {
  const { registos, estados } = await buscarDiagnostico();

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
        .ad-caixa { max-width: 640px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .ad-diag { font-size: 0.85rem; border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
        .ad-diag th, .ad-diag td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #e5e4de; }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Corrigir leads da Sofia Pinheiro</h1>
        <p className="ad-subtitulo">
          Rafaela Lourenço e Fátima Martins inscreveram-se e assistiram ao primeiro webinar público do dia 23,
          mas desapareceram dos dados. Este botão reativa (ou cria) a inscrição de ambas com presença registada
          e marca o estado como &quot;convertido&quot;.
        </p>

        <h2 style={{ fontSize: "1rem" }}>Estado atual na base de dados</h2>
        {registos.length === 0 ? (
          <p className="ad-subtitulo">Nenhuma inscrição encontrada, em nenhum webinar, para nenhum dos dois emails.</p>
        ) : (
          <table className="ad-diag">
            <thead>
              <tr>
                <th>Email</th>
                <th>Webinar</th>
                <th>Inscrita em</th>
                <th>Cancelada</th>
                <th>Presença</th>
                <th>É consultor?</th>
              </tr>
            </thead>
            <tbody>
              {registos.map((r, i) => (
                <tr key={i}>
                  <td>{r.email}</td>
                  <td>
                    {r.webinarTitulo}
                    <br />
                    <span style={{ color: "#6b6a63", fontSize: "0.75rem" }}>{r.webinarId}</span>
                  </td>
                  <td>{r.criadoEm.toLocaleString("pt-PT")}</td>
                  <td>{r.canceladaEm ? r.canceladaEm.toLocaleString("pt-PT") : "não"}</td>
                  <td>{r.presenca}</td>
                  <td>{r.ehConsultor ? "sim — aparece em «Consultores inscritos»" : "não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="ad-subtitulo">
          Estado da lead:{" "}
          {EMAILS.map((email) => {
            const e = estados.find((x) => x.leadEmail === email);
            return `${email} = ${e?.estado ?? "(sem estado)"}`;
          }).join(" · ")}
        </p>

        <BotaoCorrigir />
      </div>
    </main>
  );
}
