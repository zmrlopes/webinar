import { db } from "./db";
import { gravarConhecimento } from "./formacoes-conhecimento";
import { TEMAS_CONHECIMENTO } from "./formacoes-temas";
import { chamarClaude } from "./objecoes";

/** Transcrições muito longas (sessões de 1h+) são cortadas antes de ir ao modelo. */
const MAX_CARACTERES_TRANSCRICAO = 120_000;

/** Aulas com transcrição e ainda sem conhecimento destilado. */
export async function aulasPorResumir(limite: number): Promise<string[]> {
  const { rows } = await db().query<{ id: string }>(
    `select id from formacoes_conhecimento
      where transcricao is not null and transcricao <> '' and (resumo is null or resumo = '')
      order by atualizado_em
      limit $1`,
    [limite],
  );
  return rows.map((r) => r.id);
}

/**
 * Tira o conhecimento de uma aula a partir da transcrição: o que é ensinado,
 * o método, as frases-modelo, as respostas a objeções e as referências
 * citadas — e arruma-a nos temas da base. Grava o resultado.
 */
export async function resumirAula(id: string): Promise<{ id: string; temas: string[] }> {
  const { rows } = await db().query<{ curso: string; modulo: string | null; titulo: string; formador: string | null; transcricao: string }>(
    `select curso, modulo, titulo, formador, transcricao from formacoes_conhecimento where id = $1`,
    [id],
  );
  const aula = rows[0];
  if (!aula?.transcricao) throw new Error(`sem transcrição: ${id}`);

  const texto = await chamarClaude(
    `Estás a construir a base de conhecimento de uma equipa de consultores de viagens da iCliGo (network ` +
      `marketing: vendem viagens e constroem equipa). Recebes a transcrição (automática, com erros) de uma aula ` +
      `de formação. Extrai o conhecimento útil, fiel ao que é ensinado — não acrescentes nada que não esteja lá.\n\n` +
      `Escreve em português de Portugal, em markdown simples, com as secções que se aplicarem (omite as vazias):\n` +
      `**Ideia central** — 1 a 3 frases.\n` +
      `**O que ensina** — os pontos, passos ou método, em tópicos curtos.\n` +
      `**Frases e guiões** — frases concretas ensinadas para dizer (convites, perguntas, respostas), quase literais.\n` +
      `**Objeções** — cada objeção tratada e como se responde, se houver.\n` +
      `**Referências** — autores, livros, líderes ou empresas de referência citados (ex.: Eric Worre), só se forem mencionados.\n\n` +
      `Sê denso e prático: no máximo ~350 palavras (até ~700 se a aula for longa e rica).\n\n` +
      `Escolhe também 1 a 5 temas desta lista (ids):\n` +
      TEMAS_CONHECIMENTO.map((t) => `${t.id}: ${t.nome}`).join("\n") +
      `\n\nResponde SÓ com JSON: {"resumo": "<markdown>", "temas": ["id", ...]}`,
    `Curso: ${aula.curso}\nMódulo: ${aula.modulo ?? "-"}\nAula: ${aula.titulo}${aula.formador ? `\nFormador: ${aula.formador}` : ""}\n\n` +
      `Transcrição:\n${aula.transcricao.slice(0, MAX_CARACTERES_TRANSCRICAO)}`,
    2500,
    55_000,
  );

  const json = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
  const dados = JSON.parse(json) as { resumo?: unknown; temas?: unknown };
  if (typeof dados.resumo !== "string" || dados.resumo.trim() === "") throw new Error(`resposta sem resumo: ${id}`);
  const temas = Array.isArray(dados.temas) ? dados.temas.filter((t): t is string => typeof t === "string") : [];
  await gravarConhecimento({ id, resumo: dados.resumo.trim(), temas });
  return { id, temas };
}
