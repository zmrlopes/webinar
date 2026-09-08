import Link from "next/link";
import { FormularioInscricaoManual } from "./formulario";

export default function NovaInscricaoManualPagina() {
  return (
    <main className="ei-pagina">
      <style>{`
        .ei-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ei-caixa { max-width: 480px; margin: 0 auto; }
        .ei-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 0.35rem; }
        .ei-voltar-topo { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ei-voltar-topo:hover { text-decoration: underline; }
        .ei-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.75rem; }
        .ei-cartao {
          box-sizing: border-box;
          background: #f7f6f3;
          color: #000000;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .ei-campo { margin-bottom: 1rem; }
        .ei-campo label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #000000;
          margin: 0 0 0.35rem;
        }
        .ei-campo input {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #fff;
          color: #000000;
          font-size: 1rem;
        }
        .ei-erro { color: #c0392b; margin-top: 0.75rem; }
        .ei-sucesso { color: #0ca30c; font-weight: 600; font-size: 1rem; margin: 0; }
        .ei-cartao button {
          display: block;
          width: 100%;
          text-align: center;
          padding: 0.85rem;
          margin-top: 1.5rem;
          font-size: 1.05rem;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .ei-cartao button:disabled { opacity: 0.5; cursor: default; }
        .ei-voltar {
          display: inline-block;
          margin-top: 1.25rem;
          color: #4b5320;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .ei-voltar:hover { text-decoration: underline; }
      `}</style>
      <div className="ei-caixa">
        <Link href="/admin/eventos" className="ei-voltar-topo">
          ← Eventos
        </Link>
        <h1>Inscrição manual — Teambuilding</h1>
        <p className="ei-subtitulo">
          Cria uma inscrição diretamente, mesmo com as inscrições públicas encerradas — a pessoa recebe na
          mesma o email com o QR code do bilhete.
        </p>
        <FormularioInscricaoManual />
      </div>
    </main>
  );
}
