import Link from "next/link";
import { FormularioImportarEquipa } from "./formulario";

export default function ImportarEquipaPagina() {
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
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Atualizar equipa (CSV)</h1>
        <p className="ad-subtitulo">
          Escolhe o CSV exportado da plataforma de afiliados — cada consultor é atualizado pelo email; quem já
          existe fica com os dados novos (nome, upline, nível, estado). Ninguém é apagado por aqui. Podes correr
          isto sempre que a equipa mudar.
        </p>
        <FormularioImportarEquipa />
      </div>
    </main>
  );
}
