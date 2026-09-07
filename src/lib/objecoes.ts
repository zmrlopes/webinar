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

export async function adicionarConhecimentoObjecao(titulo: string, conteudo: string): Promise<void> {
  await db().query(`insert into conhecimento_objecoes (titulo, conteudo) values ($1, $2)`, [
    titulo,
    conteudo,
  ]);
}

export async function apagarConhecimentoObjecao(id: string): Promise<void> {
  await db().query(`delete from conhecimento_objecoes where id = $1`, [id]);
}

/**
 * Gera 2-3 hipóteses de resposta a uma objeção de lead, usando a Claude API
 * diretamente (fetch cru, sem SDK — mesmo estilo do resto do projeto, ver
 * src/lib/sala-zoom.ts e src/lib/email.ts). Baseia-se só no conhecimento
 * guardado em conhecimento_objecoes (ver admin/objecoes/conhecimento) — sem
 * nenhuma entrada, o modelo é avisado disso e responde com cautela em vez
 * de inventar políticas/preços.
 */
export async function gerarRespostasObjecao(objecao: string): Promise<string[]> {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    throw new Error("variável de ambiente em falta: ANTHROPIC_API_KEY");
  }

  const conhecimento = await listarConhecimentoObjecoes();
  const blocoConhecimento =
    conhecimento.length === 0
      ? "(ainda não há nenhuma diretriz guardada — responde com cautela genérica, sem inventar preços, políticas ou promessas específicas da empresa)"
      : conhecimento.map((c) => `## ${c.titulo}\n${c.conteudo}`).join("\n\n");

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
      system:
        `És um assistente de vendas para consultores de viagens da Viajar é Viver. A tua função é ` +
        `ajudar consultores a responder a objeções de leads durante o processo de venda.\n\n` +
        `Usa só o conhecimento abaixo, fornecido pela equipa — não inventes preços, políticas ou ` +
        `promessas que não estejam aqui:\n\n${blocoConhecimento}\n\n` +
        `Quando o consultor descrever uma objeção, responde SÓ com um JSON neste formato exato, ` +
        `sem mais nenhum texto à volta:\n` +
        `{"respostas": ["primeira hipótese de resposta", "segunda hipótese", "terceira hipótese (opcional)"]}\n` +
        `Cada resposta deve ser um texto curto, natural, em português de Portugal, que o consultor ` +
        `possa usar diretamente na conversa com a lead — 2 a 3 hipóteses, nunca mais do que 3.`,
      messages: [{ role: "user", content: objecao }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`Claude API devolveu ${resposta.status}: ${texto}`);
  }

  const corpo = JSON.parse(texto) as { content: { type: string; text?: string }[] };
  const textoResposta = corpo.content.find((c) => c.type === "text")?.text ?? "";

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
