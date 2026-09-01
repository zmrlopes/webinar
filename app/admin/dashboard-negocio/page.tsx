export const dynamic = "force-dynamic";

/**
 * Dashboard feito no Claude Cowork, a replicar o Google Sheets do negócio.
 * Só o link muda (variável de ambiente na Vercel) — não precisa de outro
 * deploy para atualizar ou trocar o dashboard. Mostrado embutido (iframe);
 * o link "abrir num separador novo" é a rede de segurança caso o Cowork
 * não permita ser mostrado dentro de outro site (frame-ancestors).
 */
export default function DashboardNegocio() {
  const url = process.env.DASHBOARD_NEGOCIO_URL;

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
          display: flex;
          flex-direction: column;
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; display: flex; flex-direction: column; }
        .ad-topo { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0; }
        .ad-abrir { color: #4b5320; font-size: 0.85rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
        .ad-abrir:hover { text-decoration: underline; }
        .ad-moldura {
          flex: 1;
          min-height: 70vh;
          border: 1px solid #ececE6;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px rgba(0, 0, 0, 0.04);
        }
        .ad-moldura iframe { width: 100%; height: 100%; min-height: 70vh; border: none; display: block; }
        .ad-vazio {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 16px;
          padding: 1.5rem;
          color: #6b6a63;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .ad-vazio code {
          background: #eef1e4;
          color: #4b5320;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
      `}</style>

      <div className="ad-caixa">
        <div className="ad-topo">
          <h1>Dashboard Negócio</h1>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="ad-abrir">
              Abrir num separador novo →
            </a>
          )}
        </div>

        {url ? (
          <div className="ad-moldura">
            <iframe src={url} title="Dashboard Negócio" />
          </div>
        ) : (
          <div className="ad-vazio">
            <p style={{ marginTop: 0 }}>
              Ainda não está nenhum dashboard ligado aqui.
            </p>
            <p>
              Assim que publicares o dashboard no Cowork, define a variável de ambiente{" "}
              <code>DASHBOARD_NEGOCIO_URL</code> nas definições do projeto na Vercel, com o link
              completo do dashboard publicado. Não é preciso mexer em código nem fazer outro
              deploy — aparece aqui automaticamente.
            </p>
            <p style={{ marginBottom: 0 }}>
              Se o dashboard não aparecer mesmo depois de definido o link (o Cowork pode bloquear
              ser mostrado dentro de outro site), usa o botão "Abrir num separador novo" no canto
              superior direito.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
