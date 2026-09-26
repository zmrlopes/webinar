"use client";

import { useMemo } from "react";
import type {
  Aula,
  Categoria,
  Curso,
  CursoExterno,
  LicaoExterna,
  Modulo,
  ModuloExterno,
} from "@/lib/formacoes-gravadas";

/**
 * Pesquisa das formações gravadas, partilhada pela página inicial das
 * Formações (procura em todas as categorias) e pela página de cada categoria.
 * Procura ao mesmo tempo nas formações internas (Tropa de Elite) e nas da
 * iCliGo (vídeos e lições da iCliGo Academy).
 */

export function semAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function urlDoVideo(youtube: string): string {
  return `https://www.youtube.com/watch?v=${youtube}`;
}

export function LicaoLinha({
  licao,
  contexto,
  seta = "↗",
}: {
  licao: Pick<LicaoExterna, "titulo" | "url">;
  contexto?: string;
  /** ↗ = abre noutro site; ▶ = vídeo do YouTube. */
  seta?: string;
}) {
  return (
    <li>
      <a href={licao.url} target="_blank" rel="noopener noreferrer" className="vqf-licao">
        <span className="vqf-licao-texto">
          <span className="vqf-licao-titulo">{licao.titulo}</span>
          {contexto && <span className="vqf-licao-contexto">{contexto}</span>}
        </span>
        <span className="vqf-licao-seta" aria-hidden="true">
          {seta}
        </span>
      </a>
    </li>
  );
}

interface VideoComOrigem {
  aula: Aula;
  curso: Curso;
  modulo: Modulo;
  categoria: Categoria;
  interna: boolean;
}

interface LicaoComOrigem {
  licao: LicaoExterna;
  curso: CursoExterno;
  /** null quando o resultado é o próprio curso (cursos sem lições listadas). */
  modulo: ModuloExterno | null;
  categoria: Categoria;
}

function juntar(partes: (string | null | undefined | false)[]): string {
  return partes.filter(Boolean).join(" · ");
}

export function ResultadosPesquisa({
  categorias,
  pesquisa,
  vistas,
}: {
  categorias: Categoria[];
  /** O texto tal como foi escrito (a comparação ignora acentos e maiúsculas). */
  pesquisa: string;
  vistas: Set<string>;
}) {
  // Com várias categorias (página inicial), cada resultado diz de qual vem.
  const comCategoria = categorias.length > 1;

  const videos: VideoComOrigem[] = useMemo(
    () =>
      categorias.flatMap((categoria) =>
        [
          ...categoria.cursos.map((curso) => ({ curso, interna: true })),
          ...categoria.icligo.cursos.map((curso) => ({ curso, interna: false })),
        ].flatMap(({ curso, interna }) =>
          curso.modulos.flatMap((modulo) =>
            modulo.aulas
              .filter((a) => a.youtube !== null)
              .map((aula) => ({ aula, curso, modulo, categoria, interna })),
          ),
        ),
      ),
    [categorias],
  );

  const licoes: LicaoComOrigem[] = useMemo(
    () =>
      categorias.flatMap((categoria) =>
        categoria.icligo.externos.flatMap((curso): LicaoComOrigem[] =>
          curso.modulos.length > 0
            ? curso.modulos.flatMap((modulo) =>
                modulo.licoes.map((licao) => ({ licao, curso, modulo, categoria })),
              )
            : [
                {
                  licao: { id: curso.id, titulo: curso.titulo, url: curso.url },
                  curso,
                  modulo: null,
                  categoria,
                },
              ],
        ),
      ),
    [categorias],
  );

  const termo = semAcentos(pesquisa.trim());
  const videosEncontrados = useMemo(
    () =>
      videos.filter(({ aula, curso, modulo }) =>
        semAcentos(`${aula.titulo} ${aula.formador ?? ""} ${curso.titulo} ${modulo.titulo}`).includes(termo),
      ),
    [videos, termo],
  );
  const licoesEncontradas = useMemo(
    () =>
      licoes.filter(({ licao, curso, modulo }) =>
        semAcentos(
          `${licao.titulo} ${licao.palavras ?? ""} ${curso.titulo} ${modulo?.titulo ?? ""}`,
        ).includes(termo),
      ),
    [licoes, termo],
  );

  const internas = videosEncontrados.filter((v) => v.interna);
  const videosIcligo = videosEncontrados.filter((v) => !v.interna);
  const total = videosEncontrados.length + licoesEncontradas.length;

  function linhaVideo({ aula, curso, modulo, categoria }: VideoComOrigem) {
    const contexto = juntar([
      comCategoria && categoria.titulo,
      curso.titulo,
      modulo.titulo,
      aula.formador,
      aula.min !== null && `${aula.min} min`,
      vistas.has(aula.id) && "✓ Vista",
    ]);
    return (
      <LicaoLinha
        key={`${categoria.id}-${aula.id}`}
        licao={{ titulo: aula.titulo, url: urlDoVideo(aula.youtube ?? "") }}
        contexto={contexto}
        seta="▶"
      />
    );
  }

  return (
    <>
      <h2>
        {total === 1 ? "1 resultado" : `${total} resultados`} para “{pesquisa.trim()}”
      </h2>
      {total === 0 && (
        <p className="vqf-mudo">Nada encontrado — experimenta o nome do país ou do continente.</p>
      )}
      {internas.length > 0 && (
        <>
          <h3 className="vqf-subtitulo">Formações internas</h3>
          <ul className="vqf-licoes vqf-licoes-caixa">{internas.map(linhaVideo)}</ul>
        </>
      )}
      {videosIcligo.length + licoesEncontradas.length > 0 && (
        <>
          <h3 className="vqf-subtitulo">iCliGo</h3>
          {licoesEncontradas.length > 0 && (
            <p className="vqf-mudo">As lições da Academy abrem lá, onde entras com a tua conta iCliGo.</p>
          )}
          <ul className="vqf-licoes vqf-licoes-caixa">
            {videosIcligo.map(linhaVideo)}
            {licoesEncontradas.map(({ licao, curso, modulo, categoria }) => (
              <LicaoLinha
                key={`${categoria.id}-${licao.id}`}
                licao={licao}
                contexto={juntar([
                  comCategoria && categoria.titulo,
                  curso.titulo,
                  modulo ? modulo.titulo : "Curso completo",
                ])}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
