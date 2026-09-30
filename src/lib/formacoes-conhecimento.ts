import { db } from "./db";
import { CATEGORIAS_FORMACOES } from "./formacoes-gravadas";
import { TEMAS_CONHECIMENTO } from "./formacoes-temas";

export { TEMAS_CONHECIMENTO };

/**
 * Base de conhecimento tirada das formações — ver
 * migrations/045_formacoes_conhecimento.sql. O catálogo (que aulas existem)
 * vem do código, das mesmas listas de /consultor/formacoes; o conteúdo
 * (transcrição e conhecimento destilado) vem só da base de dados.
 */

const IDS_TEMAS = new Set(TEMAS_CONHECIMENTO.map((t) => t.id));

export interface AulaCatalogo {
  id: string;
  fonte: "youtube" | "academy";
  categoria: string;
  curso: string;
  modulo: string;
  titulo: string;
  formador: string | null;
  url: string;
}

/** Todas as aulas com conteúdo que se pode ler: vídeos do YouTube e lições da Academy. */
export function catalogoFormacoes(): AulaCatalogo[] {
  const aulas: AulaCatalogo[] = [];
  for (const cat of CATEGORIAS_FORMACOES) {
    for (const curso of [...cat.cursos, ...cat.icligo.cursos]) {
      for (const m of curso.modulos) {
        for (const a of m.aulas) {
          if (!a.youtube) continue;
          aulas.push({
            id: a.youtube,
            fonte: "youtube",
            categoria: cat.titulo,
            curso: curso.titulo,
            modulo: m.titulo,
            titulo: a.titulo,
            formador: a.formador ?? null,
            url: `https://www.youtube.com/watch?v=${a.youtube}`,
          });
        }
      }
    }
    for (const curso of cat.icligo.externos) {
      for (const m of curso.modulos) {
        for (const l of m.licoes) {
          aulas.push({
            id: l.id,
            fonte: "academy",
            categoria: cat.titulo,
            curso: curso.titulo,
            modulo: m.titulo,
            titulo: l.titulo,
            formador: null,
            url: l.url,
          });
        }
      }
    }
  }
  // A mesma aula pode estar listada em dois sítios — fica a primeira.
  const vistos = new Set<string>();
  return aulas.filter((a) =>
    vistos.has(a.id) ? false : (vistos.add(a.id), true),
  );
}

export interface EntradaConhecimento {
  id: string;
  fonte: string;
  categoria: string | null;
  curso: string;
  modulo: string | null;
  titulo: string;
  formador: string | null;
  url: string | null;
  temTranscricao: boolean;
  tamanhoTranscricao: number;
  resumo: string | null;
  temas: string[];
  atualizadoEm: Date;
}

/** Tudo menos a transcrição (grande) — para a página de admin e para escolher o que falta. */
export async function listarConhecimentoFormacoes(): Promise<
  EntradaConhecimento[]
> {
  const { rows } = await db().query<{
    id: string;
    fonte: string;
    categoria: string | null;
    curso: string;
    modulo: string | null;
    titulo: string;
    formador: string | null;
    url: string | null;
    tamanho: number | null;
    resumo: string | null;
    temas: string[];
    atualizado_em: Date;
  }>(
    `select id, fonte, categoria, curso, modulo, titulo, formador, url,
            length(transcricao) as tamanho, resumo, temas, atualizado_em
       from formacoes_conhecimento
      order by curso, modulo, titulo`,
  );
  return rows.map((r) => ({
    id: r.id,
    fonte: r.fonte,
    categoria: r.categoria,
    curso: r.curso,
    modulo: r.modulo,
    titulo: r.titulo,
    formador: r.formador,
    url: r.url,
    temTranscricao: (r.tamanho ?? 0) > 0,
    tamanhoTranscricao: r.tamanho ?? 0,
    resumo: r.resumo,
    temas: r.temas,
    atualizadoEm: r.atualizado_em,
  }));
}

export async function obterTranscricao(id: string): Promise<string | null> {
  const { rows } = await db().query<{ transcricao: string | null }>(
    `select transcricao from formacoes_conhecimento where id = $1`,
    [id],
  );
  return rows[0]?.transcricao ?? null;
}

export interface GravarConhecimento {
  id: string;
  transcricao?: string;
  resumo?: string;
  temas?: string[];
}

/**
 * Grava uma aula. Os dados de catálogo (curso, módulo, título…) vêm sempre do
 * código, pelo id — só se aceitam ids que existem no catálogo. Campos
 * omitidos mantêm o valor que já lá estava, para se poder gravar primeiro a
 * transcrição e depois o resumo.
 */
export async function gravarConhecimento(
  item: GravarConhecimento,
): Promise<void> {
  const aula = catalogoFormacoes().find((a) => a.id === item.id);
  if (!aula) throw new Error(`aula desconhecida: ${item.id}`);
  const temas = item.temas?.filter((t) => IDS_TEMAS.has(t));
  await db().query(
    `insert into formacoes_conhecimento
       (id, fonte, categoria, curso, modulo, titulo, formador, url, transcricao, resumo, temas, atualizado_em)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11, '{}'::text[]), now())
     on conflict (id) do update set
       fonte = excluded.fonte, categoria = excluded.categoria, curso = excluded.curso,
       modulo = excluded.modulo, titulo = excluded.titulo, formador = excluded.formador, url = excluded.url,
       transcricao = coalesce($9, formacoes_conhecimento.transcricao),
       resumo = coalesce($10, formacoes_conhecimento.resumo),
       temas = coalesce($11, formacoes_conhecimento.temas),
       atualizado_em = now()`,
    [
      aula.id,
      aula.fonte,
      aula.categoria,
      aula.curso,
      aula.modulo,
      aula.titulo,
      aula.formador,
      aula.url,
      item.transcricao ?? null,
      item.resumo ?? null,
      temas ?? null,
    ],
  );
}

export async function apagarConhecimento(id: string): Promise<void> {
  await db().query(`delete from formacoes_conhecimento where id = $1`, [id]);
}

/** Tamanho máximo do conhecimento das formações mandado ao modelo numa resposta. */
const MAX_CARACTERES_CONTEXTO = 60_000;

/**
 * O conhecimento destilado das aulas com algum dos `temas`, já formatado para
 * entrar no prompt, cada bloco com a origem (curso › aula) para o modelo
 * poder citar. As aulas com mais temas em comum com o pedido vêm primeiro;
 * corta quando passa do limite.
 */
export async function conhecimentoParaTemas(temas: string[]): Promise<string> {
  if (temas.length === 0) return "";
  const { rows } = await db().query<{
    curso: string;
    titulo: string;
    formador: string | null;
    resumo: string;
    comuns: number;
  }>(
    `select curso, titulo, formador, resumo,
            cardinality(array(select unnest(temas) intersect select unnest($1::text[]))) as comuns
       from formacoes_conhecimento
      where resumo is not null and resumo <> '' and temas && $1::text[]
      order by comuns desc, curso, titulo`,
    [temas],
  );
  const blocos: string[] = [];
  let total = 0;
  for (const r of rows) {
    const bloco = `### ${r.curso} › ${r.titulo}${r.formador ? ` (${r.formador})` : ""}\n${r.resumo.trim()}`;
    if (total + bloco.length > MAX_CARACTERES_CONTEXTO) break;
    blocos.push(bloco);
    total += bloco.length;
  }
  return blocos.join("\n\n");
}
