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
    `Tens uma lista de temas/objeções já guardados sobre dúvidas de quem assistiu ao webinar e está ` +
      `indeciso quanto a começar o negócio de consultor(a) de viagens. Recebes um título e conteúdo ` +
      `novos, e decides se são sobre o MESMO tema que um dos já existentes — mesmo que o título esteja ` +
      `escrito de forma diferente (ex: "dinheiro" e "investimento inicial" podem ser o mesmo tema). ` +
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
 * Guarda a última objeção descrita (e as respostas geradas) para uma lead —
 * para reaparecer na tabela de leads quando o consultor voltar, ver
 * migrations/030_objecoes_lead.sql. Mesma regra de posse que
 * `definirEstadoLead` em src/lib/leads.ts: só quem trouxe a lead pode
 * guardar. Uma falha aqui não deve impedir mostrar as respostas geradas —
 * quem chama trata isso como best-effort.
 */
export async function guardarObjecaoLead(
  leadEmail: string,
  objecao: string,
  respostas: string[],
  consultorEmail: string,
): Promise<void> {
  const { rows } = await db().query<{ existe: boolean }>(
    `select exists(
       select 1 from registrations
       where email = $1 and referencia_email = $2 and cancelada_em is null
     ) as existe`,
    [leadEmail, consultorEmail],
  );
  if (!rows[0]?.existe) {
    throw new Error("não podes guardar a objeção de uma lead que não trouxeste");
  }

  await db().query(
    `insert into objecoes_lead (lead_email, objecao, respostas, atualizado_em)
     values ($1, $2, $3, now())
     on conflict (lead_email) do update
       set objecao = excluded.objecao, respostas = excluded.respostas, atualizado_em = now()`,
    [leadEmail, objecao, JSON.stringify(respostas)],
  );
}

/**
 * Importação feita aqui dentro (não no topo do ficheiro) de propósito — só
 * é usada quando alguém anexa mesmo um PDF; carregá-la sempre que este
 * ficheiro é importado arriscava levar a página de listagem de conhecimento
 * (que nem PDFs precisa de ler) a abaixo se algo corresse mal a carregá-la.
 *
 * Nota: usa `unpdf` (não `pdf-parse`) de propósito — testadas as duas: a
 * `pdf-parse` 2.x depende de um binário nativo que não carrega no ambiente
 * da Vercel ("DOMMatrix is not defined"), e a 1.x (JavaScript puro) falha a
 * ler PDFs normais gerados por ferramentas atuais ("bad XRef entry" — usa
 * uma versão do pdf.js demasiado antiga). A `unpdf` é feita mesmo para
 * ambientes serverless, sem binários nativos, e lê tudo isto sem problemas.
 */
async function extrairTextoPdf(bytes: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const documento = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(documento, { mergePages: true });
  return text;
}

/** Linha única (id=1) — ver migrations/028_objecoes_diretrizes_gerais.sql. */
export async function obterDiretrizesGeraisObjecoes(): Promise<string> {
  const { rows } = await db().query<{ conteudo: string }>(
    `select conteudo from objecoes_diretrizes_gerais where id = 1`,
  );
  return rows[0]?.conteudo ?? "";
}

export async function guardarDiretrizesGeraisObjecoes(conteudo: string): Promise<void> {
  await db().query(
    `insert into objecoes_diretrizes_gerais (id, conteudo) values (1, $1)
     on conflict (id) do update set conteudo = excluded.conteudo`,
    [conteudo],
  );
}

export interface PdfDiretrizesGerais {
  id: string;
  nome: string;
  criadoEm: Date;
}

/** Sem o texto/bytes — só o essencial para listar em admin/objecoes/conhecimento. */
export async function listarPdfsDiretrizesGerais(): Promise<PdfDiretrizesGerais[]> {
  const { rows } = await db().query<{ id: string; nome: string; criado_em: Date }>(
    `select id, nome, criado_em from objecoes_diretrizes_pdfs order by criado_em asc`,
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome, criadoEm: r.criado_em }));
}

/**
 * Ao contrário do conhecimento por tema, um PDF anexado aqui entra sempre em
 * TODAS as respostas, tal como as diretrizes gerais escritas à mão — por
 * isso não passa pela lógica de "juntar a um tema existente", cada PDF fica
 * na sua própria linha, sempre incluído.
 */
