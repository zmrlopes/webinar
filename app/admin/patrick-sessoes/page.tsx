import Link from "next/link";
import { listarSessoes } from "@/lib/sala-zoom";

export const dynamic = "force-dynamic";

function diaLisboa(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(data);
}

export default async function PatrickSessoesPagina() {
  const hoje = diaLisboa(new Date());
  const amanha = diaLisboa(new Date(Date.now() + 24 * 60 * 60 * 1000));

  let sessoes: Awaited<ReturnType<typeof listarSessoes>> = [];
  let erro: string | null = null;
  try {
    sessoes = await listarSessoes();
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const deAmanha = sessoes.filter((s) => diaLisboa(new Date(s.comeca_em)) === amanha);

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
        .ad-caixa { max-width: 700px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .ad-diag { font-size: 0.85rem; border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
        .ad-diag th, .ad-diag td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #e5e4de; }
        .ad-destaque { background: #eef1e4; }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Sessões na sala partilhada do Patrick</h1>
        <p className="ad-subtitulo">
          Chamada em direto ao GET /sessoes do Patrick (não à nossa base de dados) — o que ele tem agendado
          agora mesmo. Hoje: {hoje} · Amanhã: {amanha}.
        </p>

        {erro && (
          <p className="ad-subtitulo" style={{ color: "#c0392b" }}>
            Falha ao chamar a API do Patrick: {erro}
          </p>
        )}

        <h2 style={{ fontSize: "1rem" }}>Amanhã ({amanha})</h2>
        {deAmanha.length === 0 ? (
          <p className="ad-subtitulo">
            {erro ? "Não foi possível verificar." : "Não há nenhuma sessão do Patrick agendada para amanhã."}
          </p>
        ) : (
          <table className="ad-diag">
            <thead>
              <tr>
                <th>Título</th>
                <th>Começa em</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {deAmanha.map((s) => (
                <tr key={s.id} className="ad-destaque">
                  <td>{s.titulo}</td>
                  <td>{new Date(s.comeca_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                  <td>{s.duracao_minutos} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 style={{ fontSize: "1rem" }}>Todas as sessões que o Patrick devolveu agora ({sessoes.length})</h2>
        {sessoes.length === 0 && !erro ? (
          <p className="ad-subtitulo">Nenhuma.</p>
        ) : (
          <table className="ad-diag">
            <thead>
              <tr>
                <th>Título</th>
                <th>Começa em</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {sessoes
                .slice()
                .sort((a, b) => a.comeca_em.localeCompare(b.comeca_em))
                .map((s) => (
                  <tr key={s.id} className={diaLisboa(new Date(s.comeca_em)) === amanha ? "ad-destaque" : undefined}>
                    <td>{s.titulo}</td>
                    <td>{new Date(s.comeca_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                    <td>{s.duracao_minutos} min</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
