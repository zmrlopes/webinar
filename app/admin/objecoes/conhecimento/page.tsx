import Link from "next/link";
import {
  listarConhecimentoObjecoes,
  listarPdfsDiretrizesGerais,
  obterDiretrizesGeraisObjecoes,
} from "@/lib/objecoes";
import { DiretrizesGerais } from "./diretrizes-gerais";
import { GestorConhecimento } from "./gestor-conhecimento";

export const dynamic = "force-dynamic";

export default async function ConhecimentoObjecoesPagina() {
  const [itens, diretrizesGerais, pdfsDiretrizesGerais] = await Promise.all([
    listarConhecimentoObjecoes(),
    obterDiretrizesGeraisObjecoes(),
    listarPdfsDiretrizesGerais(),
  ]);

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
        .ob-cartao {
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .ob-cartao-diretrizes {
          margin-bottom: 2rem;
          border-color: #4b5320;
          background: #f2f4ea;
        }
        .ob-secao { color: #000000; font-size: 1.05rem; margin: 0 0 0.4rem; }
        .ob-campo { margin-bottom: 1.1rem; }
        .ob-campo label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #000000;
          margin: 0 0 0.35rem;
        }
        .ob-campo input,
        .ob-campo textarea {
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
        .ob-campo textarea { min-height: 7rem; resize: vertical; }
        .ob-campo textarea:disabled, .ob-campo input:disabled { opacity: 0.5; }
        .ob-ou { text-align: center; color: #6b6a63; font-size: 0.8rem; margin: -0.4rem 0 1.1rem; }
        .ob-pdf-escolhido { color: #4b5320; font-size: 0.85rem; margin: 0.4rem 0 0; }
        .ob-pdf-link {
          display: inline-block;
          margin-top: 0.5rem;
          color: #4b5320;
          font-size: 0.85rem;
          text-decoration: none;
        }
        .ob-pdf-link:hover { text-decoration: underline; }
        .ob-pdfs-lista {
          list-style: none;
          margin: 1rem 0 0;
          padding: 0;
        }
        .ob-pdfs-lista li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.5rem 0;
          border-top: 1px solid #dedcd3;
        }
        .ob-pdfs-lista .ob-pdf-link { margin: 0; }
        .ob-erro { color: #c0392b; font-size: 0.9rem; margin: 0 0 1rem; }
        .ob-resultado { color: #4b5320; font-size: 0.9rem; margin: 0 0 1rem; }
        .ob-cartao button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ob-cartao button:disabled { opacity: 0.55; cursor: default; }
        .ob-item {
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
        .ob-item strong { display: block; font-size: 0.95rem; margin-bottom: 0.4rem; }
        .ob-item p { margin: 0; color: #6b6a63; font-size: 0.9rem; white-space: pre-wrap; }
        .ob-apagar {
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
        <h1>Conhecimento do assistente de objeções</h1>
        <p className="ad-subtitulo">
          Diretrizes, exemplos e referências que o assistente de objeções (painel do consultor) usa para
          construir as respostas. Adiciona quantas entradas quiseres — todas são consultadas de cada vez.
        </p>
        <DiretrizesGerais inicial={diretrizesGerais} pdfs={pdfsDiretrizesGerais} />
        <h2 className="ob-secao">Conhecimento por tema</h2>
        <p className="ad-subtitulo">
          Ao contrário das diretrizes gerais acima, isto só entra na resposta quando o tema bate certo
          com a dúvida da lead.
        </p>
        <GestorConhecimento itens={itens} />
      </div>
    </main>
  );
}
