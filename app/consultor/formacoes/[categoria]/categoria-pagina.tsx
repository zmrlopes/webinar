"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Aula, Categoria, Curso, CursoExterno, Modulo } from "@/lib/formacoes-gravadas";
import { lerEmailGuardado } from "../../armazenamento";
import { ESTILOS_FORMACOES } from "../estilos";

type Estado = "a-carregar" | "sem-conta" | "indisponivel" | "nao-encontrada" | "erro" | "pronto";

/** Cada categoria divide-se nas formações da Tropa de Elite e nas da iCliGo. */
type Subdivisao = "tropa-elite" | "icligo";

const SUBDIVISOES: { id: Subdivisao; titulo: string }[] = [
  { id: "tropa-elite", titulo: "Tropa de Elite" },
  { id: "icligo", titulo: "iCliGo" },
];

const MAIS_RECENTES = 6;

interface AulaComOrigem {
  aula: Aula;
  curso: Curso;
  modulo: Modulo;
}

function semAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function urlDoVideo(youtube: string): string {
  return `https://www.youtube.com/watch?v=${youtube}`;
}

function capaDoVideo(youtube: string): string {
  return `https://i.ytimg.com/vi/${youtube}/mqdefault.jpg`;
}

/** Agrupa os cursos da iCliGo Academy pelo `grupo`, pela ordem em que aparecem. */
function agruparExternos(externos: CursoExterno[]): [string, CursoExterno[]][] {
  const grupos = new Map<string, CursoExterno[]>();
  for (const e of externos) grupos.set(e.grupo, [...(grupos.get(e.grupo) ?? []), e]);
  return [...grupos];
}

function CursoExternoCartao({ curso }: { curso: CursoExterno }) {
  return (
    <div className="vqf-aula">
      <a
        href={curso.url}
        target="_blank"
        rel="noopener noreferrer"
        className="vqf-capa vqf-capa-externa"
        aria-label={`Abrir "${curso.titulo}" na iCliGo Academy`}
      >
        <img src={curso.capa} alt="" loading="lazy" />
      </a>
      <div className="vqf-aula-corpo">
        <p className="vqf-aula-titulo">{curso.titulo}</p>
        <a href={curso.url} target="_blank" rel="noopener noreferrer" className="vqf-marcar vqf-link-externo">
          Abrir na iCliGo Academy ↗
        </a>
      </div>
    </div>
  );
}

function AulaCartao({
  aula,
  vista,
  etiqueta,
  onAlternar,
}: {
  aula: Aula;
  vista: boolean;
  etiqueta?: string;
  onAlternar: (aula: Aula) => void;
}) {
  const corpo = (
    <div className="vqf-aula-corpo">
      {etiqueta && <p className="vqf-aula-etiqueta">{etiqueta}</p>}
      <p className="vqf-aula-titulo">{aula.titulo}</p>
      {aula.formador && <p className="vqf-aula-sub">{aula.formador}</p>}
    </div>
  );

  if (aula.youtube === null) {
    return (
      <div className="vqf-aula">
        <div className="vqf-capa vqf-capa-vazia">Vídeo em breve</div>
        {corpo}
      </div>
    );
  }

  return (
    <div className={vista ? "vqf-aula vqf-aula-vista" : "vqf-aula"}>
      <a
        href={urlDoVideo(aula.youtube)}
        target="_blank"
        rel="noopener noreferrer"
        className="vqf-capa"
        aria-label={`Ver "${aula.titulo}" no YouTube`}
      >
        {/* Capa do vídeo tirada do próprio YouTube — <img> simples, sem otimização do Next. */}
        <img src={capaDoVideo(aula.youtube)} alt="" loading="lazy" />
        <span className="vqf-play" aria-hidden="true">
          ▶
        </span>
        {aula.min !== null && <span className="vqf-min">{aula.min} min</span>}
        {vista && <span className="vqf-badge-vista">✓ Vista</span>}
      </a>
      {corpo}
      <div className="vqf-aula-corpo" style={{ paddingTop: 0, flex: "none" }}>
        <button
          type="button"
          className={vista ? "vqf-marcar vqf-marcar-feito" : "vqf-marcar"}
          onClick={() => onAlternar(aula)}
        >
          {vista ? "✓ Vista" : "Marcar como vista"}
        </button>
      </div>
    </div>
  );
}