export async function adicionarPdfDiretrizesGerais(nome: string, bytes: Buffer): Promise<void> {
  const texto = (await extrairTextoPdf(bytes)).trim();
  if (!texto) {
    throw new Error("não foi possível ler texto deste PDF — pode ser só imagens ou estar protegido");
  }
  await db().query(`insert into objecoes_diretrizes_pdfs (nome, texto, bytes) values ($1, $2, $3)`, [
    nome,
    texto,
    bytes,
  ]);
}

export async function apagarPdfDiretrizesGerais(id: string): Promise<void> {
  await db().query(`delete from objecoes_diretrizes_pdfs where id = $1`, [id]);
}

export async function buscarPdfDiretrizesGerais(
  id: string,
): Promise<{ bytes: Buffer; nome: string } | undefined> {
  const { rows } = await db().query<{ bytes: Buffer; nome: string }>(
    `select bytes, nome from objecoes_diretrizes_pdfs where id = $1`,
    [id],
  );
  return rows[0];
}

async function listarTextosPdfsDiretrizesGerais(): Promise<{ nome: string; texto: string }[]> {
  const { rows } = await db().query<{ nome: string; texto: string }>(
    `select nome, texto from objecoes_diretrizes_pdfs`,
  );
  return rows;
}

/**
 * Gera 2-3 hipóteses de resposta a uma objeção. Baseia-se só no conhecimento
 * guardado em conhecimento_objecoes (ver admin/objecoes/conhecimento) — sem
 * nenhuma entrada, o modelo é avisado disso e responde com cautela em vez de
 * inventar políticas/valores.
 *
 * Contexto: não são objeções de venda de viagens a clientes — são as dúvidas
 * de uma LEAD que já assistiu ao webinar da equipa e está indecisa quanto a
 * começar o negócio como consultor(a) (ex: falta de dinheiro, falta de
 * tempo, medo de não conseguir vender). Quem usa isto é o consultor que fez
 * a apresentação, a tentar ajudar essa pessoa a avançar.
 */
export async function gerarRespostasObjecao(objecao: string): Promise<string[]> {
  const [diretrizesGerais, pdfsDiretrizesGerais, conhecimento] = await Promise.all([
    obterDiretrizesGeraisObjecoes(),
    listarTextosPdfsDiretrizesGerais(),
    listarConhecimentoObjecoes(),
  ]);
  const partesDiretrizesGerais = [
    diretrizesGerais.trim(),
    ...pdfsDiretrizesGerais.map((p) => `## ${p.nome}\n${p.texto}`),
  ].filter((p) => p !== "");
  const blocoDiretrizesGerais =
    partesDiretrizesGerais.length > 0
      ? `Diretrizes gerais a seguir em TODAS as respostas, sejam quais forem os temas abaixo:\n${partesDiretrizesGerais.join("\n\n")}\n\n`
      : "";
  const blocoConhecimento =
    conhecimento.length === 0
      ? "(ainda não há nenhuma diretriz por tema guardada — responde com cautela genérica, sem inventar valores, políticas ou promessas específicas da empresa)"
      : conhecimento.map((c) => `## ${c.titulo}\n${c.conteudo}`).join("\n\n");

  const textoResposta = await chamarClaude(
    `És um assistente para consultores de viagens da Viajar é Viver. A tua função é ajudar consultores ` +
      `a responder às dúvidas e hesitações de leads que já assistiram ao webinar da empresa e estão ` +
      `indecisas quanto a começar o negócio como consultor(a) de viagens (ex: "não tenho dinheiro para ` +
      `investir agora", "não tenho tempo", "não sei se consigo vender", "tenho medo de não dar certo") — ` +
      `não são objeções de venda de pacotes de viagem a clientes, são dúvidas sobre entrar no negócio.\n\n` +
      `${blocoDiretrizesGerais}` +
      `Usa só o conhecimento abaixo, fornecido pela equipa — não inventes valores, políticas ou ` +
      `promessas que não estejam aqui:\n\n${blocoConhecimento}\n\n` +
      `Quando o consultor descrever a dúvida da lead, responde SÓ com um JSON neste formato exato, ` +
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
