import Link from "next/link";
import { FormacaoForm } from "./formacao-form";

export default function NovaFormacaoPagina() {
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
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin/sessoes" className="ad-voltar">
          ← Sessões
        </Link>
        <h1>Criar formação</h1>
        <p className="ad-subtitulo">
          Sessão na tua conta Zoom — não a sala partilhada do Patrick.
        </p>
        <FormacaoForm />
      </div>
    </main>
  );
}
