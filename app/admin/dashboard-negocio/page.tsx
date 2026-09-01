import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * O menu lateral já abre o link diretamente numa aba nova (ver
 * app/admin/layout.tsx) — os links do claude.ai (Cowork incluído) recusam-se
 * a ser mostrados dentro de um iframe (frame-ancestors 'self', confirmado a
 * testar), por isso não há uma versão embutida possível. Esta página só
 * existe para quem chegar aqui por outra via (link direto, favorito antigo):
 * redireciona logo para o dashboard se já estiver configurado, ou explica
 * como configurar se ainda não estiver.
 */
export default function DashboardNegocio() {
  const url = process.env.NEXT_PUBLIC_DASHBOARD_NEGOCIO_URL;
  if (url) redirect(url);

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
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 1.25rem; }
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
        <h1>Dashboard Negócio</h1>
        <div className="ad-vazio">
          <p style={{ marginTop: 0 }}>Ainda não está nenhum dashboard ligado aqui.</p>
          <p style={{ marginBottom: 0 }}>
            Assim que publicares o dashboard no Cowork, define a variável de ambiente{" "}
            <code>NEXT_PUBLIC_DASHBOARD_NEGOCIO_URL</code> nas definições do projeto na Vercel,
            com o link completo do dashboard publicado. Não é preciso mexer em código — o menu
            lateral passa a abri-lo diretamente numa aba nova.
          </p>
        </div>
      </div>
    </main>
  );
}
