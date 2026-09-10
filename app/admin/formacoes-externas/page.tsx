import Link from "next/link";
import { listarFormacoesExternas } from "@/lib/formacoes-externas";
import { GestorFormacoesExternas } from "./gestor-formacoes-externas";

export const dynamic = "force-dynamic";

export default async function FormacoesExternasPagina() {
  const itens = await listarFormacoesExternas();

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 720px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .fe-cartao {
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .fe-campo { margin-bottom: 1.1rem; }
        .fe-campo label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #000000;
          margin: 0 0 0.35rem;
        }
        .fe-campo input {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #fff;
          color: #000000;
          font-size: 1rem;
          font-family: inherit;
        }
        .fe-erro { color: #c0392b; font-size: 0.9rem; margin: 0 0 1rem; }
        .fe-cartao button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }
        .fe-cartao button:disabled { opacity: 0.55; cursor: default; }
        .fe-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .fe-item strong { display: block; font-size: 0.95rem; margin-bottom: 0.3rem; }
        .fe-item p { margin: 0 0 0.3rem; color: #6b6a63; font-size: 0.85rem; }
        .fe-item a { color: #4b5320; font-size: 0.8rem; word-break: break-all; }
        .fe-apagar {
          flex-shrink: 0;
          padding: 0.4rem 0.9rem;
          font-size: 0.8rem;
          background: #ffffff;
          color: #c0392b;
          border: 1px solid #c0392b;
          border-radius: 0.3rem;
          cursor: pointer;
        }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Formações externas (iCliGo)</h1>
        <p className="ad-subtitulo">
          Formações da própria iCliGo (ex: "Be an Expert", "Be a Pro") em português — sem inscrição nem
          email próprios, só um link para fora. Aparecem no painel do consultor, em "Próximas sessões",
          até passar a data. Vais buscar os dados ao calendário do fórum:{" "}
          <a href="https://forum.icligo.com/c/eventos-online" target="_blank" rel="noreferrer">
            forum.icligo.com/c/eventos-online
          </a>
          .
        </p>
        <GestorFormacoesExternas itens={itens} />
      </div>
    </main>
  );
}