export function CategoriaPagina({ categoriaId }: { categoriaId: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [vistas, setVistas] = useState<Set<string>>(new Set());
  const [erroGuardar, setErroGuardar] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [subdivisao, setSubdivisao] = useState<Subdivisao>("tropa-elite");

  const cursos = useMemo(
    () => (categoria ? (subdivisao === "icligo" ? categoria.icligo.cursos : categoria.cursos) : []),
    [categoria, subdivisao],
  );
  const externos = categoria && subdivisao === "icligo" ? categoria.icligo.externos : [];

  useEffect(() => {
    const guardado = lerEmailGuardado();
    if (!guardado) {
      setEstado("sem-conta");
      return;
    }
    setEmail(guardado);
    async function carregar(emailConsultor: string): Promise<void> {
      try {
        const resposta = await fetch("/api/consultor/formacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailConsultor, categoria: categoriaId }),
        });
        const corpo = await resposta.json().catch(() => ({}));
        if (resposta.status === 403) {
          setEstado("indisponivel");
          return;
        }
        if (resposta.status === 404 && corpo.erro === "categoria não encontrada") {
          setEstado("nao-encontrada");
          return;
        }
        if (!resposta.ok) {
          setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível carregar");
          setEstado("erro");
          return;
        }
        setCategoria(corpo.categoria as Categoria);
        setVistas(new Set(Array.isArray(corpo.vistas) ? (corpo.vistas as string[]) : []));
        setEstado("pronto");
      } catch {
        setErro("falha de ligação — tenta outra vez");
        setEstado("erro");
      }
    }
    void carregar(guardado);
  }, [categoriaId]);

  const todas: AulaComOrigem[] = useMemo(
    () =>
      cursos.flatMap((curso) =>
        curso.modulos.flatMap((modulo) => modulo.aulas.map((aula) => ({ aula, curso, modulo }))),
      ),
    [cursos],
  );
  const comVideo = useMemo(() => todas.filter((t) => t.aula.youtube !== null), [todas]);

  const maisRecentes = useMemo(
    () => [...comVideo].sort((a, b) => b.aula.data.localeCompare(a.aula.data)).slice(0, MAIS_RECENTES),
    [comVideo],
  );

  const primeiroCursoComVideo = useMemo(
    () => cursos.find((curso) => curso.modulos.some((m) => m.aulas.some((a) => a.youtube !== null))),
    [cursos],
  );

  const termo = semAcentos(pesquisa.trim());
  const resultados = useMemo(() => {
    if (!termo) return [];
    return comVideo.filter(({ aula, curso, modulo }) =>
      semAcentos(`${aula.titulo} ${aula.formador ?? ""} ${curso.titulo} ${modulo.titulo}`).includes(termo),
    );
  }, [comVideo, termo]);

  async function alternarVista(aula: Aula): Promise<void> {
    if (!email) return;
    const ficaVista = !vistas.has(aula.id);
    function aplicar(vista: boolean): void {
      setVistas((atual) => {
        const seguinte = new Set(atual);
        if (vista) seguinte.add(aula.id);
        else seguinte.delete(aula.id);
        return seguinte;
      });
    }
    aplicar(ficaVista);
    setErroGuardar("");
    try {
      const resposta = await fetch("/api/consultor/formacoes/vista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, aulaId: aula.id, vista: ficaVista }),
      });
      if (!resposta.ok) throw new Error("falhou");
    } catch {
      aplicar(!ficaVista);
      setErroGuardar("Não foi possível guardar a marcação — tenta outra vez.");
    }
  }

  const totalVistas = comVideo.filter((t) => vistas.has(t.aula.id)).length;
  const percentagem = comVideo.length > 0 ? Math.round((totalVistas / comVideo.length) * 100) : 0;

  return (
    <div className="vqf-pagina">
      <style>{ESTILOS_FORMACOES}</style>
      <div className="vqf-caixa">
        <Link href="/consultor/formacoes" className="vqf-voltar">
          ← Formações
        </Link>

        {estado === "a-carregar" && <p className="vqf-mudo">A carregar…</p>}

        {estado === "sem-conta" && (
          <p className="vqf-mudo">
            Primeiro identifica-te no <Link href="/consultor">painel do consultor</Link>.
          </p>
        )}

        {estado === "indisponivel" && (
          <p className="vqf-mudo">As formações gravadas ainda não estão disponíveis.</p>
        )}

        {estado === "nao-encontrada" && (
          <p className="vqf-mudo">
            Esta categoria não existe ou ainda não está disponível.{" "}
            <Link href="/consultor/formacoes">Ver todas as formações</Link>.
          </p>
        )}

        {estado === "erro" && <p className="vqf-erro">{erro}</p>}

        {estado === "pronto" && categoria && (
          <>
            <h1>{categoria.titulo}</h1>
            <p className="vqf-mudo" style={{ marginBottom: 0 }}>
              {categoria.descricao}
            </p>

            <div className="vqf-separadores" role="tablist" aria-label="Origem das formações">
              {SUBDIVISOES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={subdivisao === s.id}
                  className={subdivisao === s.id ? "vqf-separador vqf-separador-ativo" : "vqf-separador"}
                  onClick={() => {
                    setSubdivisao(s.id);
                    setPesquisa("");
                  }}
                >
                  {s.titulo}
                </button>
              ))}
            </div>

            {comVideo.length > 0 && (
              <>
                <div className="vqf-topo-progresso">
                  <div
                    className="vqf-barra"
                    role="progressbar"
                    aria-valuenow={percentagem}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progresso nas formações"
                  >
                    <div className="vqf-barra-cheia" style={{ width: `${percentagem}%` }} />
                  </div>
                  <p className="vqf-progresso-texto">
                    {totalVistas} de {comVideo.length} aulas vistas ({percentagem}%)
                  </p>
                </div>

                <input
                  type="search"
                  className="vqf-pesquisa"
                  placeholder="Pesquisar aulas por título, formador ou curso…"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  aria-label="Pesquisar aulas"
                />
              </>
            )}

            {erroGuardar && <p className="vqf-erro">{erroGuardar}</p>}

            {termo ? (
              <>
                <h2>
                  {resultados.length === 1 ? "1 aula encontrada" : `${resultados.length} aulas encontradas`}
                </h2>
                {resultados.length === 0 ? (
                  <p className="vqf-mudo">Nenhuma aula corresponde a “{pesquisa.trim()}”.</p>
                ) : (
                  <div className="vqf-aulas">
                    {resultados.map(({ aula, curso }) => (
                      <AulaCartao
                        key={aula.id}
                        aula={aula}
                        vista={vistas.has(aula.id)}
                        etiqueta={curso.titulo}
                        onAlternar={alternarVista}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {maisRecentes.length > 0 && subdivisao === "tropa-elite" && (
                  <>
                    <h2>Mais recentes</h2>
                    <div className="vqf-aulas">
                      {maisRecentes.map(({ aula, curso }) => (
                        <AulaCartao
                          key={aula.id}
                          aula={aula}
                          vista={vistas.has(aula.id)}
                          etiqueta={curso.titulo}
                          onAlternar={alternarVista}
                        />
                      ))}
                    </div>
                  </>
                )}

                {cursos.length > 0 &&
                  (subdivisao === "tropa-elite" ? (
                    <>
                      <h2>Ordem recomendada</h2>
                      <p className="vqf-mudo" style={{ marginBottom: 0 }}>
                        Começa pelo curso 1 e avança pela ordem — cada um prepara o seguinte.
                      </p>
                    </>
                  ) : (
                    <h2>Sessões gravadas</h2>
                  ))}
                {cursos.map((curso, indice) => {
                  const aulasCurso = curso.modulos.flatMap((m) => m.aulas).filter((a) => a.youtube !== null);
                  const vistasCurso = aulasCurso.filter((a) => vistas.has(a.id)).length;
                  const pct = aulasCurso.length > 0 ? Math.round((vistasCurso / aulasCurso.length) * 100) : 0;
                  // Abre por defeito o primeiro curso que já tem vídeos para ver.
                  const abreAoEntrar = curso.id === primeiroCursoComVideo?.id;
                  return (
                    <details className="vqf-curso" key={curso.id} open={abreAoEntrar}>
                      <summary>
                        <span className="vqf-curso-numero">{indice + 1}</span>
                        <div className="vqf-curso-texto">
                          <p className="vqf-curso-titulo">{curso.titulo}</p>
                          <p className="vqf-curso-descricao">{curso.descricao}</p>
                          <div className="vqf-barra">
                            <div className="vqf-barra-cheia" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="vqf-progresso-texto">
                            {aulasCurso.length === 0
                              ? "Vídeos em preparação"
                              : `${vistasCurso} de ${aulasCurso.length} aulas vistas${
                                  aulasCurso.length < curso.modulos.reduce((t, m) => t + m.aulas.length, 0)
                                    ? " · algumas aulas ainda sem vídeo"
                                    : ""
                                }`}
                          </p>
                        </div>
                        <span className="vqf-curso-seta" aria-hidden="true">
                          ▶
                        </span>
                      </summary>
                      <div className="vqf-curso-corpo">
                        {curso.modulos.map((modulo) => {
                          const aulasModulo = modulo.aulas.filter((a) => a.youtube !== null);
                          const vistasModulo = aulasModulo.filter((a) => vistas.has(a.id)).length;
                          // Um só módulo: abre logo. Vários (ex.: um por continente): fecham
                          // todos, para abrires só o que queres ver.
                          const abreModulo = curso.modulos.length === 1;
                          return (
                            <details className="vqf-modulo" key={modulo.titulo} open={abreModulo}>
                              <summary className="vqf-modulo-summary">
                                <span className="vqf-modulo-titulo">{modulo.titulo}</span>
                                <span className="vqf-modulo-meta">
                                  {aulasModulo.length === 0
                                    ? "sem vídeo"
                                    : `${vistasModulo}/${aulasModulo.length} vistas`}
                                </span>
                                <span className="vqf-modulo-seta" aria-hidden="true">
                                  ▶
                                </span>
                              </summary>
                              <div className="vqf-aulas">
                                {modulo.aulas.map((aula) => (
                                  <AulaCartao
                                    key={aula.id}
                                    aula={aula}
                                    vista={vistas.has(aula.id)}
                                    onAlternar={alternarVista}
                                  />
                                ))}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}

                {agruparExternos(externos).map(([grupo, lista]) => (
                  <section key={grupo}>
                    <h2>{grupo}</h2>
                    <p className="vqf-mudo">
                      Cursos na iCliGo Academy — abrem lá, onde entras com a tua conta iCliGo.
                    </p>
                    <div className="vqf-aulas">
                      {lista.map((curso) => (
                        <CursoExternoCartao key={curso.id} curso={curso} />
                      ))}
                    </div>
                  </section>
                ))}

                {cursos.length === 0 && externos.length === 0 && (
                  <p className="vqf-mudo" style={{ marginTop: "1.5rem" }}>
                    Ainda não há formações aqui.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
