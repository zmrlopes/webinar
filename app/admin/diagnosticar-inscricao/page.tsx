import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface LinhaInscricao {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  titulo: string;
  webinarId: string;
  presenca: string;
  linkEstado: string;
  linkTentativas: number;
  linkUltimoErro: string | null;
  linkProximaEm: Date | null;
  criadoEm: Date;
  canceladaEm: Date | null;
  emailsEnviados: string[];
}

async function buscar(termo: string): Promise<LinhaInscricao[]> {
  const { rows } = await db().query<{
    id: string;
    nome: string;
    apelido: string;
    email: string;
    titulo: string;
    webinar_id: string;
    presenca: string;
    link_estado: string;
    link_tentativas: number;
    link_ultimo_erro: string | null;
    link_proxima_em: Date | null;
    criado_em: Date;
    cancelada_em: Date | null;
    emails_enviados: string[] | null;
  }>(
    `select r.id, r.nome, r.apelido, r.email, w.titulo, r.webinar_id, r.presenca,
            r.link_estado, r.link_tentativas, r.link_ultimo_erro, r.link_proxima_em,
            r.criado_em, r.cancelada_em,
            array_agg(e.tipo order by e.enviado_em) filter (where e.tipo is not null) as emails_enviados
     from registrations r
     join webinars w on w.id = r.webinar_id
     left join emails e on e.registration_id = r.id
     where r.nome ilike $1 or r.apelido ilike $1 or r.email ilike $1
     group by r.id, w.titulo
     order by r.criado_em desc`,
    [`%${termo}%`],
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    apelido: r.apelido,
    email: r.email,
    titulo: r.titulo,
    webinarId: r.webinar_id,
    presenca: r.presenca,
    linkEstado: r.link_estado,
    linkTentativas: r.link_tentativas,
    linkUltimoErro: r.link_ultimo_erro,
    linkProximaEm: r.link_proxima_em,
    criadoEm: r.criado_em,
    canceladaEm: r.cancelada_em,
    emailsEnviados: r.emails_enviados ?? [],
  }));
}

export default async function DiagnosticarInscricaoPagina({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = (q ?? "").trim();
  const resultados = termo ? await buscar(termo) : [];

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
        .ad-caixa { max-width: 900px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-diag { font-size: 0.85rem; border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
        .ad-diag th, .ad-diag td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #e5e4de; vertical-align: top; }
        input[type="text"] { padding: 0.5rem 0.7rem; font-size: 0.9rem; border: 1px solid #c9c7bd; border-radius: 0.3rem; min-width: 260px; }
        button { padding: 0.5rem 1rem; font-size: 0.9rem; background: #4b5320; color: #fff; border: none; border-radius: 0.3rem; cursor: pointer; }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Diagnosticar inscrição</h1>
        <p className="ad-subtitulo">
          Pesquisa por nome, apelido ou email — mostra todas as inscrições (mesmo canceladas) em todas as
          sessões, o estado do link pessoal e que emails já foram registados como enviados.
        </p>
        <form style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem" }}>
          <input type="text" name="q" defaultValue={termo} placeholder="nome, apelido ou email" />
          <button type="submit">Pesquisar</button>
        </form>

        {termo && resultados.length === 0 && (
          <p className="ad-subtitulo">Nenhuma inscrição encontrada para &quot;{termo}&quot;.</p>
        )}

        {resultados.length > 0 && (
          <table className="ad-diag">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Sessão</th>
                <th>Inscrita em</th>
                <th>Cancelada</th>
                <th>Link pessoal</th>
                <th>Presença</th>
                <th>Emails enviados</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.nome} {r.apelido}
                    <br />
                    <span style={{ color: "#6b6a63", fontSize: "0.75rem" }}>{r.email}</span>
                  </td>
                  <td>
                    {r.titulo}
                    <br />
                    <span style={{ color: "#6b6a63", fontSize: "0.75rem" }}>{r.webinarId}</span>
                  </td>
                  <td>{r.criadoEm.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                  <td>{r.canceladaEm ? r.canceladaEm.toLocaleString("pt-PT") : "não"}</td>
                  <td>
                    {r.linkEstado}
                    {r.linkTentativas > 0 && ` (${r.linkTentativas} tentativa(s))`}
                    {r.linkUltimoErro && (
                      <>
                        <br />
                        <span style={{ color: "#c0392b", fontSize: "0.75rem" }}>{r.linkUltimoErro}</span>
                      </>
                    )}
                    {r.linkProximaEm && r.linkEstado === "pendente" && (
                      <>
                        <br />
                        <span style={{ color: "#6b6a63", fontSize: "0.75rem" }}>
                          próxima tentativa: {r.linkProximaEm.toLocaleString("pt-PT")}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{r.presenca}</td>
                  <td>{r.emailsEnviados.length === 0 ? "nenhum" : r.emailsEnviados.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
