import Link from "next/link";
import {
  listarConhecimentoObjecoes,
  listarPdfsDiretrizesGerais,
  obterDiretrizesGeraisObjecoes,
} from "@/lib/objecoes";
import { BaseFormacoes } from "./base-formacoes";
import { DiretrizesGerais } from "./diretrizes-gerais";
import { GestorConhecimento } from "./gestor-conhecimento";

export const dynamic = "force-dynamic";

export default async function ConhecimentoObjecoesPagina({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; tema?: string }>;
}) {
  const { aba, tema } = await searchParams;
  const abaAtiva = aba === "diretrizes" ? "diretrizes" : "formacoes";
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
        .ad-caixa { max-width: 860px; margin: 0 auto; }
        .ob-abas { display: flex; gap: 0.4rem; border-bottom: 1px solid #dedcd3; margin: 0 0 1.5rem; flex-wrap: wrap; }
        .ob-abas a {
          padding: 0.6rem 1rem; font-size: 0.9rem; color: #6b6a63; text-decoration: none;
          border-bottom: 3px solid transparent; margin-bottom: -1px;
        }
        .ob-abas a.ativo { color: #4b5320; font-weight: 700; border-bottom-color: #4b5320; }
        .bf-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0 0 1.75rem; }
        .bf-stats div { background: #f2f4ea; border: 1px solid #d9dcc8; border-radius: 12px; padding: 0.9rem 1rem; }
        .bf-stats strong { display: block; font-size: 1.6rem; color: #000; }
        .bf-stats span { color: #6b6a63; font-size: 0.8rem; }
        .bf-temas { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1.25rem; }
        .bf-temas a {
          font-size: 0.8rem; padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid #d9dcc8;
          color: #4b5320; text-decoration: none; background: #fff;
        }
        .bf-temas a.ativo { background: #4b5320; color: #fff; border-color: #4b5320; }
        .bf-entrada { background: #f7f6f3; border: 1px solid #ececE6; border-radius: 12px; padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; }
        .bf-entrada summary { cursor: pointer; list-style: none; }
        .bf-entrada summary strong { display: block; font-size: 0.95rem; }
        .bf-entrada summary > span { display: block; color: #6b6a63; font-size: 0.8rem; margin-top: 0.2rem; }
        .bf-chips em {
          display: inline-block; font-style: normal; font-size: 0.7rem; background: #e6e9d8; color: #4b5320;
          border-radius: 999px; padding: 0.1rem 0.5rem; margin: 0.35rem 0.3rem 0 0;
        }
        .bf-resumo { white-space: pre-wrap; font-size: 0.9rem; line-height: 1.5; margin: 0.9rem 0 0.6rem; color: #1a1a1a; }
        .bf-rodape { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .bf-rodape a { color: #4b5320; font-size: 0.85rem; }
        .bf-botao {
          padding: 0.4rem 0.9rem; font-size: 0.8rem; border-radius: 8px; border: 1px solid #4b5320;
          background: #fff; color: #4b5320; cursor: pointer;
        }
        .bf-primario { background: #4b5320; color: #fff; }
        .bf-editar { width: 100%; }
        .bf-editar textarea {
          box-sizing: border-box; width: 100%; font-family: inherit; font-size: 0.9rem; padding: 0.6rem;
          border-radius: 8px; border: 1px solid #000;
        }
        .bf-temas-edit { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.2rem 1rem; font-size: 0.8rem; margin: 0.6rem 0; }
        .bf-tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .bf-tabela th, .bf-tabela td { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #ececE6; }
        .bf-tabela th { color: #6b6a63; font-size: 0.75rem; text-transform: uppercase; }
        .bf-tabela td:not(:first-child), .bf-tabela th:not(:first-child) { text-align: right; width: 5.5rem; }
        .bf-fonte { color: #6b6a63; font-size: 0.7rem; margin-left: 0.3rem; }
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
          O que o assistente de objeções (painel do consultor) usa para
          construir as respostas: o conhecimento tirado das formações, mais as
          tuas diretrizes e temas.
        </p>
        <nav className="ob-abas">
          <Link
            href="?aba=formacoes"
            className={abaAtiva === "formacoes" ? "ativo" : ""}
          >
            Base das formações
          </Link>
          <Link
            href="?aba=diretrizes"
            className={abaAtiva === "diretrizes" ? "ativo" : ""}
          >
            Diretrizes gerais e temas
          </Link>
        </nav>
        {abaAtiva === "formacoes" ? (
          <BaseFormacoes tema={tema ?? null} />
        ) : (
          <>
            <DiretrizesGerais
              inicial={diretrizesGerais}
              pdfs={pdfsDiretrizesGerais}
            />
            <h2 className="ob-secao">Conhecimento por tema</h2>
            <p className="ad-subtitulo">
              Ao contrário das diretrizes gerais acima, isto só entra na
              resposta quando o tema bate certo com a dúvida da lead.
            </p>
            <GestorConhecimento itens={itens} />
          </>
        )}
      </div>
    </main>
  );
}
