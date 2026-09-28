import Link from "next/link";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { contarPorAvisarFormacoes, resumoAvisosFormacoes } from "@/lib/formacoes-aviso";
import { formacoesGravadasPublicadas } from "@/lib/formacoes-gravadas";
import { BotoesAvisoFormacoes } from "./botoes";

export const dynamic = "force-dynamic";

export default async function FormacoesAvisoPagina() {
  // Sem a migração 042 a tabela avisos_formacoes não existe — em vez de
  // rebentar a página, diz o que falta fazer.
  const dados = await Promise.all([contarPorAvisarFormacoes(), resumoAvisosFormacoes()]).catch(
    (erro: unknown) => {
      console.error("falha ao ler os avisos das formações:", erro);
      return null;
    },
  );

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
        .ad-caixa { max-width: 1100px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Aviso — Formações gravadas</h1>

        {dados === null ? (
          <p className="ad-subtitulo">
            Falta criar a tabela dos avisos: aplica as migrações pendentes em{" "}
            <Link href="/admin/migrar">/admin/migrar</Link> e volta a esta página.
          </p>
        ) : (
          <>
            <p className="ad-subtitulo">
              Email + notificação da app a dizer que já há uma secção com as formações gravadas no painel do
              consultor. Vai aos consultores com painel ativo · {dados[1].sucesso} já avisado(s)
              {dados[1].falhas > 0 && ` · ${dados[1].falhas} falha(s)`} · {dados[0]} por avisar.
            </p>
            <BotoesAvisoFormacoes
              porAvisar={dados[0]}
              publicado={formacoesGravadasPublicadas()}
              emailDemonstracao={EMAIL_PAINEL_DEMONSTRACAO}
            />
          </>
        )}
      </div>
    </main>
  );
}
