import Link from "next/link";
import {
  catalogoFormacoes,
  listarConhecimentoFormacoes,
  TEMAS_CONHECIMENTO,
} from "@/lib/formacoes-conhecimento";
import { EditarEntrada } from "./editar-entrada";

const NOME_TEMA = new Map(TEMAS_CONHECIMENTO.map((t) => [t.id, t.nome]));

/**
 * Separador "Base das formações": o que já foi tirado de cada aula (conhecimento
 * destilado + temas), com a cobertura por curso. O conteúdo vem só da base de
 * dados — o catálogo de aulas é o mesmo de /consultor/formacoes.
 */
export async function BaseFormacoes({ tema }: { tema: string | null }) {
  const [entradas, catalogo] = await Promise.all([
    listarConhecimentoFormacoes(),
    Promise.resolve(catalogoFormacoes()),
  ]);
  const comResumo = entradas.filter((e) => e.resumo);
  const comTranscricao = entradas.filter((e) => e.temTranscricao);

  const contagemTemas = new Map<string, number>();
  for (const e of comResumo)
    for (const t of e.temas)
      contagemTemas.set(t, (contagemTemas.get(t) ?? 0) + 1);

  const porId = new Map(entradas.map((e) => [e.id, e]));
  const cursos = new Map<
    string,
    { fonte: string; total: number; transcritas: number; resumidas: number }
  >();
  for (const a of catalogo) {
    const c = cursos.get(a.curso) ?? {
      fonte: a.fonte,
      total: 0,
      transcritas: 0,
      resumidas: 0,
    };
    c.total += 1;
    const e = porId.get(a.id);
    if (e?.temTranscricao) c.transcritas += 1;
    if (e?.resumo) c.resumidas += 1;
    cursos.set(a.curso, c);
  }

  const visiveis = tema
    ? comResumo.filter((e) => e.temas.includes(tema))
    : comResumo;

  return (
    <>
      <p className="ad-subtitulo">
        Tudo o que se tira das formações (Tropa de Elite, iCliGo Academy e os
        cursos do Eric Worre): as ideias, o método e as frases ensinadas em cada
        aula, arrumadas por tema. O assistente de objeções escolhe os temas que
        batem com a dúvida da lead e responde com base nisto, indicando a
        formação de onde vem.
      </p>

      <div className="bf-stats">
        <div>
          <strong>{catalogo.length}</strong>
          <span>aulas nas formações</span>
        </div>
        <div>
          <strong>{comTranscricao.length}</strong>
          <span>já transcritas</span>
        </div>
        <div>
          <strong>{comResumo.length}</strong>
          <span>com conhecimento na base</span>
        </div>
      </div>

      <h2 className="ob-secao">Por tema</h2>
      <div className="bf-temas">
        <Link href="?aba=formacoes" className={tema ? "" : "ativo"}>
          Todos ({comResumo.length})
        </Link>
        {TEMAS_CONHECIMENTO.map((t) => (
          <Link
            key={t.id}
            href={`?aba=formacoes&tema=${t.id}`}
            className={tema === t.id ? "ativo" : ""}
          >
            {t.nome} ({contagemTemas.get(t.id) ?? 0})
          </Link>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="ad-subtitulo">
          Ainda não há conhecimento guardado{tema ? " neste tema" : ""}.
        </p>
      ) : (
        visiveis.map((e) => (
          <details key={e.id} className="bf-entrada">
            <summary>
              <strong>{e.titulo}</strong>
              <span>
                {e.curso}
                {e.modulo ? ` › ${e.modulo}` : ""}
                {e.formador ? ` · ${e.formador}` : ""}
              </span>
              <span className="bf-chips">
                {e.temas.map((t) => (
                  <em key={t}>{NOME_TEMA.get(t) ?? t}</em>
                ))}
              </span>
            </summary>
            <div className="bf-resumo">{e.resumo}</div>
            <div className="bf-rodape">
              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer">
                  Abrir a aula ↗
                </a>
              )}
              <EditarEntrada
                id={e.id}
                resumo={e.resumo ?? ""}
                temas={e.temas}
              />
            </div>
          </details>
        ))
      )}

      <h2 className="ob-secao" style={{ marginTop: "2rem" }}>
        Cobertura por curso
      </h2>
      <table className="bf-tabela">
        <thead>
          <tr>
            <th>Curso</th>
            <th>Aulas</th>
            <th>Transcritas</th>
            <th>Na base</th>
          </tr>
        </thead>
        <tbody>
          {[...cursos.entries()].map(([nome, c]) => (
            <tr key={nome}>
              <td>
                {nome}{" "}
                <span className="bf-fonte">
                  {c.fonte === "academy" ? "Academy" : "YouTube"}
                </span>
              </td>
              <td>{c.total}</td>
              <td>{c.transcritas}</td>
              <td>{c.resumidas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
