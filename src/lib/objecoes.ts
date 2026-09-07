import { db } from "./db";

export interface ConhecimentoObjecao {
  id: string;
  titulo: string;
  conteudo: string;
  criadoEm: Date;
}

export async function listarConhecimentoObjecoes(): Promise<ConhecimentoObjecao[]> {
  const { rows } = await db().query<{
    id: string;
    titulo: string;
    conteudo: string;
    criado_em: Date;
  }>(`select id, titulo, conteudo, criado_em from conhecimento_objecoes order by criado_em asc`);
  return rows.map((r) => ({ id: r.id, titulo: r.titulo, conteudo: r.conteudo, criadoEm: r.criado_em }));
}

/**
 * Chamada crua à Claude API (sem SDK — mesmo estilo do resto do projeto,
 * ver src/lib/sala-zoom.ts e src/lib/email.ts), partilhada entre gerar
 * respostas a objeções e decidir se uma entrada nova pertence a um tema já
 * existente. Devolve sempre o texto — quem chama é que interpreta (texto
 * livre ou JSON, conforme o que pediu no `system`).
 */
async function chamarClaude(system: string, mensagem: string): Promise<string> {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    throw new Error("variável de ambiente em falta: ANTHROPIC_API_KEY");
  }

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: mensagem }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`Claude API devolveu ${resposta.status}: ${texto}`);
  }

  const corpo = JSON.parse(texto) as { content: { type: string; text?: string }[] };
  return corpo.content.find((c) => c.type === "text")?.text ?? "";
}

/**
 * Decide se a entrada nova é sobre o mesmo tema/objeção que alguma das já
 * existentes (mesmo com um título escrito de forma diferente — "dinheiro"
 * e "preço" podem ser a mesma objeção) — devolve o título exato de uma
 * existente para juntar lá o conteúdo novo, ou null para criar tema novo.
 * Sem entradas existentes, nem vale a pena perguntar.
 */
async function encontrarTemaExistente(
  existentes: ConhecimentoObjecao[],
  titulo: string,
  conteudo: string,
): Promise<string | null> {
  if (existentes.length === 0) return null;

  const texto = await chamarClaude(
    `Tens uma lista de temas/objeções já guardados sobre vendas de viagens. Recebes um título e ` +
      `conteúdo novos, e decides se são sobre o MESMO tema que um dos já existentes — mesmo que o ` +
      `título esteja escrito de forma diferente (ex: "dinheiro" e "preço" podem ser o mesmo tema). ` +
      `Responde SÓ com JSON, sem mais nenhum texto à volta:\n` +
      `{"temaExistente": "<título exato de um dos já existentes>"} se corresponder a um já existente, ou\n` +
      `{"temaExistente": null} se for um tema novo, diferente de todos os já existentes.\n\n` +
      `Temas já existentes: ${existentes.map((e) => `"${e.titulo}"`).join(", ")}`,
    `Título novo: ${titulo}\nConteúdo novo: ${conteudo}`,
  );

  try {
    const dados = JSON.parse(texto) as { temaExistente: string | null };
    if (!dados.temaExistente) return null;
    // Confirma que é mesmo um dos títulos existentes (o modelo às vezes
    // parafraseia) — só junta se bater certo, senão cria tema novo.
    const encontrado = existentes.find(
      (e) => e.titulo.trim().toLowerCase() === dados.temaExistente!.trim().toLowerCase(),
    );
    return encontrado?.titulo ?? null;
  } catch {
    return null;
  }
}

export interface ResultadoAdicionarConhecimento {
  /** Título do tema onde ficou gravado — o que a pessoa escreveu, ou o de um tema já existente. */
  titulo: string;
  /** true = juntou a um tema já existente; false = criou tema novo. */
  juntou: boolean;
}

/**
 * Junta a uma entrada já existente sobre o mesmo tema (decidido pela Claude
 * API), ou cria um tema novo se não houver correspondência — para o
 * conhecimento se ir acumulando por tema em vez de espalhar por várias
 * entradas com títulos repetidos ou parecidos.
 */
export async function adicionarConhecimentoObjecao(
  titulo: string,
  conteudo: string,
): Promise<ResultadoAdicionarConhecimento> {
  const existentes = await listarConhecimentoObjecoes();
  const temaExistente = await encontrarTemaExistente(existentes, titulo, conteudo);

  if (temaExistente) {
    await db().query(
      `update conhecimento_objecoes
       set conteudo = conteudo || E'\n\n---\n\n' || $2
       where titulo = $1`,
      [temaExistente, conteudo],
    );
    return { titulo: temaExistente, juntou: true };
  }

  await db().query(`insert into conhecimento_objecoes (titulo, conteudo) values ($1, $2)`, [
    titulo,
    conteudo,
  ]);
  return { titulo, juntou: false };
}

export async function apagarConhecimentoObjecao(id: string): Promise<void> {
  await db().query(`delete from conhecimento_objecoes where id = $1`, [id]);
}

/**
 * Gera 2-3 hipóteses de resposta a uma objeção de lead. Baseia-se só no
 * conhecimento guardado em conhecimento_objecoes (ver
 * admin/objecoes/conhecimento) — sem nenhuma entrada, o modelo é avisado
 * disso e responde com cautela em vez de inventar políticas/preços.
 */
export async function gerarRespostasObjecao(objecao: string): Promise<string[]> {
  const conhecimento = await listarConhecimentoObjecoes();
  const blocoConhecimento =
    conhecimento.length === 0
      ? "(ainda não há nenhuma diretriz guardada — responde com cautela genérica, sem inventar preços, políticas ou promessas específicas da empresa)"
      : conhecimento.map((c) => `## ${c.titulo}\n${c.conteudo}`).join("\n\n");

  const textoResposta = await chamarClaude(
    `És um assistente de vendas para consultores de viagens da Viajar é Viver. A tua função é ` +
      `ajudar consultores a responder a objeções de leads durante o processo de venda.\n\n` +
      `Usa só o conhecimento abaixo, fornecido pela equipa — não inventes preços, políticas ou ` +
      `promessas que não estejam aqui:\n\n${blocoConhecimento}\n\n` +
      `Quando o consultor descrever uma objeção, responde SÓ com um JSON neste formato exato, ` +
      `sem mais nenhum texto à volta:\n` +
      `{"respostas": ["primeira hipótese de resposta", "segunda hipótese", "terceira hipótese (opcional)"]}\n` +
      `Cada resposta deve ser um texto curto, natural, em português de Portugal, que o consultor ` +
      `possa usar diretamente na conversa com a lead — 2 a 3 hipóteses, nunca mais do que 3.`,
    objecao,
  );

  try {
    const dados = JSON.parse(textoResposta) as { respostas: string[] };
    if (Array.isArray(dados.respostas) && dados.respostas.length > 0) {
      return dados.respostas;
    }
  } catch {
    // segue para o fallback abaixo
  }
  // Se o modelo não devolveu JSON válido (raro, mas acontece), mostra o
  // texto cru como única hipótese em vez de rebentar a página.
  return [textoResposta];
}
