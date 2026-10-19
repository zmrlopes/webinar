import Link from "next/link";
import { AtualizarCliente } from "./atualizar-cliente";

export const dynamic = "force-dynamic";

/** Atualizar o Dashboard Negócio a partir do MyOffice, com o botão dos favoritos. */
export default function AtualizarDashboard() {
  return (
    <main className="at-pagina">
      <style>{`
        .at-pagina { background: #ffffff; color: #000000; margin: 0; padding: 2.5rem 1.25rem 4rem; min-height: calc(100vh - 4rem); }
        .at-caixa { max-width: 640px; margin: 0 auto; }
        .at-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .at-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .at-voltar:hover { text-decoration: underline; }
        .at-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .at-titulo { font-size: 1.05rem; margin: 1.5rem 0 0.5rem; }
        .at-passos { margin: 0; padding-left: 1.25rem; color: #333333; font-size: 0.92rem; line-height: 1.9; }
        .at-passos a { color: #4b5320; font-weight: 600; }
        .at-favorito { display: inline-block; margin-left: 0.35rem; padding: 0.3rem 0.85rem; border-radius: 999px; background: #4b5320; color: #ffffff !important; text-decoration: none; cursor: grab; }
        .at-passos kbd { padding: 0 0.35rem; border: 1px solid #cccccc; border-radius: 4px; font-size: 0.8rem; }
        .at-lista { list-style: none; margin: 1rem 0; padding: 0; font-size: 0.9rem; line-height: 1.9; }
        .at-lista li[data-estado="feito"] { color: #4b5320; }
        .at-lista li[data-estado="erro"] { color: #b42318; }
        .at-lista li[data-estado="a-decorrer"] { color: #6b6a63; }
        .at-nota { color: #6b6a63; font-size: 0.85rem; }
        .at-ok { color: #4b5320; font-weight: 700; }
        .at-erro { color: #b42318; font-weight: 600; }
      `}</style>
      <div className="at-caixa">
        <Link href="/admin/dashboard-negocio" className="at-voltar">
          ← Dashboard Negócio
        </Link>
        <h1>Atualizar dashboard</h1>
        <p className="at-subtitulo">Vai buscar os números ao MyOffice e atualiza o dashboard, sem precisares do Claude.</p>
        <AtualizarCliente />
      </div>
    </main>
  );
}
