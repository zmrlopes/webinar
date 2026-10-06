import Link from "next/link";
import { listarQuestionariosAdmin, type ResumoQuestionario } from "@/lib/questionarios";
import { BotoesQuestionario } from "./botoes";

export const dynamic = "force-dynamic";

function baralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function Barra({ rotulo, n, total }: { rotulo: string; n: number; total: number }): React.JSX.Element {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="aq-linha">
      <span className="aq-rotulo">{rotulo}</span>
      <span className="aq-barra-fundo">
        <span className="aq-barra" style={{ width: `${pct}%` }} />
      </span>
      <span className="aq-n">
        {n} <span className="aq-mudo">({pct}%)</span>
      </span>
    </div>
  );
}

function Resultados({ r }: { r: ResumoQuestionario }): React.JSX.Element {
  const total = r.respostas.length;
  if (total === 0) return <p className="aq-mudo">Ainda ninguém respondeu.</p>;
  return (
    <>
      {r.questionario.perguntas.map((p, i) => {
        const valores = r.respostas.map((x) => x[p.id]).filter((v) => v !== undefined && v !== "");
        return (
          <section className="aq-pergunta" key={p.id}>
            <h3>
              <span className="aq-num">{i + 1}.</span> {p.texto}
            </h3>
            {p.tipo === "escala" && (() => {
              const nums = valores.map(Number);
              const media = nums.reduce((s, v) => s + v, 0) / (nums.length || 1);
              return (
                <div className="aq-cartao">
                  <div className="aq-media">
                    {media.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}
                    <span className="aq-mudo"> / {p.max} de média</span>
                  </div>
                  {Array.from({ length: p.max - p.min + 1 }, (_, k) => p.max - k).map((n) => (
                    <Barra key={n} rotulo={String(n)} n={nums.filter((v) => v === n).length} total={nums.length} />
                  ))}
                </div>
              );
            })()}
            {p.tipo === "escolha" && (
              <div className="aq-cartao">
                {p.opcoes.map((o) => (
                  <Barra key={o} rotulo={o} n={valores.filter((v) => v === o).length} total={valores.length} />
                ))}
              </div>
            )}
            {p.tipo === "texto" && (
              <div className="aq-textos">
                {baralhar(valores.map(String)).map((t, k) => (
                  <blockquote key={k}>{t}</blockquote>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

/**
 * Questionários anónimos à equipa: estado, botões e respostas. As respostas
 * de texto aparecem por pergunta e baralhadas de cada vez que a página abre,
 * para não dar para juntar as respostas da mesma pessoa pela ordem.
 */
export default async function QuestionariosPagina(): Promise<React.JSX.Element> {
  const lista = await listarQuestionariosAdmin().catch(() => null);

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina { max-width: none; background: #ffffff; color: #000000; margin: 0; padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem; min-height: calc(100vh - 4rem); }
        .ad-caixa { max-width: 900px; margin: 0 auto; }
        .ad-pagina h1 { font-size: 1.6rem; margin: 0.75rem 0 0.3rem; }
        .ad-pagina h2 { font-size: 1.25rem; margin: 0 0 0.35rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .aq-mudo { color: #6b6a63; font-size: 0.85rem; font-weight: 400; }
        .aq-sub { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; line-height: 1.5; }
        .aq-quest { border: 1px solid rgba(75,83,32,0.22); border-radius: 14px; padding: 1.25rem 1.4rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(11,11,11,0.06); }
        .aq-topo { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
        .aq-estado { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.6rem; border-radius: 999px; margin-left: 0.5rem; vertical-align: 2px; }
        .aq-estado.aberto { background: #e6f1dc; color: #2f6b12; }
        .aq-estado.fechado { background: #eeeeee; color: #6b6a63; }
        .aq-contagem { font-size: 2rem; font-weight: 800; line-height: 1; text-align: right; }
        .aq-botoes { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin: 1rem 0 0.5rem; }
        .aq-botoes button { background: linear-gradient(135deg, #5d6b2a, #4b5320); color: #fff; border: none; border-radius: 8px; padding: 0.55rem 1rem; font-weight: 700; font-size: 0.88rem; cursor: pointer; }
        .aq-botoes button.aq-secundario { background: #f3f4ec; color: #2f3416; border: 1px solid rgba(75,83,32,0.25); }
        .aq-botoes button:disabled { opacity: 0.55; cursor: default; }
        .aq-pergunta { margin-top: 1.75rem; }
        .aq-pergunta h3 { font-size: 1rem; margin: 0 0 0.7rem; line-height: 1.45; }
        .aq-num { color: #4b5320; }
        .aq-cartao { background: #f7f6f3; border-radius: 12px; padding: 0.9rem 1.1rem; }
        .aq-media { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }
        .aq-linha { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.45rem; }
        .aq-rotulo { flex: 0 0 220px; font-size: 0.88rem; }
        .aq-barra-fundo { flex: 1; height: 10px; border-radius: 5px; background: #e6e4dc; overflow: hidden; }
        .aq-barra { display: block; height: 100%; background: linear-gradient(90deg, #5d6b2a, #4b5320); }
        .aq-n { flex: 0 0 80px; text-align: right; font-weight: 700; font-size: 0.9rem; }
        .aq-textos blockquote { margin: 0 0 0.6rem; background: #f7f6f3; border-left: 3px solid #4b5320; border-radius: 0 10px 10px 0; padding: 0.7rem 0.95rem; font-size: 0.93rem; line-height: 1.55; white-space: pre-wrap; }
        .aq-link { color: #4b5320; font-size: 0.85rem; }
        @media (max-width: 600px) { .aq-rotulo { flex-basis: 110px; } }
      `}</style>
      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>Questionários</h1>
        <p className="aq-sub">
          Questionários anónimos à equipa. As respostas não guardam o email nem a hora — só sabes quantos responderam,
          não quem. As respostas escritas aparecem por pergunta e baralhadas, por isso não dá para juntar as da mesma
          pessoa.
        </p>

        {lista === null && (
          <p className="aq-mudo">
            As tabelas dos questionários ainda não existem na base de dados — corre as migrações em{" "}
            <Link href="/admin/migrar" className="aq-link">
              /admin/migrar
            </Link>
            .
          </p>
        )}

        {lista?.map((r) => (
          <div className="aq-quest" key={r.questionario.slug}>
            <div className="aq-topo">
              <div>
                <h2>
                  {r.questionario.titulo}
                  <span className={`aq-estado ${r.estado.aberto ? "aberto" : "fechado"}`}>
                    {r.estado.aberto ? "Aberto" : "Fechado"}
                  </span>
                </h2>
                <Link href={`/consultor/questionario/${r.questionario.slug}?preview=1`} className="aq-link" target="_blank">
                  Ver como o consultor vê ↗
                </Link>
              </div>
              <div>
                <div className="aq-contagem">{r.respostas.length}</div>
                <div className="aq-mudo">respostas de {r.equipa} consultores</div>
              </div>
            </div>
            <BotoesQuestionario slug={r.questionario.slug} aberto={r.estado.aberto} pushEnviadoEm={r.estado.pushEnviadoEm} />
            <Resultados r={r} />
          </div>
        ))}
      </div>
    </main>
  );
}
